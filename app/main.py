import shutil
import os
import json
import logging
from collections import deque
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from app.rag import rag_manager, DATA_DIR

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("university-policy-backend")


class Settings(BaseSettings):
    API_KEY: str = "default_key_change_me"
    CORS_ORIGINS: str = "*"  # Override in production: set to your Vercel frontend URL
    OPENAI_API_KEY: str = ""

    # Optional: set HISTORY_FILE to a path (e.g. /mnt/data/history.json) on hosts
    # with persistent storage. Leave unset to use in-memory history only.
    HISTORY_FILE: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# Warn about insecure defaults at startup
if settings.API_KEY == "default_key_change_me":
    logger.warning(
        "API_KEY is still set to the default placeholder. "
        "Set a strong secret key via the API_KEY environment variable before going to production."
    )

if not settings.OPENAI_API_KEY:
    logger.warning(
        "OPENAI_API_KEY is not configured. The RAG system will not function. "
        "Set it in your hosting platform's environment variables."
    )

app = FastAPI(
    title="RAG Backend for University Policies",
    description="Intelligent Q&A system for university policy documents.",
    version="1.0.0"
)

# Parse CORS origins — supports comma-separated list or wildcard "*"
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        logger.warning(f"Unauthorized access attempt with API key: {api_key!r}")
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key


# ---------------------------------------------------------------
# History — In-memory with optional file persistence.
#
# On ephemeral/serverless hosts (Vercel, Railway without disk),
# history is stored in memory and resets on each restart.
#
# On hosts with persistent storage (Railway with disk, Render),
# set HISTORY_FILE=/mnt/your-disk/history.json to persist across restarts.
# ---------------------------------------------------------------
_history: deque = deque(maxlen=50)  # Holds last 50 queries in memory


def _load_history_from_file():
    """Load history from file into the in-memory deque on startup (if configured)."""
    if not settings.HISTORY_FILE:
        return
    try:
        if os.path.exists(settings.HISTORY_FILE):
            with open(settings.HISTORY_FILE, "r") as f:
                data = json.load(f)
                for item in data[-50:]:
                    _history.append(item)
            logger.info(f"Loaded {len(_history)} history entries from {settings.HISTORY_FILE}")
    except Exception as e:
        logger.warning(f"Could not load history file: {e}. Starting with empty history.")


def _save_history_to_file():
    """Persist in-memory history to file (only when HISTORY_FILE is configured)."""
    if not settings.HISTORY_FILE:
        return
    try:
        os.makedirs(os.path.dirname(settings.HISTORY_FILE) or ".", exist_ok=True)
        with open(settings.HISTORY_FILE, "w") as f:
            json.dump(list(_history), f)
    except Exception as e:
        logger.warning(f"Could not save history file: {e}")


def save_to_history(query: str, response: str):
    """Add a query/response pair to history."""
    _history.append({"query": query, "response": response})
    _save_history_to_file()


# Load any persisted history on startup
_load_history_from_file()


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    response: str
    sources: list


@app.get("/health")
async def health_check():
    """Health probe endpoint — used by the frontend to detect backend availability."""
    rag_ready = rag_manager.query_engine is not None
    return {
        "status": "healthy",
        "rag_ready": rag_ready,
        "message": "RAG system ready." if rag_ready else "No documents indexed yet."
    }


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file to the data directory and refresh the index."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_path = os.path.join(DATA_DIR, file.filename)
    is_update = os.path.exists(file_path)

    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Refresh the index after upload (handles incremental updates in rag.py)
        rag_manager.refresh_index()

        status = "updated" if is_update else "uploaded"
        return {"message": f"Successfully {status} {file.filename} and synchronized index."}
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@app.post("/query", response_model=QueryResponse)
async def query_index(request: QueryRequest, api_key: str = Depends(verify_api_key)):
    """Query the RAG index and return a response with sources."""
    try:
        logger.info(f"Processing query: {request.query!r}")
        result = rag_manager.query(request.query)
        save_to_history(request.query, result["response"])
        return result
    except Exception as e:
        logger.error(f"Query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.delete("/policies/{filename}")
async def delete_policy(filename: str, api_key: str = Depends(verify_api_key)):
    """Delete a specific policy document."""
    try:
        rag_manager.delete_document(filename)
        return {"message": f"Successfully deleted {filename}."}
    except Exception as e:
        logger.error(f"Delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@app.get("/history")
async def get_history(api_key: str = Depends(verify_api_key)):
    """Retrieve query history (in-memory, resets on server restart unless HISTORY_FILE is set)."""
    return list(_history)


@app.get("/policies")
async def list_policies():
    """List all uploaded PDF files in the data directory."""
    try:
        if not os.path.exists(DATA_DIR):
            return []
        files = [f for f in os.listdir(DATA_DIR) if f.endswith(".pdf")]
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list policies: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

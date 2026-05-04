import shutil
import os
import json
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from app.rag import rag_manager, DATA_DIR

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("university-policy-backend")

class Settings(BaseSettings):
    API_KEY: str = "default_key_change_me"
    CORS_ORIGINS: str = "http://localhost:5173"
    OPENAI_API_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()

app = FastAPI(title="RAG Backend for University Policies")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        logger.warning(f"Unauthorized access attempt with API key: {api_key}")
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

# History Persistence
HISTORY_FILE = "history.json"

def save_to_history(query: str, response: str):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)
        except:
            history = []
    history.append({"query": query, "response": response})
    # Keep only last 50 queries
    history = history[-50:]
    with open(HISTORY_FILE, "w") as f:
        json.dump(history, f)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    response: str
    sources: list

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file to the data directory and refresh the index."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    file_path = os.path.join(DATA_DIR, file.filename)
    is_update = os.path.exists(file_path)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Refresh the index after upload (handles incremental updates in rag.py)
        rag_manager.refresh_index()
        
        status = "updated" if is_update else "uploaded"
        return {"message": f"Successfully {status} {file.filename} and synchronized index."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.post("/query", response_model=QueryResponse)
async def query_index(request: QueryRequest, api_key: str = Depends(verify_api_key)):
    """Query the RAG index and return a response with sources."""
    try:
        logger.info(f"Processing query: {request.query}")
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
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@app.get("/history")
async def get_history(api_key: str = Depends(verify_api_key)):
    """Retrieve query history."""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return []

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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

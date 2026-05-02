# 🛠️ Nile University Policy AI - Technical Documentation

This repository contains the **Intelligent Question Answering System** for university policy documents. The system follows a **Retrieval-Augmented Generation (RAG)** architecture.

## 🏗️ System Architecture
The system consists of three primary layers:
1.  **Presentation (Frontend)**: Built with **React 19**, **Vite**, and **Tailwind CSS v4**. It uses **Lucide React** for iconography and **Axios** for API communication.
2.  **Application (Backend)**: A **FastAPI** server that orchestrates the RAG pipeline.
3.  **Intelligence (AI & Data)**: 
    *   **LlamaIndex**: Framework for document indexing and retrieval.
    *   **OpenAI GPT-3.5**: Large Language Model for embedding generation and inference.
    *   **ChromaDB**: High-performance vector database for local storage of semantic embeddings.

---

## 📦 Tech Stack
- **Backend**: Python 3.9+, FastAPI, LlamaIndex, ChromaDB, Uvicorn.
- **Frontend**: Node.js, React, Vite, Tailwind CSS 4, Lucide.
- **AI**: OpenAI API (Embeddings & LLM).

---

## 🔧 Installation & Setup

### 1. Prerequisites
- Python 3.9 or higher
- Node.js 18 or higher
- OpenAI API Key

### 2. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (.env)
OPENAI_API_KEY=your_key_here
API_KEY=optional_secret_for_security
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

---

## 🏃 Running the System

### Start the Backend
```bash
# From the root directory
./.venv/bin/python3 -m uvicorn app.main:app --reload
```
*Server runs at `http://localhost:8000`*

### Start the Frontend
```bash
# From the frontend directory
npm run dev
```
*App runs at `http://localhost:5173`*

---

## 🛠️ Maintenance & Scaling
- **Indexing**: Documents are stored in the `/data` directory. The system uses incremental indexing; adding a new file and calling the `/upload` endpoint will sync the vector store without a full rebuild.
- **Storage**: The vector index is persisted in `/chroma_db`. Do not delete this folder unless you want to re-index all documents.
- **History**: Query history is saved in `history.json` for auditing and performance evaluation.

---

## 🔒 Security
The backend is protected via an **X-API-Key** header. Ensure the `API_KEY` in your `.env` matches the expected key on the client side.

---

## ⚖️ Requirements Compliance
This system is strictly aligned with the **Obiora Documentation** standards, ensuring:
- **No Hallucinations**: Prompt engineering restricts the LLM to provided context only.
- **Incremental Updates**: Support for document versioning and modifications.
- **High Performance**: Vectorized search provides sub-second document retrieval.

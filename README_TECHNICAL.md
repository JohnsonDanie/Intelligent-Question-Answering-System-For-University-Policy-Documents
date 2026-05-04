# Technical Overview: Intelligent University Policy Q&A System

This document provides a technical breakdown of the system architecture, the RAG (Retrieval-Augmented Generation) pipeline, and the implementation details of both the frontend and backend.

## 🏗️ System Architecture

The application follows a decoupled client-server architecture:

- **Frontend**: A React-based Single Page Application (SPA) built with Vite and Tailwind CSS.
- **Backend**: A FastAPI server that orchestrates document processing and AI interactions.
- **AI Core**: Powered by LlamaIndex, utilizing OpenAI's GPT-3.5 and embedding models.
- **Database**: ChromaDB for persistent vector storage.

---

## 🧠 Backend & RAG Pipeline

The backend handles the complexity of processing PDF documents and generating context-aware answers.

### 1. Document Processing (`app/rag.py`)
- **Ingestion**: Documents are read from the `./data` directory using LlamaIndex's `SimpleDirectoryReader`.
- **Indexing**:
    - **VectorStoreIndex**: Converts text chunks into vector embeddings for semantic search.
    - **SummaryIndex**: Creates a summary structure for high-level queries.
- **Persistence**: The vector store is persisted in the `./chroma_db` directory, allowing the system to skip re-indexing on startup.

### 2. Query Routing
The system employs a `RouterQueryEngine`. For every user query, it intelligently decides whether to perform a **Vector Search** (for specific facts) or a **Summary Search** (for general overviews).

### 3. Response Generation & Safety
- **Strict Context**: The system is instructed via a system prompt to answer *only* using the provided context.
- **Citations**: Responses include source nodes, allowing the frontend to display exactly which file and page the information came from.
- **Fallback**: If no relevant information is found, it directs the user to the Registrar rather than hallucinating.

---

## 🎨 Frontend Implementation

The frontend provides an intuitive interface for students and administrators.

### 1. Key Components
- **`App.jsx`**: Manages the global state, including message history and policy lists.
- **`ChatInterface.jsx`**: A modern chat UI with smooth animations, source citations, and typing indicators.
- **`Sidebar.jsx`**: Handles document management (uploading/deleting PDFs).
- **`SourceDropdown.jsx`**: Renders the metadata and content snippets of the source documents used by the AI.

### 2. Features
- **Incremental Updates**: Uploading a new PDF triggers a background re-index, making it immediately available for queries.
- **Query History**: Previous conversations are persisted and loaded on refresh.
- **System Health Monitoring**: Visual indicators show if the backend API is active or unreachable.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI |
| **RAG Orchestrator** | LlamaIndex |
| **LLM / Embeddings** | OpenAI (GPT-3.5-Turbo) |
| **Vector Database** | ChromaDB |
| **Frontend Library** | React (Vite) |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **Data Fetching** | Axios |

---

## 📁 Project Structure

- `app/`: FastAPI backend and RAG logic.
- `frontend/`: React application source code.
- `data/`: Storage for uploaded PDF policy documents.
- `chroma_db/`: Persistent vector database storage.
- `history.json`: Local storage for query history.
import os
from typing import List, Dict, Any
import chromadb
from llama_index.core import (
    VectorStoreIndex,
    SummaryIndex,
    SimpleDirectoryReader,
    StorageContext,
    Settings,
    PromptTemplate
)
from llama_index.core.tools import QueryEngineTool, ToolMetadata
from llama_index.core.query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configuration
DATA_DIR = "./data"
CHROMA_DB_PATH = "./chroma_db"

# Initialize Settings
Settings.llm = OpenAI(model="gpt-3.5-turbo")
Settings.embed_model = OpenAIEmbedding()

# --- System Prompt Definition ---
SYSTEM_PROMPT = (
    "You are the Intelligent University Policy Assistant. Use the provided context to answer questions strictly based on official university policy. "
    "If the information required to answer the question is not present in the provided context, you must respond exactly with: "
    "'I'm sorry, I cannot find that in the official policy. Please contact the Registrar.' "
    "Do not provide advice, opinions, or information outside of the provided policy documents. Maintain a formal, professional tone."
)

QA_PROMPT_TMPL = (
    "Context information is below.\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    "Given the context information and not prior knowledge, answer the query.\n"
    "Query: {query_str}\n"
    "Answer: "
)

# Apply system prompt to the global settings
Settings.system_prompt = SYSTEM_PROMPT

class RAGManager:
    def __init__(self):
        self.db = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        self.chroma_collection = self.db.get_or_create_collection("university_policies")
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        self.vector_index = None
        self.summary_index = None
        self.query_engine = None
        self._initialize_index()

    def _initialize_index(self):
        """Load documents and initialize Vector and Summary indices with a Router."""
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        
        documents = SimpleDirectoryReader(DATA_DIR).load_data()
        
        if not documents:
            self.query_engine = None
            return

        # Initialize or Refresh Indices
        self.vector_index = VectorStoreIndex.from_documents(
            documents, 
            storage_context=self.storage_context
        )
        # Note: SummaryIndex doesn't support persistent vector stores in the same way,
        # but we can rebuild it from the same documents.
        self.summary_index = SummaryIndex.from_documents(
            documents
        )

        self._setup_query_engine()

    def _setup_query_engine(self):
        """Configure the Router Query Engine with tools."""
        if not self.vector_index or not self.summary_index:
            return

        # Define Custom Prompt Templates
        qa_prompt = PromptTemplate(QA_PROMPT_TMPL)

        # Define Tools for Router
        vector_tool = QueryEngineTool(
            query_engine=self.vector_index.as_query_engine(
                text_qa_template=qa_prompt
            ),
            metadata=ToolMetadata(
                name="vector_search",
                description="Useful for retrieving specific facts or details from the policy documents."
            )
        )
        summary_tool = QueryEngineTool(
            query_engine=self.summary_index.as_query_engine(
                response_mode="tree_summarize",
                text_qa_template=qa_prompt
            ),
            metadata=ToolMetadata(
                name="summary_search",
                description="Useful for broad questions, overviews, or summaries of the policy documents."
            )
        )

        # Initialize Router Query Engine
        self.query_engine = RouterQueryEngine(
            selector=LLMSingleSelector.from_defaults(),
            query_engine_tools=[vector_tool, summary_tool],
        )

    def refresh_index(self):
        """Incrementally refresh the index after new uploads or updates."""
        if not os.path.exists(DATA_DIR):
            return
            
        documents = SimpleDirectoryReader(DATA_DIR).load_data()
        if not documents:
            return

        if self.vector_index:
            # refresh_ref_docs handles additions and updates based on doc_id (hash)
            self.vector_index.refresh_ref_docs(documents)
            # Rebuild summary index as it's memory-based in this implementation
            self.summary_index = SummaryIndex.from_documents(documents)
            self._setup_query_engine()
        else:
            self._initialize_index()

    def delete_document(self, file_name: str):
        """Delete a document from the data directory and the vector store."""
        file_path = os.path.join(DATA_DIR, file_name)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete from ChromaDB by metadata filter
        self.chroma_collection.delete(where={"file_name": file_name})
        
        # Refresh the index to rebuild the query engine
        self.refresh_index()

    def query(self, query_str: str) -> Dict[str, Any]:
        """Query the index and return response with enhanced citations."""
        if not self.query_engine:
            return {"response": "No documents indexed yet.", "sources": []}

        response = self.query_engine.query(query_str)
        
        sources = []
        for node in response.source_nodes:
            metadata = node.node.metadata
            sources.append({
                "content": node.node.get_content()[:200] + "...",
                "file_name": metadata.get("file_name", "Unknown"),
                "page_number": metadata.get("page_label", "Unknown"),
                "score": getattr(node, "score", None)
            })

        return {
            "response": str(response),
            "sources": sources
        }

rag_manager = RAGManager()

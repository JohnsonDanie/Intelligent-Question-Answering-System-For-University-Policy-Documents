import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

// ---------------------------------------------------------------------------
// API Configuration
//
// VITE_API_BASE_URL must be set as an environment variable in your Vercel
// project settings (Settings → Environment Variables) pointing to your
// deployed FastAPI backend (e.g. https://your-backend.railway.app).
//
// VITE_API_KEY must match the API_KEY environment variable on the backend.
//
// DO NOT commit your .env file. Set these in the Vercel dashboard.
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const isMisconfigured = !API_BASE_URL || API_BASE_URL.includes('localhost');

// Configure axios defaults
if (API_KEY) {
  axios.defaults.headers.common['X-API-Key'] = API_KEY;
}

function App() {
  const [policies, setPolicies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(null); // null = checking

  // Fetch policies and history on mount
  useEffect(() => {
    if (isMisconfigured) return; // Don't attempt API calls if URL is not set
    checkHealth();
    fetchPolicies();
    fetchHistory();
  }, []);

  const checkHealth = async () => {
    try {
      await axios.get(`${API_BASE_URL}/health`);
      setBackendHealthy(true);
    } catch (error) {
      setBackendHealthy(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/policies`);
      setPolicies(response.data);
    } catch (error) {
      console.error("Error fetching policies:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history`);
      const formattedHistory = response.data.flatMap(item => [
        { type: 'user', content: item.query },
        { type: 'bot', content: item.response }
      ]);
      setMessages(formattedHistory);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await axios.post(`${API_BASE_URL}/upload`, formData);
      await fetchPolicies();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload policy. Check if the backend is running and reachable.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePolicy = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/policies/${filename}`);
      await fetchPolicies();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage = { type: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/query`, { query });
      const botMessage = {
        type: 'bot',
        content: response.data.response,
        sources: response.data.sources
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Query failed:", error);
      const errorMessage = {
        type: 'bot',
        content: "Sorry, I encountered an error while searching the policies. Please ensure the backend is running and reachable."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Show a clear error screen if the frontend is not properly configured.
  // This prevents a confusing blank screen or silent localhost failures on Vercel.
  if (isMisconfigured) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans">
        <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          <div className="bg-red-500 px-8 py-6">
            <h1 className="text-white font-bold text-xl">⚙️ Configuration Required</h1>
            <p className="text-red-100 text-sm mt-1">The application is not connected to a backend.</p>
          </div>
          <div className="px-8 py-6 space-y-4">
            <p className="text-slate-700 text-sm leading-relaxed">
              The <code className="bg-slate-100 px-1 rounded text-red-600 font-mono text-xs">VITE_API_BASE_URL</code> environment
              variable is missing or still points to <code className="bg-slate-100 px-1 rounded text-red-600 font-mono text-xs">localhost</code>.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs font-mono space-y-1 text-slate-600">
              <p className="text-slate-400 font-sans font-semibold text-[10px] uppercase tracking-wider mb-2">Vercel → Settings → Environment Variables</p>
              <p><span className="text-blue-600">VITE_API_BASE_URL</span> = https://your-backend.railway.app</p>
              <p><span className="text-blue-600">VITE_API_KEY</span> = your_secure_api_key</p>
            </div>
            <p className="text-slate-500 text-xs">
              Deploy the FastAPI backend to Railway, Render, or Fly.io first, then set these values in Vercel and redeploy.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans antialiased text-slate-900">
      <Sidebar
        policies={policies}
        onUpload={handleUpload}
        onDelete={handleDeletePolicy}
        isUploading={isUploading}
      />
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {/* Backend offline banner */}
        {backendHealthy === false && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-bold">Backend System Offline</span>
          </div>
        )}
        <ChatInterface
          messages={messages}
          query={query}
          setQuery={setQuery}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;

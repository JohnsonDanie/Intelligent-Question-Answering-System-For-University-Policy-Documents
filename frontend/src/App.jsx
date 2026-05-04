import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [policies, setPolicies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);

  // Fetch policies and history on mount
  useEffect(() => {
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
      alert("Failed to upload policy. Check if the backend is running.");
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
        content: "Sorry, I encountered an error while searching the policies. Please ensure the backend is running and the document is indexed."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans antialiased text-slate-900">
      <Sidebar
        policies={policies}
        onUpload={handleUpload}
        onDelete={handleDeletePolicy}
        isUploading={isUploading}
      />
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {!backendHealthy && (
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

import React from 'react';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';

const Sidebar = ({ policies, onUpload, onDelete, isUploading }) => {
    return (
        <div className="w-64 bg-university-blue text-white h-full flex flex-col shadow-xl">
            <div className="p-6 border-b border-white/10">
                <h1 className="text-xl font-bold tracking-tight">University Policy AI</h1>
                <p className="text-xs text-blue-200 mt-1">Intelligent Question Answering System</p>
            </div>

            <div className="p-4">
                <label className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-lg p-3 cursor-pointer group">
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium text-sm">Upload Policy (PDF)</span>
                    <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={onUpload}
                        disabled={isUploading}
                    />
                </label>
                {isUploading && (
                    <div className="mt-2 text-center text-xs text-blue-200 animate-pulse">
                        Uploading and indexing...
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <h2 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-4 px-2">
                    Uploaded Policies
                </h2>
                <div className="space-y-1">
                    {policies.length > 0 ? (
                        policies.map((policy, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-3 text-sm rounded-lg hover:bg-white/5 transition-colors cursor-default group"
                            >
                                <FileText className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                                <span className="truncate opacity-80 group-hover:opacity-100 transition-opacity">
                                    {policy}
                                </span>
                                <button
                                    onClick={() => onDelete(policy)}
                                    className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-200 transition-all p-1 hover:bg-red-500/10 rounded"
                                    title="Delete Policy"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-sm text-blue-300/50 italic border-2 border-dashed border-white/10 rounded-xl">
                            No policies yet
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-university-darkBlue/50 text-xs text-blue-300/60 font-medium">
                &copy; 2026 University RAG System
            </div>
        </div>
    );
};

export default Sidebar;

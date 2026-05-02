import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, MapPin } from 'lucide-react';

const SourceDropdown = ({ sources }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-university-blue bg-university-light-blue/30 hover:bg-university-light-blue/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Sources ({sources.length})</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isOpen && (
                <div className="p-3 space-y-3 bg-slate-50 divide-y divide-slate-200">
                    {sources.map((source, idx) => (
                        <div key={idx} className={`${idx > 0 ? 'pt-3' : ''}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="px-2 py-0.5 bg-university-blue text-white rounded text-[10px] font-bold flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5" />
                                    P. {source.page_number}
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter truncate max-w-[150px]">
                                    {source.file_name}
                                </span>
                                {source.score && (
                                    <span className="text-[10px] text-slate-400 ml-auto">
                                        Similarity: {(source.score * 100).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 italic leading-relaxed bg-white p-2 rounded border border-slate-100 italic">
                                "{source.content}"
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SourceDropdown;

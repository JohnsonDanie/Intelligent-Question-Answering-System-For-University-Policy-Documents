import React, { useRef, useEffect } from 'react';
import { Send, GraduationCap, User } from 'lucide-react';
import SourceDropdown from './SourceDropdown';

const ChatInterface = ({ messages, query, setQuery, onSend, isLoading }) => {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f8fafc] relative">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-8 z-10 sticky top-0 shadow-sm">
                <GraduationCap className="w-6 h-6 text-university-blue mr-3" />
                <h2 className="font-bold text-slate-800">Intelligent Policy Advisor</h2>
                <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Active System</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                        <GraduationCap className="w-20 h-20 text-university-blue mb-6 stroke-1" />
                        <h3 className="text-2xl font-bold text-university-blue mb-2">Welcome to the Policy Assistant</h3>
                        <p className="max-w-md text-slate-600">
                            Upload university policies on the left, then ask me anything about grading, conduct, or honors.
                        </p>
                    </div>
                ) : (
                    messages.map((message, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.type === 'bot' && (
                                <div className="w-10 h-10 rounded-full bg-university-blue flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-university-lightBlue/30">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className={`max-w-[70%] group ${message.type === 'user' ? 'order-last' : ''}`}>
                                <div
                                    className={`p-5 rounded-2xl shadow-sm border ${message.type === 'user'
                                            ? 'bg-university-blue text-white border-university-darkBlue rounded-tr-none'
                                            : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    {message.sources && <SourceDropdown sources={message.sources} />}
                                </div>
                                <div className={`mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                                    {message.type === 'user' ? 'Student Queried' : 'Policy Response'}
                                </div>
                            </div>
                            {message.type === 'user' && (
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 shadow-inner">
                                    <User className="w-6 h-6 text-slate-600" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex gap-4 justify-start">
                        <div className="w-10 h-10 rounded-full bg-university-blue/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                            <GraduationCap className="w-6 h-6 text-university-blue" />
                        </div>
                        <div className="bg-white p-6 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-university-blue/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-university-blue/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-university-blue/40 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-8 bg-gradient-to-t from-white via-white/80 to-transparent">
                <form
                    onSubmit={(e) => { e.preventDefault(); onSend(); }}
                    className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 flex items-center gap-2 group ring-offset-2 focus-within:ring-2 focus-within:ring-university-blue/20 transition-all"
                >
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask help with university policies..."
                        className="flex-1 px-4 py-3 outline-none text-slate-700 placeholder-slate-400 bg-transparent text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="bg-university-blue text-white p-3 rounded-xl hover:bg-university-darkBlue transition-all disabled:opacity-30 disabled:hover:bg-university-blue shadow-lg active:scale-95"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
                <p className="text-[10px] text-center mt-4 text-slate-400 font-medium uppercase tracking-[0.2em]">
                    Powered by OpenAI & LlamaIndex &bull; Persistence Enabled
                </p>
            </div>
        </div>
    );
};

export default ChatInterface;

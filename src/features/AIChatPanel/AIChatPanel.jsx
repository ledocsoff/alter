import React, { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithDirector } from '../../utils/googleAI';
import { getApiKey } from '../../utils/storage';
import { SparklesIcon } from '../../components/Icons';
import { useStudio } from '../../store/StudioContext';

const AIChatPanel = ({ model, location, onGenerate, onShowApiKeyModal }) => {
    const { scene, outfitRefImages } = useStudio();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [readyPrompt, setReadyPrompt] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const hasInitialized = useRef(false);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Initialize chat with AI greeting
    useEffect(() => {
        if (hasInitialized.current || !location) return;
        hasInitialized.current = true;

        const initChat = async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                setMessages([{
                    role: 'model',
                    text: `👋 Salut ! On shoot à **${location.name}**. Configure ta clé API pour commencer !`,
                }]);
                return;
            }

            setIsLoading(true);
            try {
                // Send initial "start" message to trigger AI greeting
                const history = [{ role: 'user', text: 'Salut, on commence ?' }];
                const reply = await chatWithDirector(apiKey, history, model, location, scene, outfitRefImages);
                setMessages([
                    { role: 'user', text: 'Salut, on commence ?', hidden: true },
                    { role: 'model', text: reply },
                ]);
            } catch (e) {
                setMessages([{
                    role: 'model',
                    text: `👋 On shoot à **${location.name}** ! Décris-moi ta scène ou dis "guide-moi" 🎬`,
                }]);
            } finally {
                setIsLoading(false);
                inputRef.current?.focus();
            }
        };

        initChat();
    }, [location, model]);

    // Visually confirm outfit has been attached without hitting API
    const prevOutfitRef = useRef(outfitRefImages);
    useEffect(() => {
        if (outfitRefImages !== prevOutfitRef.current) {
            if (outfitRefImages?.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'model',
                    text: "✨ Vêtement prêt pour l'IA ! Je l'ai bien mémorisé pour la prochaine génération. 👕"
                }]);
            }
            prevOutfitRef.current = outfitRefImages;
        }
    }, [outfitRefImages]);

    // Extract JSON from AI response
    const extractJSON = useCallback((text) => {
        const match = text.match(/```json\s*([\s\S]*?)```/);
        if (!match) return null;
        try {
            return JSON.parse(match[1].trim());
        } catch {
            return null;
        }
    }, []);

    // Send message
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const apiKey = getApiKey();
        if (!apiKey) {
            onShowApiKeyModal?.();
            return;
        }

        const userMsg = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Build history for Gemini (exclude hidden messages from display but include in history)
            const fullHistory = [
                ...messages.map(m => ({ role: m.role, text: m.text })),
                { role: 'user', text: userMsg },
            ];

            const reply = await chatWithDirector(apiKey, fullHistory, model, location, scene, outfitRefImages);

            // Check if reply contains final JSON
            const json = extractJSON(reply);
            if (json) {
                setReadyPrompt(json);
                // Show only the text before the JSON block
                const textBeforeJson = reply.split('```json')[0].trim();
                setMessages(prev => [...prev, {
                    role: 'model',
                    text: textBeforeJson || '✅ Prompt prêt !',
                    hasPrompt: true,
                }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: reply }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                role: 'model',
                text: `⚠️ ${e.message}`,
                isError: true,
            }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, isLoading, messages, model, location, extractJSON, onShowApiKeyModal]);

    // Handle Enter key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    // Generate image with ready prompt
    const handleGenerate = useCallback(() => {
        if (!readyPrompt) return;
        const promptStr = JSON.stringify(readyPrompt, null, 2);
        onGenerate?.(promptStr);
    }, [readyPrompt, onGenerate]);

    // Reset chat
    const handleReset = useCallback(() => {
        hasInitialized.current = false;
        setMessages([]);
        setReadyPrompt(null);
        setInput('');
        // Re-trigger init
        setTimeout(() => {
            hasInitialized.current = false;
            setMessages([]);
            const initChat = async () => {
                const apiKey = getApiKey();
                if (!apiKey) return;
                setIsLoading(true);
                try {
                    const history = [{ role: 'user', text: 'Salut, nouvelle photo !' }];
                    const reply = await chatWithDirector(apiKey, history, model, location, scene, outfitRefImages);
                    hasInitialized.current = true;
                    setMessages([
                        { role: 'user', text: 'Salut, nouvelle photo !', hidden: true },
                        { role: 'model', text: reply },
                    ]);
                } catch {
                    hasInitialized.current = true;
                    setMessages([{ role: 'model', text: `🎬 Nouvelle session ! Décris ta scène ou dis "guide-moi"` }]);
                } finally {
                    setIsLoading(false);
                }
            };
            initChat();
        }, 50);
    }, [model, location]);

    return (
        <div className="bg-[#0e0e10] border border-white/[0.05] rounded-xl flex flex-col h-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 px-3 sm:px-4 py-2.5 border-b border-white/[0.04] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[12px] font-semibold text-zinc-300">Directeur Photo IA</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                    {readyPrompt && (
                        <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Prompt prêt
                        </span>
                    )}
                    <button
                        onClick={handleReset}
                        className="text-[10px] text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
                        title="Nouvelle session"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
                {messages.filter(m => !m.hidden).map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${msg.role === 'user'
                                ? 'bg-teal-500/20 text-teal-100 rounded-br-md'
                                : msg.isError
                                    ? 'bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-md'
                                    : msg.hasPrompt
                                        ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/15 rounded-bl-md'
                                        : 'bg-zinc-800/60 text-zinc-300 border border-white/[0.04] rounded-bl-md'
                                }`}
                        >
                            {msg.text.split('\n').map((line, j) => (
                                <p key={j} className={j > 0 ? 'mt-1' : ''}>
                                    {line.split(/(\*\*.*?\*\*)/).map((part, k) =>
                                        part.startsWith('**') && part.endsWith('**')
                                            ? <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                                            : part
                                    )}
                                </p>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-zinc-800/60 border border-white/[0.04] rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate button (when prompt is ready) */}
            {readyPrompt && (
                <div className="px-3 pb-1 shrink-0">
                    <button
                        onClick={handleGenerate}
                        className="w-full alter-btn-primary text-[12px] font-semibold py-2.5 flex items-center justify-center gap-2 animate-fade-in"
                    >
                        <SparklesIcon size={14} />
                        Générer l'image
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="px-3 pb-3 pt-1 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        aria-label="Message au directeur photo IA"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={readyPrompt ? "Modifie quelque chose ou génère..." : "Décris ta scène..."}
                        className="flex-1 min-w-0 bg-[#0a0a0c] border border-white/[0.06] rounded-xl px-3 py-2 text-[12px] text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-teal-500/40 transition-colors max-h-20"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="shrink-0 w-9 h-9 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 flex items-center justify-center transition-all disabled:opacity-30"
                    >
                        {isLoading ? (
                            <div className="w-3.5 h-3.5 border-2 border-teal-400/40 border-t-teal-400 rounded-full animate-spin" />
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChatPanel;

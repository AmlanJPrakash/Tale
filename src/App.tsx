/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  MessageCircle, 
  X, 
  Send, 
  Wind, 
  Moon, 
  Sun, 
  Volume2,
  ChevronRight,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { generateMeditationSession, chatWithGemini, type MeditationSession } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ambientVisuals = [
  { name: 'AI Generated', url: null },
  { name: 'Ancient Forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Deep Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Misty Mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Abstract Flow', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Cosmic Void', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1920' },
  { name: 'Zen Garden', url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=1920' },
];

export default function App() {
  const [theme, setTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState<MeditationSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', parts: { text: string }[] }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [customVisual, setCustomVisual] = useState<string | null>(null);
  const [isVisualsOpen, setIsVisualsOpen] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!theme.trim()) return;

    setIsGenerating(true);
    try {
      const newSession = await generateMeditationSession(theme);
      setSession(newSession);
      setIsPlaying(false);
    } catch (error) {
      console.error("Failed to generate session:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = async (base64Data: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Assuming 16-bit PCM
      const float32Data = new Float32Array(bytes.length / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < float32Data.length; i++) {
        float32Data[i] = view.getInt16(i * 2, true) / 32768.0;
      }

      const audioBuffer = audioContext.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      
      return source;
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
      return null;
    }
  };

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const togglePlay = async () => {
    if (!session?.audioData) return;

    if (isPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const source = await playAudio(session.audioData);
      audioSourceRef.current = source;
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
    setIsChatLoading(true);

    try {
      const response = await chatWithGemini(userMessage, chatHistory);
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: response || "I'm here to guide you." }] }]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickThemes = [
    { name: 'Inner Peace', icon: <Wind className="w-4 h-4" /> },
    { name: 'Deep Sleep', icon: <Moon className="w-4 h-4" /> },
    { name: 'Morning Energy', icon: <Sun className="w-4 h-4" /> },
    { name: 'Stress Relief', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-orange-500/30 overflow-hidden relative">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          {(customVisual || (session && session.imageUrl)) ? (
            <motion.div
              key={customVisual || session?.imageUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 }}
              className="absolute inset-0"
            >
              <img 
                src={customVisual || session?.imageUrl} 
                className="w-full h-full object-cover opacity-60 scale-105"
                alt="Meditation Background"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
            </motion.div>
          ) : (
            <motion.div
              key="default-bg"
              className="absolute inset-0 bg-[#0a0502]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-900/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="relative z-10 h-screen flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!session && !isGenerating ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl w-full text-center space-y-12"
            >
              <div className="space-y-4">
                <motion.h1 
                  className="text-6xl md:text-8xl font-light tracking-tighter leading-none"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  TALE
                </motion.h1>
                <p className="text-orange-200/60 uppercase tracking-[0.3em] text-xs font-medium">
                  Your Personal Sanctuary
                </p>
              </div>

              <form onSubmit={handleGenerate} className="space-y-8">
                <div className="relative group">
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="What do you need today?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-white/20 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-3 bottom-3 px-6 bg-orange-600 hover:bg-orange-500 rounded-xl transition-colors flex items-center gap-2 font-medium"
                  >
                    Begin <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {quickThemes.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => { setTheme(t.name); }}
                      className="px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm flex items-center gap-2 text-white/70"
                    >
                      {t.icon} {t.name}
                    </button>
                  ))}
                </div>
              </form>
            </motion.div>
          ) : isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-orange-500/20 animate-ping absolute inset-0" />
                <div className="w-24 h-24 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light italic serif">Crafting your session...</h2>
                <p className="text-white/40 text-sm animate-pulse">Generating script, visuals, and voice</p>
              </div>
            </motion.div>
          ) : session ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <button 
                    onClick={() => setSession(null)}
                    className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-1 mb-4"
                  >
                    <RotateCcw className="w-3 h-3" /> Start Over
                  </button>
                  <h2 className="text-5xl font-light italic serif leading-tight">
                    {session.title}
                  </h2>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-2xl shadow-orange-500/20"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-orange-500"
                      animate={{ width: isPlaying ? "100%" : "0%" }}
                      transition={{ duration: 180, ease: "linear" }} // Mock progress for 3 mins
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-white/60">
                  <Volume2 className="w-5 h-5" />
                  <span className="text-sm font-mono tracking-widest uppercase">Ambient Voice Enabled</span>
                </div>

                <div className="pt-4 space-y-4">
                  <button
                    onClick={() => setIsVisualsOpen(!isVisualsOpen)}
                    className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" /> Change Visual Atmosphere
                  </button>
                  
                  <AnimatePresence>
                    {isVisualsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-2">
                          {ambientVisuals.map((v) => (
                            <button
                              key={v.name}
                              onClick={() => setCustomVisual(v.url)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-all",
                                (customVisual === v.url || (!customVisual && !v.url))
                                  ? "bg-white/20 border-white/40 text-white"
                                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                              )}
                            >
                              {v.name}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="relative h-[400px] overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl bg-white/5 p-8">
                <div className="absolute inset-0 mask-gradient-to-b from-transparent via-black to-transparent pointer-events-none z-10" />
                <div className="h-full overflow-y-auto pr-4 scrollbar-hide space-y-6 text-xl font-light leading-relaxed text-white/80 italic serif">
                  {session.script.split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Chatbot Toggle */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-50 group"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* Chatbot Panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-black/80 backdrop-blur-2xl border-l border-white/10 z-[60] flex flex-col"
          >
            <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="font-medium">Guide</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {chatHistory.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <p className="text-white/40 text-sm italic">Ask me anything about your practice or how you're feeling.</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={cn(
                  "flex flex-col",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "max-w-[85%] px-4 py-3 rounded-2xl text-sm",
                    msg.role === 'user' ? "bg-orange-600 text-white" : "bg-white/5 border border-white/10 text-white/90"
                  )}>
                    <Markdown className="prose prose-invert prose-sm">{msg.parts[0].text}</Markdown>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-start">
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                    <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-6 border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
                <button
                  type="submit"
                  disabled={isChatLoading}
                  className="absolute right-2 top-2 bottom-2 w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .serif { font-family: 'Georgia', serif; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-gradient-to-b {
          mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
        }
      `}</style>
    </div>
  );
}

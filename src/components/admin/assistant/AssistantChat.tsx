/**
 * @file src/components/admin/assistant/AssistantChat.tsx
 * @description Interactive Chat Interface for the AI Municipal Assistant.
 */

import React, { useState, useRef, useEffect } from"react";
import { Send, Trash2, HelpCircle, Loader2 } from"lucide-react";
import { ChatMessage, askMunicipalAssistant } from"@/app/actions/ai.actions";
import { useAuth } from"@/providers/auth-provider";
import AssistantMessage from"./AssistantMessage";
import AssistantSuggestions from"./AssistantSuggestions";

interface AssistantChatProps {
 forceRefresh: boolean;
}

export const AssistantChat: React.FC<AssistantChatProps> = ({ forceRefresh }) => {
 const { profile } = useAuth();
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [input, setInput] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
 };

 useEffect(() => {
 scrollToBottom();
 }, [messages, loading]);

 const handleSend = async (textToSend: string) => {
 if (!textToSend.trim() || loading) return;

 const userMessage: ChatMessage = {
 role:"user",
 content: textToSend.trim(),
 };

 setMessages((prev) => [...prev, userMessage]);
 setInput("");
 setLoading(true);
 setError(null);

 try {
 // Send the current message along with the history
 const response = await askMunicipalAssistant(profile?.uid ||"", messages, userMessage.content,"chat", forceRefresh);
 if (response.success && response.reply) {
 setMessages((prev) => [
 ...prev,
 {
 role:"model",
 content: response.reply!,
 },
 ]);
 } else {
 setError(response.error ||"Failed to receive analyst response.");
 }
 } catch (err) {
 console.error(err);
 setError("An unexpected error occurred while communicating with the assistant.");
 } finally {
 setLoading(false);
 }
 };

 const handleFormSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 handleSend(input);
 };

 const handleClearChat = () => {
 setMessages([]);
 setError(null);
 };

 return (
 <div className="flex flex-col h-[650px] border border-slate-200 rounded-2xl clay-card backdrop-blur-md overflow-hidden shadow-2xl">
 {/* Chat header */}
 <div className="border-b border-slate-200 clay-card px-5 py-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <HelpCircle className="w-4 h-4 text-red-400" />
 <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
 AI Operations Analyst
 </span>
 <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
 </div>
 {messages.length > 0 && (
 <button
 onClick={handleClearChat}
 className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
 title="Clear Conversation"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
)}
 </div>

 {/* Messages area */}
 <div className="flex-1 overflow-y-auto p-5 space-y-4">
 {messages.length === 0 ? (
 <div className="h-full flex flex-col justify-center space-y-6 max-w-sm mx-auto">
 <div className="text-center space-y-2">
 <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">
 Municipal Operations Center
 </h3>
 <p className="text-[10px] text-zinc-450 leading-relaxed font-semibold">
 Ask analytical questions about incident trends, officer resolution metrics, hotspots, or department workloads.
 </p>
 </div>
 
 <AssistantSuggestions onSelectPrompt={handleSend} />
 </div>
) : (
 <>
 {messages.map((msg, idx) => (
 <AssistantMessage key={idx} message={msg} />
))}

 {loading && (
 <div className="flex w-full gap-3 justify-start">
 <div className="flex h-8 w-8 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
 <Loader2 className="h-4 w-4 animate-spin" />
 </div>
 <div className="border border-slate-200 bg-slate-100/60 text-slate-500 rounded-2xl px-4 py-3 text-xs backdrop-blur-sm flex items-center gap-2 font-medium">
 <span>Analyst is aggregating data structures...</span>
 </div>
 </div>
)}

 {error && (
 <div className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-[10px] text-center font-bold">
 {error}
 </div>
)}
 
 <div ref={messagesEndRef} />
 </>
)}
 </div>

 {/* Input form */}
 <form onSubmit={handleFormSubmit} className="border-t border-slate-200 p-4 clay-card flex gap-3 items-center">
 <input
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Ask about incidents, workloads, duplicate trends..."
 className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all font-medium"
 disabled={loading}
 />
 <button
 type="submit"
 disabled={!input.trim() || loading}
 className="p-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-slate-800 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-md"
 >
 <Send className="w-3.5 h-3.5" />
 </button>
 </form>
 </div>
);
};

export default AssistantChat;

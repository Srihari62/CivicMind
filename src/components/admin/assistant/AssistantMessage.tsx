/**
 * @file src/components/admin/assistant/AssistantMessage.tsx
 * @description Component for rendering individual messages in the AI Assistant chat.
 */

import React from"react";
import { Sparkles, User } from"lucide-react";
import { motion } from"framer-motion";
import { ChatMessage } from"@/app/actions/ai.actions";

interface AssistantMessageProps {
 message: ChatMessage;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({ message }) => {
 const isModel = message.role ==="model";

 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className={`flex w-full gap-3 ${isModel ?"justify-start" :"justify-end"}`}
 >
 {isModel && (
 <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
 <Sparkles className="h-4 w-4" />
 </div>
)}

 <div
 className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
 isModel
 ?"border border-slate-200 bg-slate-100/60 text-slate-700 backdrop-blur-sm"
 :"bg-gradient-to-r from-red-500 to-rose-500 text-slate-800 font-medium"
 }`}
 >
 {isModel ? (
 <div className="whitespace-pre-line space-y-2">
 {message.content}
 </div>
) : (
 <p className="whitespace-pre-line">{message.content}</p>
)}
 </div>

 {!isModel && (
 <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600">
 <User className="h-4 w-4" />
 </div>
)}
 </motion.div>
);
};

export default AssistantMessage;

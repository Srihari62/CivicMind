/**
 * @file src/components/dashboard/ReportComments.tsx
 * @description Nested, real-time comment thread component for reports.
 * Supports nesting, replies, editing, deleting, image attachments, and role badges.
 */

"use client";

import React, { useState, useEffect, useRef } from"react";
import { useAuth } from"@/providers/auth-provider";
import { db } from"@/services/firebase/firestore";
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, increment } from"firebase/firestore";
import { MediaService } from"@/features/media/services/media.service";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { AlertCircle, Camera, Edit2, Reply, Trash2, X, Send, Loader2, CornerDownRight } from"lucide-react";
import { motion, AnimatePresence } from"framer-motion";
import { VoiceInput } from"@/components/voice/VoiceInput";

interface CommentData {
 id: string;
 parentId: string | null;
 userId: string;
 userName: string;
 userAvatarUrl: string | null;
 userRole: string;
 content: string;
 photoUrl: string | null;
 edited: boolean;
 createdAt: string;
 updatedAt: string;
}

interface ThreadedComment extends CommentData {
 replies: ThreadedComment[];
}

interface ReportCommentsProps {
 reportId: string;
}

export default function ReportComments({ reportId }: ReportCommentsProps) {
 const { user, profile } = useAuth();
 const [comments, setComments] = useState<CommentData[]>([]);
 const [loading, setLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 // New root comment inputs
 const [newCommentText, setNewCommentText] = useState<string>("");
 const [newCommentPhoto, setNewCommentPhoto] = useState<string | null>(null);
 const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

 // Interaction states
 const [replyingToId, setReplyingToId] = useState<string | null>(null);
 const [replyText, setReplyText] = useState<string>("");
 const [replyPhoto, setReplyPhoto] = useState<string | null>(null);

 const [editingId, setEditingId] = useState<string | null>(null);
 const [editText, setEditText] = useState<string>("");

 const fileInputRef = useRef<HTMLInputElement>(null);
 const replyFileInputRef = useRef<HTMLInputElement>(null);

 // Subscribe to comments
 useEffect(() => {
 if (!reportId) return;

 setLoading(true);
 const commentsRef = collection(db,"reports", reportId,"comments");

 const unsubscribe = onSnapshot(
 commentsRef,
 (snapshot) => {
 const items: CommentData[] = [];
 snapshot.forEach((docSnap) => {
 items.push({ id: docSnap.id, ...docSnap.data() } as CommentData);
 });
 setComments(items);
 setLoading(false);
 },
 (err) => {
 console.error("Error loading comments:", err);
 setError("Failed to fetch comments in real time.");
 setLoading(false);
 }
);

 return () => unsubscribe();
 }, [reportId]);

 // Construct nested tree and sort
 const getThreadedComments = (): ThreadedComment[] => {
 const map = new Map<string, ThreadedComment>();
 const roots: ThreadedComment[] = [];

 // Initialize map
 comments.forEach((c) => {
 map.set(c.id, { ...c, replies: [] });
 });

 // Populate replies
 comments.forEach((c) => {
 const mapped = map.get(c.id)!;
 if (c.parentId) {
 const parent = map.get(c.parentId);
 if (parent) {
 parent.replies.push(mapped);
 } else {
 // If parent not found, render as root
 roots.push(mapped);
 }
 } else {
 roots.push(mapped);
 }
 });

 // Sort replies chronologically (oldest first)
 const sortReplies = (replies: ThreadedComment[]) => {
 replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
 replies.forEach((r) => sortReplies(r.replies));
 };
 roots.forEach((root) => sortReplies(root.replies));

 // Sort roots by"newest activity first"
 const getNewestActivityTime = (comment: ThreadedComment): number => {
 let maxTime = new Date(comment.createdAt).getTime();
 const traverse = (replies: ThreadedComment[]) => {
 replies.forEach((r) => {
 const t = new Date(r.createdAt).getTime();
 if (t > maxTime) maxTime = t;
 traverse(r.replies);
 });
 };
 traverse(comment.replies);
 return maxTime;
 };

 roots.sort((a, b) => getNewestActivityTime(b) - getNewestActivityTime(a));

 return roots;
 };

 // Upload photo handler
 const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;
 const file = files[0];

 if (!user) return;

 setUploadingPhoto(true);
 try {
 const assets = await MediaService.uploadFiles([file],"comments", user.uid);
 if (assets.length > 0) {
 if (isReply) {
 setReplyPhoto(assets[0].url);
 } else {
 setNewCommentPhoto(assets[0].url);
 }
 }
 } catch (err) {
 console.error("Photo upload failed:", err);
 alert("Failed to upload image. Please try again.");
 } finally {
 setUploadingPhoto(false);
 }
 };

 // Submit root comment
 const handleSubmitRootComment = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user || !newCommentText.trim()) return;

 const payload = {
 parentId: null,
 userId: user.uid,
 userName: profile?.displayName || user.displayName ||"Anonymous Citizen",
 userAvatarUrl: profile?.avatarUrl || user.photoURL || null,
 userRole: profile?.role ||"citizen",
 content: newCommentText.trim(),
 photoUrl: newCommentPhoto,
 edited: false,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 try {
 const commentsRef = collection(db,"reports", reportId,"comments");
 await addDoc(commentsRef, payload);

 // Increment comments count on parent report
 const reportRef = doc(db,"reports", reportId);
 await updateDoc(reportRef, {
 commentsCount: increment(1),
"timestamps.updatedAt": new Date().toISOString(),
 });

 setNewCommentText("");
 setNewCommentPhoto(null);
 } catch (err) {
 console.error("Error posting comment:", err);
 }
 };

 // Submit reply comment
 const handleSubmitReply = async (parentId: string) => {
 if (!user || !replyText.trim()) return;

 const payload = {
 parentId,
 userId: user.uid,
 userName: profile?.displayName || user.displayName ||"Anonymous Citizen",
 userAvatarUrl: profile?.avatarUrl || user.photoURL || null,
 userRole: profile?.role ||"citizen",
 content: replyText.trim(),
 photoUrl: replyPhoto,
 edited: false,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 };

 try {
 const commentsRef = collection(db,"reports", reportId,"comments");
 await addDoc(commentsRef, payload);

 // Increment comments count on parent report
 const reportRef = doc(db,"reports", reportId);
 await updateDoc(reportRef, {
 commentsCount: increment(1),
"timestamps.updatedAt": new Date().toISOString(),
 });

 setReplyText("");
 setReplyPhoto(null);
 setReplyingToId(null);
 } catch (err) {
 console.error("Error posting reply:", err);
 }
 };

 // Edit comment
 const handleSaveEdit = async (commentId: string) => {
 if (!editText.trim()) return;

 try {
 const commentRef = doc(db,"reports", reportId,"comments", commentId);
 await updateDoc(commentRef, {
 content: editText.trim(),
 edited: true,
 updatedAt: new Date().toISOString(),
 });
 setEditingId(null);
 setEditText("");
 } catch (err) {
 console.error("Error editing comment:", err);
 }
 };

 // Delete comment
 const handleDeleteComment = async (commentId: string) => {
 if (!confirm("Are you sure you want to delete this comment?")) return;

 try {
 const commentRef = doc(db,"reports", reportId,"comments", commentId);
 await deleteDoc(commentRef);

 // Decrement comments count on parent report
 const reportRef = doc(db,"reports", reportId);
 await updateDoc(reportRef, {
 commentsCount: increment(-1),
"timestamps.updatedAt": new Date().toISOString(),
 });
 } catch (err) {
 console.error("Error deleting comment:", err);
 }
 };

 const getRoleBadgeColor = (role: string) => {
 switch (role) {
 case"admin":
 return"bg-rose-500/10 text-rose-400 border-rose-500/20";
 case"officer":
 return"bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
 default:
 return"bg-blue-500/10 text-blue-400 border-blue-500/20";
 }
 };

 // Recursive component to render nested comments
 const CommentItem = ({ comment, depth = 0 }: { comment: ThreadedComment; depth: number }) => {
 const isOwner = user?.uid === comment.userId;
 const isReplying = replyingToId === comment.id;
 const isEditing = editingId === comment.id;

 return (
 <div className="flex flex-col gap-3 relative">
 <div className="flex gap-3 items-start">
 {/* Avatar */}
 <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
 {comment.userAvatarUrl ? (
 <img src={comment.userAvatarUrl} alt={comment.userName} className="w-full h-full object-cover" />
) : (
 <span className="text-xs font-bold text-slate-500">{comment.userName[0]?.toUpperCase()}</span>
)}
 </div>

 {/* Comment Bubble */}
 <div className="flex-1 bg-slate-100/40 border border-slate-200 p-4 rounded-2xl relative shadow-md">
 {/* Header info */}
 <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-bold text-slate-800">{comment.userName}</span>
 <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(comment.userRole)}`}>
 {comment.userRole}
 </span>
 <span className="text-[10px] text-slate-500">
 {new Date(comment.createdAt).toLocaleString()}
 </span>
 {comment.edited && (
 <span className="text-[10px] text-slate-500 italic font-mono">(edited)</span>
)}
 </div>

 {/* Action buttons */}
 <div className="flex items-center gap-2">
 {user && (
 <button
 onClick={() => {
 setReplyingToId(isReplying ? null : comment.id);
 setReplyText("");
 setReplyPhoto(null);
 }}
 className="text-slate-500 hover:text-blue-400 transition p-1 rounded hover:bg-white/5"
 title="Reply"
 >
 <Reply className="w-3.5 h-3.5" />
 </button>
)}
 {isOwner && !isEditing && (
 <>
 <button
 onClick={() => {
 setEditingId(comment.id);
 setEditText(comment.content);
 }}
 className="text-slate-500 hover:text-amber-400 transition p-1 rounded hover:bg-white/5"
 title="Edit"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => handleDeleteComment(comment.id)}
 className="text-slate-500 hover:text-rose-400 transition p-1 rounded hover:bg-white/5"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </>
)}
 </div>
 </div>

 {/* Comment Body */}
 {isEditing ? (
 <div className="flex flex-col gap-2 mt-2">
 <textarea
 value={editText}
 onChange={(e) => setEditText(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-800 outline-none focus:border-primary"
 rows={2}
 />
 <div className="flex gap-2 justify-end">
 <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
 Cancel
 </Button>
 <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveEdit(comment.id)}>
 Save Changes
 </Button>
 </div>
 </div>
) : (
 <div className="space-y-2">
 <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
 {comment.photoUrl && (
 <div className="relative max-w-xs rounded-xl overflow-hidden border border-slate-200 bg-slate-50/60 aspect-video mt-2 group">
 <img
 src={comment.photoUrl}
 alt="Attachment"
 className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition duration-300"
 onClick={() => window.open(comment.photoUrl!,"_blank")}
 />
 </div>
)}
 </div>
)}
 </div>
 </div>

 {/* Reply Editor Form */}
 <AnimatePresence>
 {isReplying && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height:"auto" }}
 exit={{ opacity: 0, height: 0 }}
 className="flex gap-3 pl-12 items-start"
 >
 <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-200 shrink-0 flex items-center justify-center">
 <CornerDownRight className="w-3.5 h-3.5 text-slate-500" />
 </div>
 <div className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col gap-2.5">
 <VoiceInput
 multiline
 rows={2}
 placeholder={`Reply to ${comment.userName}...`}
 value={replyText}
 onChange={setReplyText}
 language={(profile as any)?.preferredLanguage ||"English"}
 />

 {/* Reply Photo Preview */}
 {replyPhoto && (
 <div className="relative w-24 aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-100 group shrink-0">
 <img src={replyPhoto} alt="Attachment Preview" className="object-cover w-full h-full" />
 <button
 type="button"
 onClick={() => setReplyPhoto(null)}
 className="absolute top-1 right-1 bg-black/80 hover:bg-black text-slate-800 rounded-full p-0.5"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
)}

 <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
 <div className="flex gap-2">
 <input
 type="file"
 ref={replyFileInputRef}
 onChange={(e) => handlePhotoUpload(e, true)}
 accept="image/*"
 className="hidden"
 />
 <button
 type="button"
 disabled={uploadingPhoto}
 onClick={() => replyFileInputRef.current?.click()}
 className="text-slate-500 hover:text-slate-800 transition disabled:opacity-50"
 >
 {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
 </button>
 </div>
 <div className="flex gap-2">
 <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyingToId(null)}>
 Cancel
 </Button>
 <Button
 size="sm"
 className="h-7 text-xs bg-blue-600 hover:bg-blue-500"
 disabled={!replyText.trim()}
 onClick={() => handleSubmitReply(comment.id)}
 >
 <Send className="w-3 h-3 mr-1" /> Post Reply
 </Button>
 </div>
 </div>
 </div>
 </motion.div>
)}
 </AnimatePresence>

 {/* Recursive child replies */}
 {comment.replies.length > 0 && (
 <div className="pl-12 flex flex-col gap-4 border-l border-slate-200 mt-2">
 {comment.replies.map((reply) => (
 <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
))}
 </div>
)}
 </div>
);
 };

 const threaded = getThreadedComments();

 return (
 <div className="w-full rounded-2xl clay-card p-6 flex flex-col gap-6">
 <div className="flex items-center justify-between border-b border-slate-200 pb-3">
 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
 <span>💬 Community Comments ({comments.length})</span>
 </h3>
 </div>

 {error && (
 <div className="p-3.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
 {error}
 </div>
)}

 {/* Main Comment Form */}
 {user ? (
 <form onSubmit={handleSubmitRootComment} className="flex gap-3 items-start bg-slate-100/30 border border-slate-200 p-4 rounded-2xl shadow-inner">
 <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
 {profile?.avatarUrl ? (
 <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
) : (
 <span className="text-xs font-bold text-slate-500">{profile?.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}</span>
)}
 </div>

 <div className="flex-1 flex flex-col gap-3">
 <VoiceInput
 multiline
 rows={2}
 placeholder="Post a comment or verification report update..."
 value={newCommentText}
 onChange={setNewCommentText}
 language={(profile as any)?.preferredLanguage ||"English"}
 />

 {/* Root Photo Preview */}
 {newCommentPhoto && (
 <div className="relative w-24 aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-100 group shrink-0">
 <img src={newCommentPhoto} alt="Attachment Preview" className="object-cover w-full h-full" />
 <button
 type="button"
 onClick={() => setNewCommentPhoto(null)}
 className="absolute top-1 right-1 bg-black/80 hover:bg-black text-slate-800 rounded-full p-0.5"
 >
 <X className="w-3 h-3" />
 </button>
 </div>
)}

 <div className="flex items-center justify-between border-t border-slate-200 pt-3">
 <div>
 <input
 type="file"
 ref={fileInputRef}
 onChange={(e) => handlePhotoUpload(e, false)}
 accept="image/*"
 className="hidden"
 />
 <button
 type="button"
 disabled={uploadingPhoto}
 onClick={() => fileInputRef.current?.click()}
 className="text-slate-500 hover:text-slate-800 transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
 >
 {uploadingPhoto ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" /> Uploading image...
 </>
) : (
 <>
 <Camera className="w-4 h-4" /> Add Photo
 </>
)}
 </button>
 </div>
 <Button
 type="submit"
 size="sm"
 disabled={!newCommentText.trim()}
 className="bg-blue-600 hover:bg-blue-500 font-bold px-4"
 >
 <Send className="w-3.5 h-3.5 mr-1.5" /> Comment
 </Button>
 </div>
 </div>
 </form>
) : (
 <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
 Please log in to participate in the conversation.
 </div>
)}

 {/* Comments List */}
 {loading ? (
 <div className="flex flex-col items-center py-6 gap-2">
 <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
 <span className="text-xs text-slate-500 font-medium">Streaming comments...</span>
 </div>
) : threaded.length === 0 ? (
 <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
 No comments yet. Be the first to start the discussion!
 </div>
) : (
 <div className="flex flex-col gap-6">
 {threaded.map((rootComment) => (
 <CommentItem key={rootComment.id} comment={rootComment} depth={0} />
))}
 </div>
)}
 </div>
);
}

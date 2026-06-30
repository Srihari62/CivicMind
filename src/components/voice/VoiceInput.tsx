/**
 * @file src/components/voice/VoiceInput.tsx
 * @description Reusable Speech-to-Text input component for CivicMind.
 * Wraps any textarea or text input with a premium voice dictation popover.
 * Sprint 14B: Integrates Gemini transcript polishing after recording completes.
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, Trash2, Globe, Sparkles } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { polishTranscriptAction } from "@/app/actions/ai.actions";
import { cn } from "@/utils/cn";

// ─── Language Map ─────────────────────────────────────────────────────────────

/** BCP-47 code → { displayEnglish, nativeScript } */
const LANGUAGES: Record<string, { en: string; native: string }> = {
  "en-IN": { en: "English",   native: "English" },
  "hi-IN": { en: "Hindi",     native: "हिन्दी" },
  "te-IN": { en: "Telugu",    native: "తెలుగు" },
  "ta-IN": { en: "Tamil",     native: "தமிழ்" },
  "kn-IN": { en: "Kannada",   native: "ಕನ್ನಡ" },
  "ml-IN": { en: "Malayalam", native: "മലയാളം" },
  "mr-IN": { en: "Marathi",   native: "मराठी" },
  "gu-IN": { en: "Gujarati",  native: "ગુજરાતી" },
  "pa-IN": { en: "Punjabi",   native: "ਪੰਜਾਬੀ" },
  "bn-IN": { en: "Bengali",   native: "বাংলা" },
  "or-IN": { en: "Odia",      native: "ଓଡ଼ିଆ" },
  "ur-IN": { en: "Urdu",      native: "اردو" },
};

/** English display name → BCP-47 code */
const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGES).map(([code, { en }]) => [en, code])
);

function resolveLanguageCode(language: string): string {
  // Accept either "English" or "en-IN" style input
  return NAME_TO_CODE[language] ?? language;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  /** User preferred language — display name ("English") or BCP-47 code ("en-IN") */
  language?: string;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  rows?: number;
  label?: string;
  error?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  language = "English",
  disabled = false,
  placeholder,
  maxLength,
  multiline = false,
  autoFocus = false,
  id,
  name,
  className,
  rows = 3,
  label,
  error,
}) => {
  const [activeLangCode, setActiveLangCode] = useState(() => resolveLanguageCode(language));
  const [isOpen, setIsOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [prefixText, setPrefixText] = useState("");

  // AI polishing states
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishFailed, setPolishFailed] = useState(false);
  const [polishSuccess, setPolishSuccess] = useState(false);

  // Cache: prevent duplicate Gemini calls for unchanged transcripts
  const lastPolishedRaw = useRef<string | null>(null);

  // Sync language code when prop changes
  useEffect(() => {
    setActiveLangCode(resolveLanguageCode(language));
  }, [language]);

  // ── Voice hook ────────────────────────────────────────────────────────────

  const handleTranscriptChange = useCallback(
    (newTranscript: string) => {
      const merged = prefixText
        ? `${prefixText} ${newTranscript}`.replace(/\s{2,}/g, " ").trim()
        : newTranscript;
      onChange(merged);
    },
    [prefixText, onChange]
  );

  const handleRecordingCompleted = useCallback(
    async (rawTranscript: string) => {
      const trimmed = rawTranscript.trim();

      // Gate: too short or already polished this exact transcript
      if (trimmed.length < 15 || trimmed === lastPolishedRaw.current) return;

      lastPolishedRaw.current = trimmed;
      setIsPolishing(true);
      setPolishFailed(false);
      setPolishSuccess(false);

      try {
        const res = await polishTranscriptAction(trimmed, activeLangCode);

        if (res.success && res.polished && res.polished.trim().length > 0) {
          const final = prefixText
            ? `${prefixText} ${res.polished}`.replace(/\s{2,}/g, " ").trim()
            : res.polished;
          onChange(final);
          setPolishSuccess(true);
          // Fade success indicator after 2.5 s
          setTimeout(() => setPolishSuccess(false), 2500);
        } else {
          // AI returned nothing useful — keep the original transcript
          setPolishFailed(true);
          setTimeout(() => setPolishFailed(false), 3500);
        }
      } catch {
        setPolishFailed(true);
        setTimeout(() => setPolishFailed(false), 3500);
      } finally {
        setIsPolishing(false);
      }
    },
    [activeLangCode, prefixText, onChange]
  );

  const {
    state,
    transcript,
    errorMessage,
    isSupported,
    startSpeech,
    stopSpeech,
    pauseSpeech,
    resumeSpeech,
    cancelSpeech,
    retrySpeech,
    clearTranscript,
    setInitialText,
  } = useSpeechRecognition({
    language: activeLangCode,
    onTranscriptChange: handleTranscriptChange,
  });

  // Trigger AI polish when speech recognition transitions to "completed"
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev !== "completed" && state === "completed" && transcript) {
      handleRecordingCompleted(transcript);
    }
  }, [state, transcript, handleRecordingCompleted]);

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (state === "listening") {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (state === "idle" || state === "completed" || state === "error") {
      setSeconds(0);
    }
    return () => clearInterval(timer);
  }, [state]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenVoice = () => {
    if (disabled || !isSupported) return;
    const current = value.trim();
    setPrefixText(current);
    setInitialText(current);
    lastPolishedRaw.current = null; // reset cache for new session
    setPolishFailed(false);
    setPolishSuccess(false);
    setIsOpen(true);
    setTimeout(() => startSpeech(activeLangCode), 160);
  };

  const handleDone = () => {
    stopSpeech();
    // Close after a short window so polishing can show inside the popover
    setTimeout(() => setIsOpen(false), isPolishing ? 1500 : 550);
  };

  const handleCancel = () => {
    cancelSpeech();
    onChange(prefixText);
    setIsOpen(false);
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setActiveLangCode(next);
    lastPolishedRaw.current = null;
    if (state === "listening") {
      pauseSpeech();
      setTimeout(() => startSpeech(next), 200);
    }
  };

  const handleClear = () => {
    clearTranscript();
    onChange(prefixText);
    lastPolishedRaw.current = null;
  };

  // ── Status text ───────────────────────────────────────────────────────────

  const statusText = (): string => {
    if (isPolishing)    return "Improving transcript…";
    if (polishSuccess)  return "Transcript improved ✓";
    if (polishFailed)   return "Couldn't improve formatting. Using original.";
    if (errorMessage)   return errorMessage;
    switch (state) {
      case "listening":   return "Listening…";
      case "paused":      return "Recognition paused";
      case "processing":  return "Processing speech…";
      case "completed":   return "Transcription complete";
      case "error":       return "An error occurred";
      default:            return "Ready to record";
    }
  };

  // ── Shared input class ────────────────────────────────────────────────────

  const inputClass = cn(
    "w-full px-3.5 py-2.5 bg-zinc-900/60 border border-white/10 text-sm rounded-2xl",
    "transition-all duration-200 outline-none text-white placeholder:text-zinc-500",
    "focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30",
    "pr-12",
    disabled && "opacity-50 cursor-not-allowed",
    error && "border-red-500/60 focus:border-red-500",
    className
  );

  const langInfo = LANGUAGES[activeLangCode] ?? { en: activeLangCode, native: activeLangCode };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-400 select-none">
          {label}
        </label>
      )}

      {/* Text field */}
      <div className="relative flex items-stretch">
        {multiline ? (
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            rows={rows}
            className={cn(inputClass, "resize-y")}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        ) : (
          <input
            id={id}
            name={name}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            autoFocus={autoFocus}
            className={inputClass}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        )}

        {/* Microphone trigger */}
        {isSupported && !disabled && (
          <motion.button
            type="button"
            onClick={handleOpenVoice}
            title="Start voice input"
            aria-label="Start voice dictation"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "absolute right-3 bottom-0 top-0 my-auto h-7 w-7",
              "rounded-xl bg-zinc-800/80 border border-white/10",
              "flex items-center justify-center",
              "text-blue-400 hover:text-blue-300 hover:bg-zinc-700/80",
              "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            )}
          >
            <Mic className="w-3.5 h-3.5" aria-hidden />
          </motion.button>
        )}
      </div>

      {/* Inline AI polishing indicator (outside popover, shown on field) */}
      <AnimatePresence>
        {(isPolishing || polishFailed) && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-lg border w-fit",
              isPolishing
                ? "text-cyan-400 border-cyan-500/20 bg-cyan-500/5"
                : "text-zinc-500 border-white/5 bg-zinc-900/40"
            )}
          >
            {isPolishing ? (
              <>
                <Sparkles className="w-3 h-3 animate-pulse" />
                Improving transcript…
              </>
            ) : (
              "Couldn't improve formatting. Using original transcript."
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs text-red-400 font-medium mt-0.5">
          {error}
        </span>
      )}

      {/* Voice Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Voice input controls"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "absolute z-30 left-0 right-0 top-full mt-2",
              "border border-white/10 rounded-2xl p-4",
              "bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/60",
              "flex flex-col gap-3"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  {state === "listening" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-2 w-2",
                      isPolishing           ? "bg-cyan-400"
                      : polishSuccess        ? "bg-emerald-500"
                      : state === "listening"? "bg-red-500"
                      : state === "paused"  ? "bg-amber-400"
                      : state === "error"   ? "bg-rose-600"
                      : state === "processing" ? "bg-cyan-400"
                      : state === "completed"  ? "bg-emerald-500"
                      : "bg-zinc-600"
                    )}
                  />
                </span>
                <span className={cn(
                  "text-[11px] font-bold uppercase tracking-wider truncate",
                  isPolishing   ? "text-cyan-400"
                  : polishSuccess ? "text-emerald-400"
                  : polishFailed ? "text-zinc-500"
                  : "text-zinc-400"
                )}>
                  {statusText()}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-3">
                {/* Timer */}
                {state !== "idle" && !isPolishing && (
                  <span className="font-mono text-[11px] text-white bg-zinc-900 px-2 py-0.5 rounded border border-white/5 tabular-nums">
                    {formatTime(seconds)}
                  </span>
                )}

                {/* AI polishing spinner */}
                {isPolishing && (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-semibold">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    AI Improving…
                  </span>
                )}

                {/* Language selector (native script) */}
                <label className="flex items-center gap-1.5 text-zinc-500">
                  <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  <select
                    value={activeLangCode}
                    onChange={handleLangChange}
                    aria-label="Select recognition language"
                    disabled={isPolishing}
                    className={cn(
                      "bg-zinc-900 border border-white/10 text-white",
                      "rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
                      "outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    )}
                  >
                    {Object.entries(LANGUAGES).map(([code, { native }]) => (
                      <option key={code} value={code}>
                        {native}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Waveform / Status visualiser */}
            <div
              className={cn(
                "flex items-center justify-center h-11",
                "bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden px-3"
              )}
              aria-hidden
            >
              {isPolishing ? (
                <div className="flex items-center gap-2 text-cyan-400/80">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest animate-pulse">
                    Improving transcript…
                  </span>
                </div>
              ) : polishSuccess ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[10px] text-emerald-400/90 font-semibold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Transcript improved
                </motion.span>
              ) : polishFailed ? (
                <span className="text-[10px] text-zinc-500 font-medium italic">
                  Couldn&apos;t improve formatting. Original preserved.
                </span>
              ) : state === "listening" ? (
                <div className="flex items-center gap-[3px] h-7">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] rounded-full bg-blue-500"
                      animate={{ height: [4, 22, 4] }}
                      transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.07, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              ) : state === "paused" ? (
                <div className="flex items-center gap-[3px] h-7">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-[3px] h-1.5 rounded-full bg-zinc-700" />
                  ))}
                </div>
              ) : state === "processing" ? (
                <span className="text-[10px] text-cyan-400/80 font-semibold uppercase tracking-widest animate-pulse">
                  Analyzing audio…
                </span>
              ) : state === "error" ? (
                <span className="text-[10px] text-rose-400/80 font-semibold">
                  {errorMessage ?? "Recognition error"}
                </span>
              ) : state === "completed" ? (
                <span className="text-[10px] text-emerald-400/80 font-semibold uppercase tracking-wider">
                  ✓ Transcription complete
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600 font-mono italic">
                  Speak clearly into your microphone
                </span>
              )}
            </div>

            {/* Language hint strip — shows native script */}
            <div className="text-[10px] text-zinc-600 text-center -mt-1">
              Recognizing in:{" "}
              <span className="text-zinc-400 font-semibold">
                {langInfo.native}
              </span>
              {langInfo.native !== langInfo.en && (
                <span className="text-zinc-600 ml-1">({langInfo.en})</span>
              )}
            </div>

            {/* Control bar */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPolishing}
                className={cn(
                  "text-xs text-zinc-400 hover:text-white",
                  "bg-zinc-900/60 border border-white/5 hover:border-white/20",
                  "px-3 py-1.5 rounded-xl transition-all duration-150",
                  "focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50"
                )}
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {state === "listening" && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={pauseSpeech}
                    title="Pause recording"
                    aria-label="Pause recording"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 transition"
                  >
                    <Pause className="w-3.5 h-3.5" aria-hidden />
                  </motion.button>
                )}

                {state === "paused" && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={resumeSpeech}
                    title="Resume recording"
                    aria-label="Resume recording"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10 text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-emerald-400/20" aria-hidden />
                  </motion.button>
                )}

                {(state === "listening" || state === "paused") && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={stopSpeech}
                    title="Stop recording"
                    aria-label="Stop recording"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                  >
                    <Square className="w-3 h-3 fill-red-400/60" aria-hidden />
                  </motion.button>
                )}

                {state === "error" && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={retrySpeech}
                    title="Retry recording"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-[10px] font-bold"
                  >
                    ↺
                  </motion.button>
                )}

                {value.length > 0 && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClear}
                    title="Clear dictated text"
                    aria-label="Clear dictated text"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-900 border border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  </motion.button>
                )}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={handleDone}
                disabled={isPolishing}
                className={cn(
                  "text-xs font-bold text-white bg-blue-600 hover:bg-blue-700",
                  "px-4 py-1.5 rounded-xl transition-all duration-150 shadow-lg shadow-blue-600/20",
                  "focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60"
                )}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

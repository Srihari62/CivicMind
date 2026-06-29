/**
 * @file src/hooks/useSpeechRecognition.ts
 * @description Reusable React hook encapsulating the browser Web Speech API.
 * Handles compatibility detection, permission states, recognition lifecycle,
 * live transcript updates, pause/resume, error handling, and memory cleanup.
 * Does NOT send audio to any server — fully client-side.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SpeechState =
  | "idle"
  | "listening"
  | "paused"
  | "processing"
  | "completed"
  | "error";

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag, e.g. "en-IN", "hi-IN" */
  language?: string;
  /** Called whenever the transcript changes (interim + final combined) */
  onTranscriptChange?: (text: string) => void;
  /** Called whenever the recognition state changes */
  onStateChange?: (state: SpeechState) => void;
  /** Called when a recoverable error occurs */
  onError?: (message: string) => void;
}

export interface UseSpeechRecognitionReturn {
  state: SpeechState;
  transcript: string;
  interimTranscript: string;
  errorMessage: string | null;
  isSupported: boolean;
  startSpeech: (lang?: string) => void;
  stopSpeech: () => void;
  pauseSpeech: () => void;
  resumeSpeech: () => void;
  cancelSpeech: () => void;
  retrySpeech: () => void;
  clearTranscript: () => void;
  /** Seed the hook with existing text so new speech is appended correctly */
  setInitialText: (text: string) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { language = "en-IN", onTranscriptChange, onStateChange, onError } =
    options;

  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Mutable refs — avoid stale closures inside event handlers
  const recognitionRef = useRef<any>(null);
  const accumulatedRef = useRef(""); // confirmed final text (from this session)
  const prefixRef = useRef("");      // text that existed before recording started
  const activeLangRef = useRef(language);
  const stateRef = useRef<SpeechState>("idle");

  // Keep active language ref in sync
  useEffect(() => {
    activeLangRef.current = language;
  }, [language]);

  // Detect browser support once on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setIsSupported(!!SR);
    }
  }, []);

  // ── Internal helpers ────────────────────────────────────────────────────

  const updateState = useCallback(
    (next: SpeechState) => {
      stateRef.current = next;
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  const destroyRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // suppress — already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  const buildFullText = useCallback(
    (finalPart: string, interimPart: string): string => {
      const parts = [prefixRef.current, finalPart, interimPart].filter(Boolean);
      return parts.join(" ").replace(/\s{2,}/g, " ").trim();
    },
    []
  );

  const initAndStart = useCallback(
    (lang?: string) => {
      destroyRecognition();

      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) return;

      if (lang) activeLangRef.current = lang;

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = activeLangRef.current;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        updateState("listening");
        setErrorMessage(null);
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinal += (newFinal ? " " : "") + chunk;
          } else {
            interim += (interim ? " " : "") + chunk;
          }
        }

        if (newFinal) {
          accumulatedRef.current = (
            accumulatedRef.current +
            (accumulatedRef.current ? " " : "") +
            newFinal
          ).trim();
        }

        setInterimTranscript(interim);

        const full = buildFullText(accumulatedRef.current, interim);
        setTranscript(full);
        onTranscriptChange?.(full);
      };

      rec.onerror = (event: any) => {
        const code: string = event.error ?? "unknown";
        if (code === "aborted") return; // user-initiated — not an error

        const messages: Record<string, string> = {
          "not-allowed": "Microphone permission denied. Please allow access and try again.",
          "permission-denied": "Microphone permission denied.",
          "no-speech": "No speech detected. Please speak clearly and try again.",
          network: "Network interruption. Please check your connection.",
          "audio-capture": "Microphone not available or already in use.",
          "service-not-allowed": "Speech recognition service not allowed.",
          "bad-grammar": "Speech recognition grammar error.",
        };

        const msg =
          messages[code] ?? `Speech recognition error: ${code}.`;
        setErrorMessage(msg);
        updateState("error");
        onError?.(msg);
      };

      rec.onend = () => {
        setInterimTranscript("");
        // Only auto-complete if we were actively listening (not paused/cancelled)
        if (stateRef.current === "listening") {
          updateState("completed");
        }
      };

      recognitionRef.current = rec;

      try {
        rec.start();
      } catch (err) {
        console.error("[useSpeechRecognition] start() error:", err);
      }
    },
    [destroyRecognition, updateState, buildFullText, onTranscriptChange, onError]
  );

  // ── Public API ──────────────────────────────────────────────────────────

  const startSpeech = useCallback(
    (lang?: string) => {
      if (!isSupported) {
        const msg =
          "Your browser does not support Speech Recognition. Please use Chrome, Edge, or Android Chrome.";
        setErrorMessage(msg);
        updateState("error");
        onError?.(msg);
        return;
      }
      accumulatedRef.current = "";
      initAndStart(lang);
    },
    [isSupported, initAndStart, updateState, onError]
  );

  const stopSpeech = useCallback(() => {
    if (!recognitionRef.current) return;
    updateState("processing");
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    // Transition to completed after brief processing window
    setTimeout(() => {
      if (stateRef.current === "processing") {
        updateState("completed");
      }
    }, 500);
  }, [updateState]);

  const pauseSpeech = useCallback(() => {
    if (stateRef.current !== "listening") return;
    updateState("paused");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, [updateState]);

  const resumeSpeech = useCallback(() => {
    if (stateRef.current !== "paused") return;
    initAndStart();
  }, [initAndStart]);

  const cancelSpeech = useCallback(() => {
    destroyRecognition();
    accumulatedRef.current = "";
    prefixRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setErrorMessage(null);
    updateState("idle");
    onTranscriptChange?.("");
  }, [destroyRecognition, updateState, onTranscriptChange]);

  const retrySpeech = useCallback(() => {
    destroyRecognition();
    accumulatedRef.current = "";
    setErrorMessage(null);
    setInterimTranscript("");
    updateState("idle");
    // Small delay so state settles before re-init
    setTimeout(() => initAndStart(), 120);
  }, [destroyRecognition, updateState, initAndStart]);

  const clearTranscript = useCallback(() => {
    accumulatedRef.current = "";
    prefixRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    onTranscriptChange?.("");
  }, [onTranscriptChange]);

  const setInitialText = useCallback((text: string) => {
    prefixRef.current = text.trim();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyRecognition();
    };
  }, [destroyRecognition]);

  return {
    state,
    transcript,
    interimTranscript,
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
  };
}

"use client";
import { useState, useRef, useEffect } from "react";
import { Send, ChevronLeft, Thermometer } from "lucide-react";
import type { Message, Conversation } from "@/hooks/useChat";
import type { ModelResource } from "@/lib/api";
import MessageBubble from "./MessageBubble";

interface Props {
  conversation: Conversation;
  messages: Message[];
  isStreaming: boolean;
  lmstudioModels: ModelResource[];
  onSendMessage: (modelKey: string, message: string, temperature: number, onToken?: (t: string) => void) => Promise<void>;
  onBack?: () => void;  // mobile back button
}

export default function ChatWindow({
  conversation,
  messages,
  isStreaming,
  lmstudioModels,
  onSendMessage,
  onBack,
}: Props) {
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput("");
    await onSendMessage(conversation.model_key, msg, temperature);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--ieq-bg)" }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-3 pt-safe"
        style={{ background: "var(--ieq-surface)", borderBottom: "1px solid var(--ieq-border)" }}
      >
        {/* Back button (mobile only via prop) */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 pressable"
            style={{ background: "var(--ieq-card)" }}
          >
            <ChevronLeft size={20} style={{ color: "var(--ieq-text)" }} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{conversation.title}</h2>
          <p className="text-[11px]" style={{ color: "var(--ieq-dim)" }}>
            {conversation.model_key.split("/").pop()}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg pressable"
          style={{
            background: showSettings ? "var(--ieq-accent-glow)" : "var(--ieq-card)",
            border: `1px solid ${showSettings ? "var(--ieq-accent)" : "var(--ieq-border)"}`,
            color: "var(--ieq-dim)",
          }}
        >
          <Thermometer size={13} style={{ color: showSettings ? "var(--ieq-accent)" : "var(--ieq-dim)" }} />
          <span className="text-xs" style={{ color: showSettings ? "var(--ieq-accent)" : "var(--ieq-dim)" }}>
            {temperature.toFixed(1)}
          </span>
        </button>
      </div>

      {/* Temperature panel */}
      {showSettings && (
        <div
          className="px-4 py-3 flex items-center gap-3 fade-in"
          style={{ background: "var(--ieq-card)", borderBottom: "1px solid var(--ieq-border)" }}
        >
          <span className="text-xs" style={{ color: "var(--ieq-dim)" }}>Temperature</span>
          <input
            type="range"
            min="0" max="1" step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            disabled={isStreaming}
            className="flex-1 accent-[var(--ieq-accent)]"
          />
          <span className="text-xs font-mono w-6 text-right" style={{ color: "var(--ieq-text)" }}>
            {temperature.toFixed(1)}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3"
        style={{ paddingBottom: "calc(var(--composer-height) + 16px)" }}>
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16"
            style={{ color: "var(--ieq-muted)" }}>
            <p className="text-sm">Start the conversation...</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
              style={{ background: "var(--ieq-card)" }}>
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--ieq-accent)" }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--ieq-accent)" }} />
              <div className="w-1.5 h-1.5 rounded-full typing-dot" style={{ background: "var(--ieq-accent)" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div
        className="px-3 py-2 pb-safe"
        style={{
          background: "rgba(17,17,24,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--ieq-border)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Message..."
              disabled={isStreaming}
              rows={1}
              className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none disabled:opacity-50"
              style={{
                background: "var(--ieq-card)",
                color: "var(--ieq-text)",
                border: "1px solid var(--ieq-border)",
                lineHeight: "1.4",
                maxHeight: 120,
                overflowY: "auto",
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 pressable disabled:opacity-40"
            style={{
              background: input.trim() && !isStreaming ? "var(--ieq-accent)" : "var(--ieq-card)",
              border: `1px solid ${input.trim() && !isStreaming ? "var(--ieq-accent)" : "var(--ieq-border)"}`,
              transition: "background 0.15s",
            }}
          >
            <Send size={16} style={{ color: input.trim() && !isStreaming ? "#fff" : "var(--ieq-muted)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

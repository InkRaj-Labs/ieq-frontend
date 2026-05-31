"use client";
import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Plus, X, ChevronLeft, MoreVertical } from "lucide-react";
import { listConversations, createConversation, getConversation } from "@/lib/api";
import { useChatConversation } from "@/hooks/useChat";
import ChatWindow from "./ChatWindow";

export default function ChatSection() {
  const { data: convList, mutate: mutateList } = useSWR("/ieq/conversations", listConversations, {
    refreshInterval: 5000,
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");

  const {
    messages,
    isStreaming,
    currentConversation,
    setCurrentConversation,
    sendMessage,
    lmstudioModels,
  } = useChatConversation(selectedId ?? undefined);

  const defaultModel = lmstudioModels[0]?.key ?? "";

  useEffect(() => {
    if (selectedId && !currentConversation) {
      getConversation(selectedId).then(setCurrentConversation);
    }
  }, [selectedId, currentConversation]);

  const handleNewChat = async () => {
    if (!title.trim() || !defaultModel) return;
    try {
      const conv = await createConversation(title, "lmstudio", defaultModel);
      setTitle("");
      setIsCreating(false);
      setShowDrawer(false);
      mutateList();
      setSelectedId(conv.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleSelectConv = (id: number) => {
    setSelectedId(id);
    setShowDrawer(false);
  };

  // Mobile: show chat window full-screen when conversation selected
  // Show drawer when no conv selected or user opens it
  const showChatView = selectedId && currentConversation;

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ===== DESKTOP: Conversations Sidebar ===== */}
      <div
        style={{ background: "var(--ieq-surface)", borderRight: "1px solid var(--ieq-border)" }}
        className="hidden md:flex md:w-64 flex-col"
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--ieq-border)" }}>
          <button
            onClick={() => setIsCreating(!isCreating)}
            style={{
              background: isCreating ? "var(--ieq-accent)" : "var(--ieq-card)",
              color: isCreating ? "#fff" : "var(--ieq-text)",
            }}
            className="w-full py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium pressable"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {isCreating && (
          <div className="p-3 border-b" style={{ borderColor: "var(--ieq-border)" }}>
            <input
              autoFocus
              placeholder="Chat title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNewChat()}
              style={{ background: "var(--ieq-card)", color: "var(--ieq-text)", borderColor: "var(--ieq-border)" }}
              className="w-full px-3 py-2 rounded-xl text-sm border mb-2 outline-none focus:border-[var(--ieq-accent)]"
            />
            <div className="flex gap-2">
              <button onClick={handleNewChat} disabled={!title.trim()}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 pressable"
                style={{ background: "var(--ieq-accent)", color: "#fff" }}>
                Create
              </button>
              <button onClick={() => { setTitle(""); setIsCreating(false); }}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium pressable"
                style={{ background: "var(--ieq-card)", color: "var(--ieq-dim)" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {convList?.conversations.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedId(conv.id)}
              className="w-full text-left px-4 py-3 text-sm transition-colors pressable"
              style={{
                background: selectedId === conv.id ? "var(--ieq-card)" : "transparent",
                borderLeft: `3px solid ${selectedId === conv.id ? "var(--ieq-accent)" : "transparent"}`,
                color: selectedId === conv.id ? "var(--ieq-text)" : "var(--ieq-dim)",
              }}>
              <div className="truncate font-medium">{conv.title}</div>
              <div className="text-[11px] opacity-60">{conv.model_key.split("/").pop()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ===== MOBILE: Full-screen chat OR conversation list ===== */}
      <div className="flex-1 flex flex-col overflow-hidden md:hidden">
        {showChatView ? (
          // Mobile chat window with back button
          <ChatWindow
            conversation={currentConversation}
            messages={messages}
            isStreaming={isStreaming}
            lmstudioModels={lmstudioModels}
            onSendMessage={sendMessage}
            onBack={() => { setSelectedId(null); setCurrentConversation(null); }}
          />
        ) : (
          // Mobile conversation list
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className="px-4 pt-safe pt-4 pb-3 flex items-center justify-between"
              style={{ background: "var(--ieq-surface)", borderBottom: "1px solid var(--ieq-border)" }}
            >
              <h1 className="text-xl font-bold">Chats</h1>
              <button
                onClick={() => setIsCreating(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center pressable"
                style={{ background: "var(--ieq-accent)" }}
              >
                <Plus size={18} color="#fff" />
              </button>
            </div>

            {/* New chat form — mobile bottom sheet style */}
            {isCreating && (
              <div
                className="p-4 border-b sheet-overlay"
                style={{ background: "var(--ieq-card)", borderBottom: "1px solid var(--ieq-border)" }}
              >
                <p className="text-sm font-semibold mb-3">New Conversation</p>
                <input
                  autoFocus
                  placeholder="Give this chat a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNewChat()}
                  style={{ background: "var(--ieq-surface)", color: "var(--ieq-text)", borderColor: "var(--ieq-border)" }}
                  className="w-full px-4 py-3 rounded-xl text-sm border mb-3 outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleNewChat} disabled={!title.trim()}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 pressable"
                    style={{ background: "var(--ieq-accent)", color: "#fff" }}>
                    Start Chat
                  </button>
                  <button onClick={() => { setTitle(""); setIsCreating(false); }}
                    className="w-12 rounded-xl flex items-center justify-center pressable"
                    style={{ background: "var(--ieq-surface)", border: "1px solid var(--ieq-border)" }}>
                    <X size={18} style={{ color: "var(--ieq-dim)" }} />
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "var(--nav-height)" }}>
              {!convList?.conversations.length ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8" style={{ color: "var(--ieq-muted)" }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--ieq-card)" }}>
                    <Plus size={28} style={{ color: "var(--ieq-accent)" }} />
                  </div>
                  <p className="text-sm text-center">No chats yet.<br/>Tap + to start a conversation.</p>
                </div>
              ) : (
                convList.conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    className="w-full text-left px-4 py-4 flex items-center gap-3 pressable"
                    style={{ borderBottom: "1px solid var(--ieq-border)" }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                      style={{ background: "var(--ieq-accent-glow)", color: "var(--ieq-accent)" }}
                    >
                      {conv.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ieq-muted)" }}>
                        {conv.model_key.split("/").pop()}
                      </p>
                    </div>
                    <ChevronLeft size={16} style={{ color: "var(--ieq-muted)", transform: "rotate(180deg)" }} />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== DESKTOP: Chat window ===== */}
      {showChatView ? (
        <div className="hidden md:flex flex-1">
          <ChatWindow
            conversation={currentConversation}
            messages={messages}
            isStreaming={isStreaming}
            lmstudioModels={lmstudioModels}
            onSendMessage={sendMessage}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-4 gap-3"
          style={{ color: "var(--ieq-muted)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--ieq-card)" }}>
            <Plus size={28} style={{ color: "var(--ieq-accent)" }} />
          </div>
          <p className="text-sm text-center">
            {convList?.conversations.length === 0
              ? "No conversations yet. Create one to start."
              : "Select a conversation or create a new one."}
          </p>
        </div>
      )}
    </div>
  );
}

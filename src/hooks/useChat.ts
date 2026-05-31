"use client";
import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { getCapabilities, streamChat } from "@/lib/api";

export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  model_snapshot: any;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  connector_id: string;
  model_key: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export function useChatConversation(convId?: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const { data: caps } = useSWR("/ieq/capabilities", getCapabilities);

  const lmstudioModels = caps?.services.find(s => s.service_id === "lmstudio")?.models ?? [];

  const sendMessage = useCallback(
    async (
      modelKey: string,
      userMessage: string,
      temperature: number = 0.7,
      onToken: (token: string) => void = () => {},
    ) => {
      if (!userMessage.trim() || isStreaming) return;

      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "user",
          content: userMessage,
          model_snapshot: { model: modelKey },
          created_at: new Date().toISOString(),
        },
      ]);

      let accumulatedResponse = "";
      try {
        for await (const chunk of streamChat({
          model_key: modelKey,
          message: userMessage,
          conversation_id: convId,
          temperature,
          stream: true,
        })) {
          const text = chunk.toString();
          accumulatedResponse += text;
          onToken(text);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: accumulatedResponse,
            model_snapshot: { model: modelKey },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Chat error:", err);
      } finally {
        setIsStreaming(false);
      }
    },
    [convId, isStreaming],
  );

  return {
    messages,
    isStreaming,
    currentConversation,
    setCurrentConversation,
    sendMessage,
    lmstudioModels,
  };
}

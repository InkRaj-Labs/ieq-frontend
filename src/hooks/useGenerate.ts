"use client";
import { useState, useCallback } from "react";
import useSWR from "swr";
import { getCapabilities, generate, getGeneration } from "@/lib/api";

export interface Generation {
  id: number;
  connector_id: string;
  model_key: string;
  prompt: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  image_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useGenerate() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const { data: caps } = useSWR("/ieq/capabilities", getCapabilities);

  const swarmModels = caps?.services.find(s => s.service_id === "swarmui")?.models ?? [];
  const swarmLoras = caps?.services.find(s => s.service_id === "swarmui")?.loras ?? [];

  const startGeneration = useCallback(
    async (
      modelKey: string,
      prompt: string,
      negativePrompt?: string,
      options?: { width?: number; height?: number; steps?: number; seed?: number; loras?: string },
    ) => {
      try {
        const result = await generate({
          model_key: modelKey,
          prompt,
          negative_prompt: negativePrompt || "",
          width: options?.width ?? 1024,
          height: options?.height ?? 1024,
          steps: options?.steps ?? 20,
          seed: options?.seed ?? -1,
          loras: options?.loras,
        });

        const gen: Generation = {
          id: result.generation_id,
          connector_id: "swarmui",
          model_key: modelKey,
          prompt,
          status: "queued",
          image_path: null,
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setGenerations((prev) => [gen, ...prev]);

        // Poll status
        pollGeneration(result.generation_id);
        return gen;
      } catch (err) {
        console.error("Generation error:", err);
        throw err;
      }
    },
    [],
  );

  const pollGeneration = useCallback((genId: number) => {
    const interval = setInterval(async () => {
      try {
        const updated = await getGeneration(genId);
        setGenerations((prev) =>
          prev.map((g) => (g.id === genId ? updated : g)),
        );
        if (["completed", "cancelled", "failed"].includes(updated.status)) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Poll error:", err);
        clearInterval(interval);
      }
    }, 1000);
  }, []);

  return {
    generations,
    startGeneration,
    swarmModels,
    swarmLoras,
  };
}

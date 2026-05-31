"use client";
import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { useGenerate } from "@/hooks/useGenerate";
import { imageUrl } from "@/lib/api";
import GenerationForm from "./GenerationForm";
import GenerationCard from "./GenerationCard";

export default function ImagesSection() {
  const { generations, startGeneration, swarmModels, swarmLoras } = useGenerate();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleGenerate = async (modelKey: string, prompt: string, negativePrompt: string, options: any) => {
    try {
      await startGeneration(modelKey, prompt, negativePrompt, options);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Generation failed:", err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--ieq-bg)" }}>
      {/* Header */}
      <div
        className="px-4 pt-safe pt-4 pb-3 flex items-center justify-between"
        style={{ background: "var(--ieq-surface)", borderBottom: "1px solid var(--ieq-border)" }}
      >
        <h1 className="text-xl font-bold">Images</h1>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold pressable"
          style={{
            background: isFormOpen ? "var(--ieq-card)" : "var(--ieq-accent)",
            color: isFormOpen ? "var(--ieq-dim)" : "#fff",
            border: isFormOpen ? "1px solid var(--ieq-border)" : "none",
          }}
        >
          {isFormOpen ? <X size={16} /> : <Plus size={16} />}
          {isFormOpen ? "Close" : "Generate"}
        </button>
      </div>

      {/* Generation Form — slide down sheet */}
      {isFormOpen && (
        <div className="sheet-overlay" style={{ background: "var(--ieq-card)", borderBottom: "1px solid var(--ieq-border)" }}>
          <GenerationForm
            models={swarmModels}
            loras={swarmLoras}
            onGenerate={handleGenerate}
            onClose={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-4" style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}>
        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4"
            style={{ color: "var(--ieq-muted)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--ieq-card)" }}>
              <Sparkles size={28} style={{ color: "var(--ieq-accent)" }} />
            </div>
            <p className="text-sm text-center">No images yet.<br/>Tap Generate to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {generations.map((gen) => (
              <GenerationCard key={gen.id} generation={gen} imageUrl={imageUrl(gen.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

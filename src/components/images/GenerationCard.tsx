"use client";
import { Download, X } from "lucide-react";
import type { Generation } from "@/hooks/useGenerate";
import { cancelGeneration } from "@/lib/api";

interface Props {
  generation: Generation;
  imageUrl: string;
}

const STATUS_COLOR: Record<string, string> = {
  queued:    "var(--ieq-muted)",
  running:   "var(--ieq-accent)",
  completed: "var(--ieq-online)",
  cancelled: "var(--ieq-offline)",
  failed:    "var(--ieq-offline)",
};

export default function GenerationCard({ generation, imageUrl }: Props) {
  const handleCancel = async () => {
    if (confirm("Cancel this generation?")) {
      await cancelGeneration(generation.id);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `ieq-${generation.id}.png`;
    a.click();
  };

  const isPending = ["queued", "running"].includes(generation.status);

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--ieq-card)", border: "1px solid var(--ieq-border)" }}
    >
      {/* Image area */}
      <div className="relative aspect-square" style={{ background: "var(--ieq-surface)" }}>
        {generation.image_path ? (
          <img src={imageUrl} alt={generation.prompt} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {isPending ? (
              <>
                <div
                  className="w-8 h-8 border-2 rounded-full animate-spin"
                  style={{ borderColor: "var(--ieq-border)", borderTopColor: "var(--ieq-accent)" }}
                />
                <p className="text-[10px] capitalize" style={{ color: "var(--ieq-dim)" }}>
                  {generation.status}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-center px-3" style={{ color: "var(--ieq-muted)" }}>
                {generation.error_message || "Failed"}
              </p>
            )}
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: STATUS_COLOR[generation.status] }}
          />
        </div>

        {/* Cancel overlay for pending */}
        {isPending && (
          <button
            onClick={handleCancel}
            className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center pressable"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <X size={12} color="#fff" />
          </button>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-3">
        <p className="text-[11px] line-clamp-2 mb-2" style={{ color: "var(--ieq-dim)" }}>
          {generation.prompt}
        </p>
        {generation.status === "completed" && (
          <button
            onClick={handleDownload}
            className="w-full py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 pressable"
            style={{ background: "var(--ieq-accent-glow)", color: "var(--ieq-accent)", border: "1px solid rgba(124,106,247,0.3)" }}
          >
            <Download size={12} />
            Download
          </button>
        )}
      </div>
    </div>
  );
}

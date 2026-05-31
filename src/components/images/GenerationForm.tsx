"use client";
import { useState } from "react";
import type { ModelResource, LoRAResource } from "@/lib/api";

interface Props {
  models: ModelResource[];
  loras: LoRAResource[];
  onGenerate: (modelKey: string, prompt: string, negPrompt: string, options: any) => Promise<void>;
  onClose: () => void;
}

export default function GenerationForm({ models, loras, onGenerate, onClose }: Props) {
  const [modelKey, setModelKey] = useState(models[0]?.key || "");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(20);
  const [seed, setSeed] = useState(-1);
  const [selectedLoras, setSelectedLoras] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const lorasString = selectedLoras.length > 0
    ? selectedLoras.map(lora => `<lora:${lora}:0.8>`).join(" ")
    : "";

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      await onGenerate(modelKey, prompt, negativePrompt, {
        width, height, steps, seed: seed === -1 ? -1 : seed,
        loras: lorasString || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const label = (text: string) => (
    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--ieq-dim)" }}>{text}</label>
  );

  const input = "w-full px-4 py-3 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--ieq-surface)", color: "var(--ieq-text)", border: "1px solid var(--ieq-border)" };

  return (
    <div className="px-4 py-4 max-h-[60vh] overflow-y-auto">
      <div className="space-y-4 max-w-2xl">

        {/* Model */}
        {models.length > 0 && (
          <div>
            {label("Model")}
            <select value={modelKey} onChange={(e) => setModelKey(e.target.value)}
              className={input} style={inputStyle}>
              {models.map((m) => (
                <option key={m.key} value={m.key}>{m.display_name}{m.loaded ? " ✓" : ""}</option>
              ))}
            </select>
          </div>
        )}

        {/* Prompt */}
        <div>
          {label("Prompt")}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to generate..."
            rows={3}
            className={`${input} resize-none`}
            style={inputStyle}
          />
        </div>

        {/* Negative */}
        <div>
          {label("Negative Prompt")}
          <input value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="blurry, low quality, artifacts..."
            className={input} style={inputStyle} />
        </div>

        {/* LoRAs */}
        {loras.length > 0 && (
          <div>
            {label("LoRAs")}
            <div className="flex flex-wrap gap-2">
              {loras.map((lora) => (
                <button key={lora.key}
                  onClick={() => setSelectedLoras(prev =>
                    prev.includes(lora.key) ? prev.filter(l => l !== lora.key) : [...prev, lora.key]
                  )}
                  className="px-3 py-1.5 rounded-full text-xs font-medium pressable"
                  style={{
                    background: selectedLoras.includes(lora.key) ? "var(--ieq-accent)" : "var(--ieq-surface)",
                    color: selectedLoras.includes(lora.key) ? "#fff" : "var(--ieq-dim)",
                    border: `1px solid ${selectedLoras.includes(lora.key) ? "var(--ieq-accent)" : "var(--ieq-border)"}`,
                  }}>
                  {lora.display_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Size presets */}
        <div>
          {label("Size")}
          <div className="grid grid-cols-3 gap-2">
            {[["Square", 1024, 1024], ["Portrait", 768, 1024], ["Landscape", 1024, 768]].map(([name, w, h]) => (
              <button key={name as string}
                onClick={() => { setWidth(w as number); setHeight(h as number); }}
                className="py-2 rounded-xl text-xs font-medium pressable"
                style={{
                  background: width === w && height === h ? "var(--ieq-accent-glow)" : "var(--ieq-surface)",
                  color: width === w && height === h ? "var(--ieq-accent)" : "var(--ieq-dim)",
                  border: `1px solid ${width === w && height === h ? "var(--ieq-accent)" : "var(--ieq-border)"}`,
                }}>
                {name}<br/>
                <span className="opacity-60 text-[10px]">{w}×{h}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div>
          {label(`Steps: ${steps}`)}
          <input type="range" min="1" max="100" value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="w-full accent-[var(--ieq-accent)]" />
          <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--ieq-muted)" }}>
            <span>1 (fast)</span><span>50 (balanced)</span><span>100 (quality)</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="w-full py-4 rounded-2xl text-sm font-bold disabled:opacity-40 pressable"
          style={{ background: "var(--ieq-accent)", color: "#fff" }}
        >
          {isLoading ? "Queuing..." : "✦ Generate Image"}
        </button>
      </div>
    </div>
  );
}

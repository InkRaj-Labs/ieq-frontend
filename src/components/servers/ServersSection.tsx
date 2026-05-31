"use client";
import useSWR from "swr";
import { getServices, rediscover } from "@/lib/api";
import { RefreshCw, Zap, Server } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  online:   "var(--ieq-online)",
  offline:  "var(--ieq-offline)",
  degraded: "var(--ieq-degraded)",
};
const STATUS_BG: Record<string, string> = {
  online:   "rgba(34,197,94,0.1)",
  offline:  "rgba(239,68,68,0.1)",
  degraded: "rgba(245,158,11,0.1)",
};

export default function ServersSection() {
  const { data, mutate } = useSWR("/ieq/services", getServices, { refreshInterval: 15000 });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--ieq-bg)" }}>
      {/* Header */}
      <div
        className="px-4 pt-safe pt-4 pb-3"
        style={{ background: "var(--ieq-surface)", borderBottom: "1px solid var(--ieq-border)" }}
      >
        <h1 className="text-xl font-bold">Servers</h1>
        {data && (
          <p className="text-xs mt-0.5" style={{ color: "var(--ieq-muted)" }}>
            {data.services.filter(s => s.status === "online").length} of {data.services.length} online
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}>
        {!data?.services.length && (
          <div className="flex flex-col items-center justify-center py-16 gap-3"
            style={{ color: "var(--ieq-muted)" }}>
            <Server size={32} />
            <p className="text-sm">Discovering services...</p>
          </div>
        )}
        {data?.services.map(svc => (
          <div
            key={svc.service_id}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--ieq-card)", border: "1px solid var(--ieq-border)" }}
          >
            {/* Service header */}
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${svc.status === "online" ? "pulse-ring" : ""}`}
                  style={{ background: STATUS_COLOR[svc.status] ?? "var(--ieq-muted)" }}
                />
                <div>
                  <p className="font-semibold text-sm">{svc.display_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ieq-muted)" }}>
                    {svc.models.length} model{svc.models.length !== 1 ? "s" : ""}
                    {svc.loras.length > 0 ? ` · ${svc.loras.length} LoRA${svc.loras.length !== 1 ? "s" : ""}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize font-semibold"
                  style={{
                    background: STATUS_BG[svc.status] ?? "var(--ieq-surface)",
                    color: STATUS_COLOR[svc.status] ?? "var(--ieq-muted)",
                  }}
                >
                  {svc.status}
                </span>
                <button
                  onClick={() => rediscover(svc.service_id).then(() => mutate())}
                  className="w-8 h-8 rounded-xl flex items-center justify-center pressable"
                  style={{ background: "var(--ieq-surface)" }}
                  title="Rediscover"
                >
                  <RefreshCw size={14} style={{ color: "var(--ieq-dim)" }} />
                </button>
              </div>
            </div>

            {/* Capabilities */}
            {Object.keys(svc.capabilities).length > 0 && (
              <div
                className="px-4 py-2 flex flex-wrap gap-1.5"
                style={{ background: "var(--ieq-surface)", borderTop: "1px solid var(--ieq-border)" }}
              >
                {Object.keys(svc.capabilities).map(cap => (
                  <span
                    key={cap}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "var(--ieq-accent-glow)", color: "var(--ieq-accent)" }}
                  >
                    {cap}
                  </span>
                ))}
              </div>
            )}

            {/* Models list (collapsed on mobile, shown if short) */}
            {svc.models.length > 0 && svc.models.length <= 3 && (
              <div
                className="px-4 py-2 flex flex-col gap-1"
                style={{ borderTop: "1px solid var(--ieq-border)" }}
              >
                {svc.models.map((m: any) => (
                  <div key={m.key || m} className="flex items-center gap-2">
                    <Zap size={10} style={{ color: "var(--ieq-accent)" }} />
                    <span className="text-[11px] truncate" style={{ color: "var(--ieq-dim)" }}>
                      {(m.key || m).split("/").pop()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {svc.models.length > 3 && (
              <div
                className="px-4 py-2"
                style={{ borderTop: "1px solid var(--ieq-border)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--ieq-muted)" }}>
                  +{svc.models.length} models available
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

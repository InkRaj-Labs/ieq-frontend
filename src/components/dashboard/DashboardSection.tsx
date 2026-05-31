"use client";
import useSWR from "swr";
import { MessageSquare, Image, Server, Activity, Zap, ChevronRight, RefreshCw, Cpu } from "lucide-react";
import { getHealth, getServices, getActivity, getCapabilities } from "@/lib/api";
import type { Section } from "@/app/page";

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className="flex-1 flex flex-col gap-1 rounded-2xl p-4"
      style={{
        background: accent ? "var(--ieq-accent-glow)" : "var(--ieq-card)",
        border: `1px solid ${accent ? "var(--ieq-accent)" : "var(--ieq-border)"}`,
      }}
    >
      <Icon size={18} style={{ color: accent ? "var(--ieq-accent)" : "var(--ieq-dim)" }} />
      <span className="text-2xl font-bold" style={{ color: "var(--ieq-text)" }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--ieq-muted)" }}>{label}</span>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl pressable"
      style={{ background: "var(--ieq-card)", border: "1px solid var(--ieq-border)" }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "var(--ieq-accent-glow)" }}
      >
        <Icon size={18} style={{ color: "var(--ieq-accent)" }} />
      </div>
      <span className="text-xs font-medium" style={{ color: "var(--ieq-dim)" }}>{label}</span>
    </button>
  );
}

function ServiceRow({ svc }: { svc: any }) {
  const isOnline = svc.status === "online";
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--ieq-border)" }}>
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? "pulse-ring" : ""}`}
        style={{
          background: isOnline ? "var(--ieq-online)"
            : svc.status === "degraded" ? "var(--ieq-degraded)"
            : "var(--ieq-offline)",
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{svc.display_name}</p>
        <p className="text-xs" style={{ color: "var(--ieq-muted)" }}>
          {svc.models.length} model{svc.models.length !== 1 ? "s" : ""}
        </p>
      </div>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
        style={{
          background: isOnline ? "rgba(34,197,94,0.12)"
            : svc.status === "degraded" ? "rgba(245,158,11,0.12)"
            : "rgba(239,68,68,0.12)",
          color: isOnline ? "var(--ieq-online)"
            : svc.status === "degraded" ? "var(--ieq-degraded)"
            : "var(--ieq-offline)",
        }}
      >
        {svc.status}
      </span>
    </div>
  );
}

export default function DashboardSection({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { data: health } = useSWR("/ieq/health", getHealth, { refreshInterval: 10000 });
  const { data: services } = useSWR("/ieq/services", getServices, { refreshInterval: 15000 });
  const { data: activity } = useSWR("/ieq/activity", getActivity, { refreshInterval: 5000 });
  const { data: caps } = useSWR("/ieq/capabilities", getCapabilities, { refreshInterval: 30000 });

  const totalModels = caps?.services.reduce((acc, s) => acc + s.models.length, 0) ?? 0;
  const onlineCount = services?.services.filter(s => s.status === "online").length ?? 0;
  const totalServices = services?.services.length ?? 0;
  const recentEvents = activity?.events.slice(0, 5) ?? [];

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(var(--nav-height) + 16px)" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--ieq-accent)" }}>IEQ COMMAND CENTER</p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--ieq-text)" }}>Dashboard</h1>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: health ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${health ? "var(--ieq-online)" : "var(--ieq-offline)"}`,
            }}
          >
            <Zap
              size={14}
              style={{ color: health ? "var(--ieq-online)" : "var(--ieq-offline)" }}
            />
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--ieq-muted)" }}>
          {health ? `System operational` : "Connecting..."}
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-4 mb-5">
        <StatCard icon={Server} label="Services" value={`${onlineCount}/${totalServices}`} accent={onlineCount === totalServices && totalServices > 0} />
        <StatCard icon={Cpu} label="Models" value={totalModels} />
        <StatCard icon={Activity} label="Events" value={recentEvents.length} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ieq-muted)" }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-4 gap-2">
          <QuickAction icon={MessageSquare} label="New Chat" onClick={() => onNavigate("chat")} />
          <QuickAction icon={Image} label="Generate" onClick={() => onNavigate("images")} />
          <QuickAction icon={Activity} label="Activity" onClick={() => onNavigate("activity")} />
          <QuickAction icon={Server} label="Servers" onClick={() => onNavigate("servers")} />
        </div>
      </div>

      {/* Services */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ieq-muted)" }}>
            Services
          </p>
          <button
            onClick={() => onNavigate("servers")}
            className="flex items-center gap-0.5 text-xs pressable"
            style={{ color: "var(--ieq-accent)" }}
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
        <div
          className="rounded-2xl px-4"
          style={{ background: "var(--ieq-card)", border: "1px solid var(--ieq-border)" }}
        >
          {services?.services.length ? (
            services.services.map((svc, i) => (
              <ServiceRow key={svc.service_id} svc={svc} />
            ))
          ) : (
            <div className="py-6 flex flex-col items-center gap-2" style={{ color: "var(--ieq-muted)" }}>
              <RefreshCw size={20} />
              <p className="text-xs">Discovering services...</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ieq-muted)" }}>
            Recent Activity
          </p>
          <button
            onClick={() => onNavigate("activity")}
            className="flex items-center gap-0.5 text-xs pressable"
            style={{ color: "var(--ieq-accent)" }}
          >
            See all <ChevronRight size={12} />
          </button>
        </div>
        <div
          className="rounded-2xl px-4"
          style={{ background: "var(--ieq-card)", border: "1px solid var(--ieq-border)" }}
        >
          {recentEvents.length === 0 ? (
            <div className="py-6 flex flex-col items-center gap-2" style={{ color: "var(--ieq-muted)" }}>
              <Activity size={20} />
              <p className="text-xs">No recent activity</p>
            </div>
          ) : (
            recentEvents.map((ev, i) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 py-3"
                style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid var(--ieq-border)" : "none" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--ieq-accent-glow)" }}
                >
                  <Zap size={12} style={{ color: "var(--ieq-accent)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{ev.title}</p>
                  <p className="text-[11px]" style={{ color: "var(--ieq-muted)" }}>{ev.service_id}</p>
                </div>
                <span className="text-[11px] flex-shrink-0" style={{ color: "var(--ieq-muted)" }}>
                  {fmt(ev.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

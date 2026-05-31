"use client";
import { Home, MessageSquare, Image, Activity, Server } from "lucide-react";
import type { Section } from "@/app/page";
import useSWR from "swr";
import { getHealth } from "@/lib/api";

const NAV = [
  { id: "home"     as Section, icon: Home,          label: "Home"     },
  { id: "chat"     as Section, icon: MessageSquare, label: "Chat"     },
  { id: "images"   as Section, icon: Image,         label: "Images"   },
  { id: "activity" as Section, icon: Activity,      label: "Activity" },
  { id: "servers"  as Section, icon: Server,        label: "Servers"  },
];

export default function Sidebar({ active, onChange }: {
  active: Section; onChange: (s: Section) => void;
}) {
  const { data } = useSWR("/ieq/health", getHealth, { refreshInterval: 15000 });
  const allOnline = data
    ? Object.values(data.services).every(s => s === "online")
    : null;

  return (
    <aside
      style={{ background: "var(--ieq-surface)", borderRight: "1px solid var(--ieq-border)" }}
      className="w-16 flex flex-col items-center py-4 gap-1"
    >
      {/* Logo */}
      <div className="mb-4 font-black text-xs tracking-widest" style={{ color: "var(--ieq-accent)" }}>
        IEQ
      </div>

      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={label}
          style={{
            background: active === id ? "var(--ieq-accent-glow)" : "transparent",
            color: active === id ? "var(--ieq-accent)" : "var(--ieq-dim)",
            borderRadius: "10px",
          }}
          className="w-11 h-11 flex items-center justify-center transition-all pressable hover:opacity-100"
        >
          <Icon size={18} strokeWidth={active === id ? 2.2 : 1.8} />
        </button>
      ))}

      {/* Status dot */}
      <div className="mt-auto">
        <div
          className={`w-2 h-2 rounded-full ${allOnline ? "pulse-ring" : ""}`}
          style={{
            background: allOnline === null
              ? "var(--ieq-muted)"
              : allOnline ? "var(--ieq-online)" : "var(--ieq-offline)",
          }}
        />
      </div>
    </aside>
  );
}

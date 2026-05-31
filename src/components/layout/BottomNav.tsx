"use client";
import { Home, MessageSquare, Image, Activity, Server } from "lucide-react";
import type { Section } from "@/app/page";

const NAV = [
  { id: "home"     as Section, icon: Home,          label: "Home"     },
  { id: "chat"     as Section, icon: MessageSquare, label: "Chat"     },
  { id: "images"   as Section, icon: Image,         label: "Images"   },
  { id: "activity" as Section, icon: Activity,      label: "Feed"     },
  { id: "servers"  as Section, icon: Server,        label: "Servers"  },
];

export default function BottomNav({ active, onChange }: {
  active: Section; onChange: (s: Section) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex pb-safe"
      style={{
        background: "rgba(17,17,24,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--ieq-border)",
        zIndex: 50,
      }}
    >
      {NAV.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 touch-target pressable transition-colors"
            style={{ color: isActive ? "var(--ieq-accent)" : "var(--ieq-muted)" }}
          >
            {/* Active indicator pill */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: 40,
                height: 28,
                borderRadius: 14,
                background: isActive ? "var(--ieq-accent-glow)" : "transparent",
                transition: "background 0.2s",
              }}
            >
              <Icon size={isActive ? 20 : 19} strokeWidth={isActive ? 2.2 : 1.8} />
            </div>
            <span
              className="text-[10px] font-medium"
              style={{
                color: isActive ? "var(--ieq-accent)" : "var(--ieq-muted)",
                transition: "color 0.2s",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

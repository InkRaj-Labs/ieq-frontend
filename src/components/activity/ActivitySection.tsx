"use client";
import useSWR from "swr";
import { getActivity } from "@/lib/api";
import { MessageSquare, Image, Upload, Zap, Bot } from "lucide-react";

const ICON: Record<string, React.ElementType> = {
  chat_message:    MessageSquare,
  image_generated: Image,
  file_uploaded:   Upload,
  agent_run:       Bot,
};

const EVENT_COLOR: Record<string, string> = {
  chat_message:    "var(--ieq-accent)",
  image_generated: "var(--ieq-accent2)",
  file_uploaded:   "var(--ieq-online)",
  agent_run:       "var(--ieq-degraded)",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ActivitySection() {
  const { data } = useSWR("/ieq/activity", getActivity, { refreshInterval: 5000 });
  const events = data?.events ?? [];

  // Group by "today" vs older
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = events.filter(e => new Date(e.created_at).getTime() >= todayStart);
  const older = events.filter(e => new Date(e.created_at).getTime() < todayStart);

  const EventRow = ({ ev }: { ev: any }) => {
    const Icon = ICON[ev.event_type] ?? Zap;
    const color = EVENT_COLOR[ev.event_type] ?? "var(--ieq-accent)";
    return (
      <div className="flex items-center gap-3 px-4 py-3 fade-in"
        style={{ borderBottom: "1px solid var(--ieq-border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{ev.title}</p>
          {ev.service_id && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--ieq-muted)" }}>{ev.service_id}</p>
          )}
        </div>
        <span className="text-[11px] flex-shrink-0" style={{ color: "var(--ieq-muted)" }}>
          {fmt(ev.created_at)}
        </span>
      </div>
    );
  };

  const Section = ({ title, items }: { title: string; items: any[] }) => (
    <>
      <div className="px-4 py-2 sticky top-0" style={{ background: "var(--ieq-bg)" }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ieq-muted)" }}>
          {title}
        </span>
      </div>
      <div style={{ background: "var(--ieq-card)", borderTop: "1px solid var(--ieq-border)" }}>
        {items.map(ev => <EventRow key={ev.id} ev={ev} />)}
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--ieq-bg)" }}>
      {/* Header */}
      <div
        className="px-4 pt-safe pt-4 pb-3"
        style={{ background: "var(--ieq-surface)", borderBottom: "1px solid var(--ieq-border)" }}
      >
        <h1 className="text-xl font-bold">Activity</h1>
        {events.length > 0 && (
          <p className="text-xs mt-0.5" style={{ color: "var(--ieq-muted)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "var(--nav-height)" }}>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-8"
            style={{ color: "var(--ieq-muted)" }}>
            <Zap size={32} />
            <p className="text-sm text-center">No activity yet.<br/>Start a chat or generate an image.</p>
          </div>
        ) : (
          <>
            {today.length > 0 && <Section title="Today" items={today} />}
            {older.length > 0 && <Section title="Earlier" items={older} />}
          </>
        )}
      </div>
    </div>
  );
}

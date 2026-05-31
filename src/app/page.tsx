"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import ChatSection from "@/components/chat/ChatSection";
import ImagesSection from "@/components/images/ImagesSection";
import ServersSection from "@/components/servers/ServersSection";
import ActivitySection from "@/components/activity/ActivitySection";
import DashboardSection from "@/components/dashboard/DashboardSection";

export type Section = "home" | "chat" | "images" | "activity" | "servers";

export default function Home() {
  const [section, setSection] = useState<Section>("home");

  const content: Record<Section, React.ReactNode> = {
    home:     <DashboardSection onNavigate={setSection} />,
    chat:     <ChatSection />,
    images:   <ImagesSection />,
    activity: <ActivitySection />,
    servers:  <ServersSection />,
  };

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--ieq-bg)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar active={section} onChange={setSection} />
      </div>

      {/* Main content — bottom nav offset on mobile */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {content[section]}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav active={section} onChange={setSection} />
      </div>
    </div>
  );
}

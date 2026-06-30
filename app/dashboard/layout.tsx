"use client";
import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileHeader from "@/components/dashboard/MobileHeader";
import DemoBanner from "@/components/dashboard/DemoBanner";
import AuthGuard from "@/components/dashboard/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-[#12121A] text-white overflow-hidden">
        <DemoBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <MobileHeader onOpen={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto dashboard-scroll">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

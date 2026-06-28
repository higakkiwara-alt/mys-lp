import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "Dashboard | Mys AI Salon OS",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#12121A] text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto dashboard-scroll">
        {children}
      </main>
    </div>
  );
}

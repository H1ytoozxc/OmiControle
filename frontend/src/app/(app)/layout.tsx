import * as React from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar }  from "@/components/shell/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <div className="ml-[220px] relative z-10 min-h-screen flex flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

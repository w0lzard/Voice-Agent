"use client";

import { useAuth } from "./AuthProvider";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

// Pages that should NOT show the dashboard shell
const PUBLIC_PATHS = ['/login', '/signup', '/verify', '/forgot-password'];

export default function AppShell({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{background: '#101622'}}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto custom-scrollbar" style={{background: '#101622'}}>
          {children}
        </main>
      </div>
    </div>
  );
}

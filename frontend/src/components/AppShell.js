"use client";

import { useAuth } from "./AuthProvider";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }) {
    const { user } = useAuth();

    if (!user) {
        // Public pages (login, signup, verify) — no shell
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto bg-background-dark">
                    {children}
                </main>
            </div>
        </div>
    );
}

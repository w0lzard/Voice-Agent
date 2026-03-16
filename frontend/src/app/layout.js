import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI Calling Agent — Dashboard",
  description: "AI-powered calling agent dashboard for managing outbound calls, leads, and voice campaigns",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} bg-background-dark font-display text-slate-100 antialiased overflow-x-hidden`}>
        <AuthProvider>
          <WebSocketProvider>
            <AppShell>
              {children}
            </AppShell>
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

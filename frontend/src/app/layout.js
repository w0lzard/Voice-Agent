import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

export const metadata = {
  title: "VoiceAI Platform — Dashboard",
  description: "AI-powered voice calling platform for managing outbound calls, leads, and voice campaigns",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background-dark font-display text-slate-100 antialiased overflow-x-hidden" style={{fontFamily: '"Space Grotesk", sans-serif'}}>
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

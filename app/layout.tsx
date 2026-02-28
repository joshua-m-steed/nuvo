import "./globals.css";
import React from "react";
import { AuthProvider } from "../lib/authClient";
import { ToastProvider } from "../components/toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

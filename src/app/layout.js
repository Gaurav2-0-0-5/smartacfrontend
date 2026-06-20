import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nexaflow Automations | Dashboard",
  description: "Enterprise Smart AC Management Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

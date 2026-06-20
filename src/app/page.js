"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the secure login page
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#EFEFEF] flex flex-col items-center justify-center text-[#1C1C1E] select-none relative">
      <div className="flex flex-col items-center gap-4 z-10">
        <Activity className="w-10 h-10 text-[#FF6B35] animate-pulse" />
        <p className="text-xs font-semibold text-slate-500">Redirecting to login portal...</p>
      </div>
    </div>
  );
}

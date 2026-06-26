"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  Loader2, 
  AlertTriangle,
  Info,
  Cpu,
  Bell,
  CheckCheck
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Tab states: "All", "Alerts", "System"
  const [activeTab, setActiveTab] = useState("All");

  // Dynamic notification list
  const [notifications, setNotifications] = useState([
    {
      notifId: "notif_1",
      title: "High Temperature Warning",
      message: "Room 101 registered an ambient temperature of 28.5°C, exceeding threshold limits.",
      type: "alert",
      time: "10:30 AM",
      isRead: false
    },
    {
      notifId: "notif_2",
      title: "System Update Complete",
      message: "Nexaflow OTA firmware v1.4.2 successfully compiled and installed on floor 2 controllers.",
      type: "system",
      time: "08:15 AM",
      isRead: false
    },
    {
      notifId: "notif_3",
      title: "Schedule Trigger Activated",
      message: "Night Optimization routine successfully broadcasted to Deluxe Suite zones.",
      type: "info",
      time: "Yesterday",
      isRead: true
    }
  ]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. ACQUIRE REAL-TIME NOTIFICATIONS FROM INBOX ENDPOINT
  // =========================================================================
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/notifications`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.notifications || data;
        if (Array.isArray(list) && list.length > 0) {
          setNotifications(list);
        }
      }
    } catch (err) {
      console.warn("Live notifications API not yet online. Using mockup fallbacks.", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // =========================================================================
  // 2. DISPATCH PUT REQUEST TO MARK A NOTIFICATION AS READ (Optimistic State)
  // =========================================================================
  const markAsRead = async (notifId) => {
    // A. Optimistically clear the unread indicator instantly
    setNotifications(prev => 
      prev.map(n => n.notifId === notifId ? { ...n, isRead: true } : n)
    );

    try {
      const token = await getToken();
      if (!token) return;

      await fetch(`${apiUrl}/api/notifications/markRead`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notifId })
      });
    } catch (err) {
      console.error("Mark read API dispatch warning:", err);
    }
  };

  // =========================================================================
  // 3. MARK ALL AS READ HANDLER
  // =========================================================================
  const handleMarkAllRead = async () => {
    const unreadList = notifications.filter(n => !n.isRead);
    if (unreadList.length === 0) return;

    // Optimistically update all to read
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      const token = await getToken();
      if (!token) return;

      await Promise.all(
        unreadList.map(n => 
          fetch(`${apiUrl}/api/notifications/markRead`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ notifId: n.notifId })
          })
        )
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // =========================================================================
  // 4. TIMESTAMPS FORMATTER HELPER
  // =========================================================================
  const formatTime = (timeStr) => {
    try {
      if (!timeStr) return "";
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr; // Fallback for mock labels
      
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24 && now.getDate() === date.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (diffHrs < 48) return "Yesterday";
      return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return timeStr;
    }
  };

  // =========================================================================
  // 5. SEGMENTED FILTER LOGIC
  // =========================================================================
  const filteredNotifications = notifications.filter(item => {
    if (activeTab === "All") return true;
    if (activeTab === "Alerts") return item.type === "alert";
    if (activeTab === "System") return item.type === "system" || item.type === "info";
    return true;
  });

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pt-2 sm:pt-4 pb-16 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* Dynamic ambient backdrop blurs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF6B35]/[0.015] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gray-500/[0.01] rounded-full blur-[100px] pointer-events-none" />

      {/* 1. MOCKUP HEADER ROW (With back navigation button) */}
      <div className="flex items-center justify-between w-full pb-6 z-10">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>

        <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
          Notifications
        </h1>

        {/* Mark All Read Action Button */}
        {hasUnread ? (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[#FF6B35] hover:bg-[#FF6B35]/5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-transparent hover:border-[#FF6B35]/20 active:scale-95"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {/* 2. PILL SEGMENTED CONTROL DECK */}
      <div className="mt-5 bg-white border border-slate-200/50 p-1 rounded-full grid grid-cols-3 gap-1 shadow-sm w-full select-none z-10">
        {["All", "Alerts", "System"].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${
                isActive 
                  ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/15 scale-[1.02]" 
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Secondary Dynamic View Area - Scrollable */}
      <div className="flex-1 overflow-y-auto mt-6 pr-0.5 space-y-3.5 z-10">
        
        {loading ? (
          /* Premium Flashing Skeleton Loader Screen */
          <div className="space-y-3.5 animate-pulse select-none">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-[24px] p-5 flex items-start gap-4 border border-slate-200/50 bg-white/80 shadow-sm relative">
                <div className="w-1.5 absolute top-0 bottom-0 left-0 bg-slate-200 rounded-l-[24px]" />
                <div className="w-10 h-10 rounded-2xl bg-slate-200 shrink-0" />
                <div className="flex-1 flex flex-col space-y-2.5 text-left pr-8">
                  <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
                  <div className="h-2.5 w-full bg-slate-100 rounded-full" />
                  <div className="h-2.5 w-4/5 bg-slate-100 rounded-full" />
                </div>
                <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5">
                  <div className="h-2.5 w-10 bg-slate-200 rounded-full" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const isAlert = notif.type === "alert";
            const isUnread = !notif.isRead;
            
            return (
              <div
                key={notif.notifId}
                onClick={() => isUnread && markAsRead(notif.notifId)}
                className={`group rounded-[24px] p-5 flex items-start gap-4 hover:-translate-y-0.5 border transition-all cursor-pointer relative ${
                  isUnread
                    ? "bg-gradient-to-br from-orange-50/[0.15] to-white border-[#FF6B35]/20 shadow-md shadow-[#FF6B35]/5 hover:border-[#FF6B35]/35"
                    : "bg-white/80 border-slate-200/50 shadow-sm hover:border-slate-350 hover:bg-slate-50/50"
                }`}
              >
                
                {/* Left Colored classification accent bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-[24px] ${
                  isAlert 
                    ? "bg-red-500" 
                    : notif.type === "system" 
                      ? "bg-indigo-500" 
                      : "bg-amber-500"
                }`} />

                {/* Classification icon widget */}
                <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border transition-all group-hover:scale-105 ${
                  isAlert 
                    ? "bg-red-50 border-red-100 text-red-500 group-hover:bg-red-100/40" 
                    : notif.type === "system"
                      ? "bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-100/40"
                      : "bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-100/40"
                }`}>
                  {isAlert ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : notif.type === "system" ? (
                    <Cpu className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                {/* Content Block */}
                <div className="flex-1 flex flex-col min-w-0 pr-8 text-left">
                  <span className={`text-[13px] font-bold transition-colors ${
                    isUnread ? "text-[#1C1C1E]" : "text-slate-700"
                  } group-hover:text-[#FF6B35]`}>
                    {notif.title}
                  </span>
                  <span className={`text-[11px] font-medium leading-relaxed mt-1.5 ${
                    isUnread ? "text-slate-600" : "text-slate-400"
                  }`}>
                    {notif.message}
                  </span>
                </div>

                {/* Time Indicator & Unread Dot */}
                <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5 select-none">
                  <span className="text-[9px] font-bold text-slate-400 tracking-wider">
                    {formatTime(notif.time || notif.createdAt)}
                  </span>
                  
                  {isUnread && (
                    <span 
                      title="Unread notification"
                      className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/30 animate-pulse block shrink-0" 
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-slate-200/80 rounded-[32px] select-none bg-white">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-350 border border-slate-100">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 text-center">
              <span className="text-xs font-bold text-slate-700">No Notifications Found</span>
              <span className="text-[10px] text-slate-400 font-medium">There are no updates in this category currently.</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

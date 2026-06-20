"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ChevronLeft, 
  Loader2, 
  AlertCircle, 
  AlertTriangle,
  Info,
  Cpu,
  CheckCircle,
  Bell
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
  // 3. SEGMENTED FILTER LOGIC
  // =========================================================================
  const filteredNotifications = notifications.filter(item => {
    if (activeTab === "All") return true;
    if (activeTab === "Alerts") return item.type === "alert";
    if (activeTab === "System") return item.type === "system" || item.type === "info";
    return true;
  });
  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pb-12 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* 1. MOCKUP HEADER ROW (With back navigation button) */}
      <div className="flex items-center justify-between w-full pb-4 border-b border-slate-200/60 z-30">
        <button 
          onClick={() => router.back()}
          className="p-1.5 rounded-full text-[#FF6B35] hover:opacity-80 cursor-pointer hover:bg-slate-100 transition-all border border-slate-200 bg-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
          Notifications
        </h1>

        {/* Empty placeholder to balance spacing */}
        <div className="w-9" />
      </div>

      {/* 2. PILL SEGMENTED CONTROL DECK */}
      <div className="mt-4 bg-white border border-slate-200/50 p-1 rounded-full grid grid-cols-3 gap-1 shadow-sm w-full select-none">
        {["All", "Alerts", "System"].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer text-center ${
                isActive 
                  ? "bg-[#FF6B35] text-white shadow-sm" 
                  : "text-slate-450 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Secondary Dynamic View Area - Scrollable */}
      <div className="flex-1 overflow-y-auto my-4 pr-0.5 space-y-3">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 select-none">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">Loading Alerts Feed...</span>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const isAlert = notif.type === "alert";
            return (
              <div
                key={notif.notifId}
                onClick={() => markAsRead(notif.notifId)}
                className="bg-white border border-slate-200/50 rounded-[24px] p-4.5 mb-1.5 flex items-start gap-4 hover:bg-slate-50 transition-all cursor-pointer relative shadow-sm group active:scale-[0.99]"
              >
                {/* Left Circular status classification background */}
                <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center border ${
                  isAlert 
                    ? "bg-red-50 border-red-150 text-red-500" 
                    : "bg-orange-50 border-orange-100 text-[#FF6B35]"
                }`}>
                  {isAlert ? (
                    <AlertTriangle className="w-4.5 h-4.5" />
                  ) : notif.type === "system" ? (
                    <Cpu className="w-4.5 h-4.5" />
                  ) : (
                    <Info className="w-4.5 h-4.5" />
                  )}
                </div>

                {/* Content Block */}
                <div className="flex-1 flex flex-col min-w-0 pr-6 text-left">
                  <span className="text-[12px] font-black text-gray-900 truncate group-hover:text-[#FF6B35] transition-colors">
                    {notif.title}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 leading-relaxed mt-1">
                    {notif.message}
                  </span>
                </div>

                {/* Time Indicator & Unread Indicator dot in the top right */}
                <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 select-none">
                  <span className="text-[8.5px] font-black text-slate-400 tracking-wider">
                    {notif.time}
                  </span>
                  
                  {!notif.isRead && (
                    <span 
                      title="Unread notification"
                      className="w-2 h-2 rounded-full bg-[#FF6B35] shadow-md shadow-[#FF6B35]/20 animate-pulse block shrink-0" 
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-slate-200/50 rounded-[32px] select-none bg-white">
            <Bell className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs font-bold text-slate-500">No notifications to display.</span>
          </div>
        )}

      </div>

    </div>
  );
}

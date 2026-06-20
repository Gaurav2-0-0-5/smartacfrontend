"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  ChevronDown,
  Building,
  Activity,
  Award
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Property and State variables
  const [properties, setProperties] = useState([]);
  const [activePropertyId, setActivePropertyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Analytics response state
  const [energySavedKwh, setEnergySavedKwh] = useState(118.6);
  const [savingsChangePercent, setSavingsChangePercent] = useState("+13% vs last week");
  const [weeklyUsage, setWeeklyUsage] = useState([
    { day: "Mon", kwh: 18.2 },
    { day: "Tue", kwh: 22.4 },
    { day: "Wed", kwh: 28.1 },
    { day: "Thu", kwh: 15.6 },
    { day: "Fri", kwh: 32.5 },
    { day: "Sat", kwh: 24.8 },
    { day: "Sun", kwh: 19.3 }
  ]);
  const [consumingRooms, setConsumingRooms] = useState([
    { roomName: "Suite 101", kwh: 48.5 },
    { roomName: "Deluxe 204", kwh: 38.2 },
    { roomName: "Presidential Suite", kwh: 28.1 },
    { roomName: "Conference Room A", "kwh": 24.6 },
    { roomName: "Executive Gym", kwh: 14.8 }
  ]);

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [activePeriod, setActivePeriod] = useState("This Week");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DYNAMIC PROPERTY HIERARCHY LOAD & FIRST PROPERTY EXTRACTION
  // =========================================================================
  const fetchPropertiesAndAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      // A. Query user's property catalog
      const res = await fetch(`${apiUrl}/api/properties`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load properties portfolio.");

      const list = data.properties || [];
      setProperties(list);

      if (list.length > 0) {
        const firstPropId = list[0].propertyId;
        setActivePropertyId(firstPropId);
        
        // B. Fetch live energy usage metrics
        try {
          const energyRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/energy`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const energyData = await energyRes.json();
          if (energyRes.ok) {
            if (energyData.energySavedKwh !== undefined) {
              setEnergySavedKwh(energyData.energySavedKwh);
            }
            if (energyData.savingsChangePercent) {
              setSavingsChangePercent(energyData.savingsChangePercent);
            }
            if (energyData.weeklyUsage && energyData.weeklyUsage.length > 0) {
              setWeeklyUsage(energyData.weeklyUsage);
            }
          }
        } catch (energyErr) {
          console.warn("Live energy analytics not yet seeded. Using mockup fallbacks.", energyErr);
        }

        // C. Fetch live room consumption metrics
        try {
          const roomsRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/roomHours`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const roomsData = await roomsRes.json();
          if (roomsRes.ok) {
            // Support multiple payload naming conventions
            const rList = roomsData.rooms || roomsData.roomHours || roomsData;
            if (Array.isArray(rList) && rList.length > 0) {
              setConsumingRooms(rList);
            }
          }
        } catch (roomsErr) {
          console.warn("Live room consumption metrics not yet seeded. Using mockup fallbacks.", roomsErr);
        }
      }
    } catch (err) {
      console.error("Analytics acquisition failure:", err);
      setError(err.message || "Failed to synchronise with live cloud database.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user) {
      fetchPropertiesAndAnalytics();
    }
  }, [user, fetchPropertiesAndAnalytics]);

  // Compute maximum kWh to scale chart heights proportionally
  const maxKwh = Math.max(...weeklyUsage.map(d => d.kwh), 1);

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pb-12 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* 1. HEADER ROW WITH ACTION DROPDOWN */}
      <div className="flex items-center justify-between w-full pb-4 border-b border-slate-200/60 z-30">
        <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E] flex items-center gap-2">
          Reports
        </h1>

        {/* Local time period toggle button */}
        <div className="relative">
          <button
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-full text-[10px] font-black text-slate-700 uppercase tracking-widest cursor-pointer transition-colors shadow-sm"
          >
            <span>{activePeriod}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-555 animate-fadeIn" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 mt-2 bg-white border border-slate-200/50 rounded-2xl shadow-xl z-40 py-1.5 min-w-[125px] animate-fadeIn">
              {["This Week", "Last Week", "This Month"].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setActivePeriod(period);
                    setShowTimeDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-500 hover:text-[#FF6B35] hover:bg-slate-50 transition-colors uppercase tracking-wider"
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Primary View Area - Scrollable */}
      <div className="flex-1 overflow-y-auto my-4 pr-0.5 space-y-6">
        
        {/* Error State Banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-755 text-xs select-none">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 2. HERO METRIC DECK */}
        <div className="flex flex-col mt-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Energy Saved (kWh)
          </span>
          <div className="flex items-baseline gap-2.5 mt-1.5">
            <span className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
              {energySavedKwh.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-400">kWh</span>
          </div>
          
          <div className="flex items-center mt-3">
            <span className="bg-orange-50 border border-orange-100 text-[#FF6B35] px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              {savingsChangePercent}
            </span>
          </div>
        </div>

        {/* 3. TAILWIND BAR CHART CARD */}
        <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm select-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekly Optimization Load</span>
            <Activity className="w-4 h-4 text-[#FF6B35]" />
          </div>

          <div className="flex items-end justify-between h-40 w-full mt-4 pb-1">
            {weeklyUsage.map((day, idx) => {
              const barPercentage = (day.kwh / maxKwh) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group">
                  {/* Vertical Bar with tooltip */}
                  <div className="w-full max-w-[20px] bg-slate-100 rounded-t-full h-32 flex items-end relative overflow-visible">
                    <div 
                      className="w-full bg-[#FF6B35] rounded-t-full hover:bg-[#E0531F] transition-all duration-300 cursor-pointer relative group-hover:scale-x-[1.05]" 
                      style={{ height: `${barPercentage}%` }}
                    >
                      {/* Interactive hover tooltip displaying precise value */}
                      <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-[#1C1C1E] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {day.kwh} kWh
                      </div>
                    </div>
                  </div>
                  {/* Day label */}
                  <span className="text-[8px] font-black text-slate-400 mt-2.5 uppercase tracking-wider select-none">
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. TOP ENERGY CONSUMING ROOMS LIST */}
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-4 pl-0.5">
            Top Energy Consuming Rooms
          </h3>

          <div className="space-y-3">
            {consumingRooms.map((room, idx) => {
              const maxRoomKwh = Math.max(...consumingRooms.map(r => r.kwh), 1);
              const roomPercent = (room.kwh / maxRoomKwh) * 100;
              return (
                <div key={idx} className="flex flex-col space-y-2 bg-white border border-slate-200/50 rounded-[24px] p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                      <span className="text-xs font-black text-[#1C1C1E]">{room.roomName}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-500">{room.kwh.toFixed(1)} kWh</span>
                  </div>
                  {/* Subtle horizontal progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/30">
                    <div 
                      className="bg-[#FF6B35] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${roomPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

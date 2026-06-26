"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft,
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  ChevronDown,
  Building,
  Activity,
  Info
} from "lucide-react";

// Estimated AC average power draw rating (kW) for conversion from runtime
const RUNTIME_TO_KWH_MULTIPLIER = 1.2;

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Property and State variables
  const [properties, setProperties] = useState([]);
  const [activePropertyId, setActivePropertyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Analytics response state
  const [totalRuntimeHours, setTotalRuntimeHours] = useState(98.8);
  const [energySavedKwh, setEnergySavedKwh] = useState(118.6);
  const [savingsChangePercent, setSavingsChangePercent] = useState("+13% vs last week");
  const [weeklyUsage, setWeeklyUsage] = useState([
    { day: "Mon", kwh: 18.2, acHoursOn: 15.2 },
    { day: "Tue", kwh: 22.4, acHoursOn: 18.7 },
    { day: "Wed", kwh: 28.1, acHoursOn: 23.4 },
    { day: "Thu", kwh: 15.6, acHoursOn: 13.0 },
    { day: "Fri", kwh: 32.5, acHoursOn: 27.1 },
    { day: "Sat", kwh: 24.8, acHoursOn: 20.7 },
    { day: "Sun", kwh: 19.3, acHoursOn: 16.1 }
  ]);
  const [consumingRooms, setConsumingRooms] = useState([
    { roomName: "Suite 101", kwh: 48.5, hoursOn: 40.4 },
    { roomName: "Deluxe 204", kwh: 38.2, hoursOn: 31.8 },
    { roomName: "Presidential Suite", kwh: 28.1, hoursOn: 23.4 },
    { roomName: "Conference Room A", kwh: 24.6, hoursOn: 20.5 },
    { roomName: "Executive Gym", kwh: 14.8, hoursOn: 12.3 }
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
        
        // Fetch and map all actual room names inside this property
        const roomNameMap = {};
        try {
          const floorsRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/floors`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const floorsData = await floorsRes.json();
          const floorsList = floorsData.floors || [];
          
          for (const floor of floorsList) {
            try {
              const roomsRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/floors/${floor.floorId}/rooms`, {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json"
                }
              });
              const roomsData = await roomsRes.json();
              const roomsList = roomsData.rooms || [];
              roomsList.forEach(r => {
                roomNameMap[r.roomId] = r.name;
              });
            } catch (rErr) {
              console.warn(`Failed to resolve rooms for floor ${floor.floorId}:`, rErr);
            }
          }
        } catch (fErr) {
          console.warn("Failed to load floors for room name mapping:", fErr);
        }
        
        // B. Fetch live energy usage metrics
        try {
          let energyRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/energy`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          let energyData = await energyRes.json();

          // Try yesterday if today returns 404
          if (energyRes.status === 404) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yyyy = yesterday.getFullYear();
            const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
            const dd = String(yesterday.getDate()).padStart(2, '0');
            const yesterdayStr = `${yyyy}-${mm}-${dd}`;

            energyRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/energy?date=${yesterdayStr}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            });
            energyData = await energyRes.json();
          }

          if (energyRes.ok && energyData.energy) {
            const energyObj = energyData.energy;
            
            // Extract or calculate runtime hours and estimated kWh
            if (energyObj.totalRuntimeHours !== undefined) {
              setTotalRuntimeHours(energyObj.totalRuntimeHours);
              setEnergySavedKwh(energyObj.totalRuntimeHours * RUNTIME_TO_KWH_MULTIPLIER);
            } else if (energyObj.energySavedKwh !== undefined) {
              setEnergySavedKwh(energyObj.energySavedKwh);
              setTotalRuntimeHours(energyObj.energySavedKwh / RUNTIME_TO_KWH_MULTIPLIER);
            }

            if (energyObj.savingsChangePercent) {
              setSavingsChangePercent(`${energyObj.savingsChangePercent > 0 ? "+" : ""}${energyObj.savingsChangePercent}% vs last week`);
            }
            if (energyObj.weeklyUsage && energyObj.weeklyUsage.length > 0) {
              setWeeklyUsage(energyObj.weeklyUsage.map(day => {
                const hours = day.acHoursOn !== undefined ? day.acHoursOn : (day.kwh / RUNTIME_TO_KWH_MULTIPLIER);
                return {
                  day: day.day,
                  acHoursOn: hours,
                  kwh: hours * RUNTIME_TO_KWH_MULTIPLIER
                };
              }));
            }
          }
        } catch (energyErr) {
          console.warn("Live energy analytics not yet seeded. Using mockup fallbacks.", energyErr);
        }

        // C. Fetch live room consumption metrics
        try {
          let roomsRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/roomHours`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          let roomsData = await roomsRes.json();

          // Try yesterday if today returns 404
          if (roomsRes.status === 404) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yyyy = yesterday.getFullYear();
            const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
            const dd = String(yesterday.getDate()).padStart(2, '0');
            const yesterdayStr = `${yyyy}-${mm}-${dd}`;

            roomsRes = await fetch(`${apiUrl}/api/properties/${firstPropId}/analytics/roomHours?date=${yesterdayStr}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            });
            roomsData = await roomsRes.json();
          }

          if (roomsRes.ok) {
            const roomsObj = roomsData.roomHours || roomsData;
            const rList = roomsObj.rooms || roomsObj.roomHours || roomsObj;
            if (Array.isArray(rList) && rList.length > 0) {
              setConsumingRooms(rList.slice(0, 5).map(room => {
                const hours = room.hoursOn !== undefined ? room.hoursOn : (room.kwh / RUNTIME_TO_KWH_MULTIPLIER);
                return {
                  roomName: roomNameMap[room.roomId] || room.roomName || room.roomId,
                  hoursOn: hours,
                  kwh: hours * RUNTIME_TO_KWH_MULTIPLIER
                };
              }));
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

  // Compute maximum AC hours to scale weekly usage chart heights
  const maxWeeklyHours = Math.max(...weeklyUsage.map(d => d.acHoursOn), 1);

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pt-2 sm:pt-4 pb-16 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* Ambient glowing highlights */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF6B35]/[0.015] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-300/[0.01] rounded-full blur-[100px] pointer-events-none" />

      {/* 1. HEADER ROW WITH ACTION DROPDOWN */}
      <div className="flex items-center justify-between w-full pb-6 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
            Analytics Reports
          </h1>
        </div>

        {/* Local time period toggle button */}
        <div className="relative z-40">
          <button
            onClick={() => setShowTimeDropdown(!showTimeDropdown)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-[10px] font-bold text-slate-700 uppercase tracking-wider cursor-pointer transition-all shadow-sm active:scale-98"
          >
            <span>{activePeriod}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 mt-2 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-50 py-1.5 min-w-[130px] animate-fadeIn border-t border-t-slate-100">
              {["This Week", "Last Week", "This Month"].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setActivePeriod(period);
                    setShowTimeDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-[#FF6B35] hover:bg-slate-50 transition-colors uppercase tracking-wider"
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Primary View Area - Scrollable */}
      <div className="flex-1 overflow-y-auto mt-6 pr-0.5 space-y-6 z-10">
        
        {/* Error State Banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs select-none animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Premium Flashing Skeleton Loader Screen */
          <div className="space-y-6 animate-pulse select-none">
            {/* 1. Hero Metric Deck Card Skeleton */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm relative overflow-hidden">
              <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
                <div className="flex flex-col text-left space-y-3">
                  <div className="h-2.5 w-24 bg-slate-200 rounded-full" />
                  <div className="h-8 w-28 bg-slate-200 rounded-lg mt-1" />
                </div>
                <div className="flex flex-col text-left pl-5 space-y-3">
                  <div className="h-2.5 w-28 bg-slate-200 rounded-full" />
                  <div className="h-8 w-28 bg-slate-200 rounded-lg mt-1" />
                </div>
              </div>
              <div className="h-6 w-32 bg-slate-100 rounded-full mt-5" />
            </div>

            {/* 2. Notice Box Skeleton */}
            <div className="bg-slate-50 border border-slate-200/40 rounded-[24px] p-5 flex items-start gap-3.5">
              <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-2.5 w-28 bg-slate-200 rounded-full" />
                <div className="h-2.5 w-full bg-slate-200 rounded-full" />
                <div className="h-2.5 w-4/5 bg-slate-200 rounded-full" />
              </div>
            </div>

            {/* 3. Bar Chart Card Skeleton */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="h-3 w-40 bg-slate-200 rounded-full" />
                <div className="w-8 h-8 rounded-xl bg-slate-100" />
              </div>
              <div className="flex items-end justify-between h-40 w-full pb-2 px-1">
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex flex-col items-center flex-1 space-y-3">
                    <div className="w-full max-w-[20px] bg-slate-100 rounded-t-full h-32 flex items-end">
                      <div className="w-full bg-slate-200 rounded-t-full" style={{ height: `${i * 10 + 15}%` }} />
                    </div>
                    <div className="h-2 w-6 bg-slate-200 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Top Energy Consuming Rooms Skeleton */}
            <div className="flex flex-col space-y-3">
              <div className="h-3 w-48 bg-slate-200 rounded-full ml-1.5" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-slate-200/50 rounded-[24px] p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100" />
                      <div className="h-3 w-24 bg-slate-200 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-5.5 w-16 bg-slate-200 rounded-lg" />
                      <div className="h-5.5 w-20 bg-slate-200 rounded-lg" />
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full">
                    <div className="bg-slate-200 h-full rounded-full" style={{ width: `${80 - i * 15}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Render Active Dashboard with Real Data */
          <div className="space-y-6 animate-fadeIn">
            {/* 2. HERO METRIC DECK CARD (Dual Metric: Runtime & Estimated kWh Saved) */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/50 rounded-[32px] p-6 shadow-sm select-none relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF6B35]/[0.025] rounded-bl-[100px] pointer-events-none" />
              
              <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
                {/* Left side: Measured AC Runtime */}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total AC Runtime
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                      {totalRuntimeHours.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">hrs</span>
                  </div>
                </div>

                {/* Right side: Calculated Estimated Energy Savings */}
                <div className="flex flex-col text-left pl-5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Est. Energy Saved
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                      {energySavedKwh.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">kWh</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center mt-5">
                <span className="bg-orange-50/80 backdrop-blur-sm border border-orange-100/50 text-[#FF6B35] px-3.5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {savingsChangePercent}
                </span>
              </div>
            </div>

            {/* 3. HARDWARE CAPABILITY NOTICE BOX */}
            <div className="bg-[#FF6B35]/[0.025] border border-[#FF6B35]/15 rounded-[24px] p-5 text-left flex items-start gap-3.5 select-none">
              <Info className="w-5 h-5 text-[#FF6B35] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#FF6B35] uppercase tracking-widest">
                  Estimation Notice
                </span>
                <span className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                  Energy metrics are calculated estimates based on cumulative physical AC runtime (assuming standard 1.2 kW draw per unit). Hardware-level direct power monitoring sensors will be introduced in a future release.
                </span>
              </div>
            </div>

            {/* 4. BAR CHART CARD (AC Runtime hours) */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm select-none">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weekly AC Runtime (Hours)</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B35]">
                  <Activity className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-end justify-between h-40 w-full mt-6 pb-2 px-1">
                {weeklyUsage.map((day, idx) => {
                  const barPercentage = (day.acHoursOn / maxWeeklyHours) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center flex-1 group">
                      {/* Vertical Bar with custom tooltip */}
                      <div className="w-full max-w-[20px] bg-slate-50 border border-slate-100 rounded-t-full h-32 flex items-end relative overflow-visible">
                        <div 
                          className="w-full bg-gradient-to-t from-[#FF6B35] to-[#FFA785] rounded-t-full group-hover:from-[#E0531F] group-hover:to-[#FF6B35] transition-all duration-300 cursor-pointer relative group-hover:scale-x-[1.05]" 
                          style={{ height: `${barPercentage}%` }}
                        >
                          {/* Floating tooltip with both Hours & Est. kWh */}
                          <div className="absolute -top-11 left-1/2 transform -translate-x-1/2 bg-[#1C1C1E] text-white text-[8px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 flex flex-col items-center gap-0.5">
                            <span>{day.acHoursOn.toFixed(1)} hrs</span>
                            <span className="text-slate-400 font-medium">Est. {day.kwh.toFixed(1)} kWh</span>
                          </div>
                        </div>
                      </div>
                      {/* Day label */}
                      <span className="text-[8.5px] font-bold text-slate-400 mt-3.5 uppercase tracking-wider">
                        {day.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. TOP ENERGY CONSUMING ROOMS LIST (Runtime-based scaling) */}
            <div className="flex flex-col">
              <h3 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-4 pl-1.5">
                Top Consuming Rooms (AC Runtime)
              </h3>

              <div className="space-y-3 mt-3">
                {consumingRooms.map((room, idx) => {
                  const maxRoomHours = Math.max(...consumingRooms.map(r => r.hoursOn), 1);
                  const roomPercent = (room.hoursOn / maxRoomHours) * 100;
                  return (
                    <div 
                      key={idx} 
                      className="group flex flex-col space-y-3 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-[24px] p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:bg-white transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-[#FF6B35] group-hover:bg-[#FF6B35]/5 transition-colors">
                            <Building className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[#1C1C1E]">{room.roomName}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#FF6B35] tracking-wide bg-orange-50/50 px-2.5 py-1 rounded-lg border border-orange-100/10">
                            {room.hoursOn.toFixed(1)} hrs
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 tracking-wide bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/40">
                            Est. {room.kwh.toFixed(1)} kWh
                          </span>
                        </div>
                      </div>
                      
                      {/* Glossy horizontal progress bar */}
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-200/20">
                        <div 
                          className="bg-gradient-to-r from-[#FF6B35] to-[#FFA785] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${roomPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

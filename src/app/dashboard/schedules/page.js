"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  ChevronDown,
  Activity,
  Clock,
  Calendar,
  MapPin,
  RotateCw,
  Moon,
  Info,
  Cpu,
  Plus,
  Minus,
  Settings,
  Pencil
} from "lucide-react";

const convert24To12 = (timeStr) => {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = timeStr.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursFormatted = hours < 10 ? `0${hours}` : hours;
  return `${hoursFormatted}:${minutes} ${ampm}`;
};

const convert12To24 = (time12h) => {
  if (!time12h) return "10:00";
  try {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");
    if (hours === "12") {
      hours = "00";
    }
    if (modifier === "PM") {
      hours = String(parseInt(hours, 10) + 12);
    } else {
      hours = String(parseInt(hours, 10));
    }
    return `${hours.padStart(2, "0")}:${minutes}`;
  } catch (e) {
    console.error("Error converting 12h to 24h:", e);
    return "10:00";
  }
};

const formatDays = (daysArray) => {
  if (!daysArray || !Array.isArray(daysArray)) return "Daily";
  if (daysArray.length === 0) return "None";
  if (daysArray.length === 7) return "Daily";
  
  const weekDays = [1, 2, 3, 4, 5];
  const weekendDays = [0, 6];
  
  const isWeekdays = weekDays.every(d => daysArray.includes(d)) && daysArray.length === 5;
  const isWeekends = weekendDays.every(d => daysArray.includes(d)) && daysArray.length === 2;
  
  if (isWeekdays) return "Weekdays";
  if (isWeekends) return "Weekends";
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return daysArray.map(d => dayNames[d]).join(", ");
};

export default function SchedulesPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Tab segments: "Cyclic" | "Temp Maintainer"
  const [activeTab, setActiveTab] = useState("Temp Maintainer");

  // View toggle state: "create" | "list"
  const [currentView, setCurrentView] = useState("create");

  // Dynamic Room List Loader
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [manualRoomId, setManualRoomId] = useState("");
  const [useManualRoom, setUseManualRoom] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);

  // Form Configuration States
  const [startTime, setStartTime] = useState("10:00"); // 24h format
  const [endTime, setEndTime] = useState("18:00"); // 24h format
  const [cycles, setCycles] = useState(2);
  const [runtimeMinutes, setRuntimeMinutes] = useState(60);
  const [ifRoomTempAbove, setIfRoomTempAbove] = useState(27.0);
  const [minOffTimeMinutes, setMinOffTimeMinutes] = useState(15);
  const [targetTemp, setTargetTemp] = useState(24.0);
  const [nightOptimization, setNightOptimization] = useState(true);
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6]); // 0=Sun, ..., 6=Sat

  const toggleDay = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  // Quick day selection presets
  const selectPreset = (type) => {
    if (type === "all") setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    else if (type === "weekdays") setSelectedDays([1, 2, 3, 4, 5]);
    else if (type === "weekends") setSelectedDays([0, 6]);
    else if (type === "none") setSelectedDays([]);
  };

  // Active schedules state
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Operational states
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DATA COLLECTION & HIERARCHY ACCUMULATION
  // =========================================================================
  const fetchAllRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const token = await getToken();
      if (!token) return;

      const propRes = await fetch(`${apiUrl}/api/properties`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const propData = await propRes.json();
      if (!propRes.ok) throw new Error(propData.error || "Failed to load properties.");

      const propertiesList = propData.properties || [];
      const discoveredRooms = [];

      for (const prop of propertiesList) {
        const floorsRes = await fetch(`${apiUrl}/api/properties/${prop.propertyId}/floors`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const floorsData = await floorsRes.json();
        const floorsList = floorsData.floors || [];

        for (const floor of floorsList) {
          const roomsRes = await fetch(`${apiUrl}/api/properties/${prop.propertyId}/floors/${floor.floorId}/rooms`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.rooms || [];

          for (const room of roomsList) {
            discoveredRooms.push({
              roomId: room.roomId,
              roomName: room.roomName || room.name,
              floorName: floor.name,
              propertyName: prop.name
            });
          }
        }
      }

      setRooms(discoveredRooms);
      if (discoveredRooms.length > 0) {
        setSelectedRoomId(discoveredRooms[0].roomId);
      } else {
        setUseManualRoom(true);
      }
    } catch (err) {
      console.error("Failed to load rooms portfolio:", err);
      setUseManualRoom(true);
    } finally {
      setLoadingRooms(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user) {
      fetchAllRooms();
    }
  }, [user, fetchAllRooms]);

  // =========================================================================
  // 2. DISPATCH CREATE SCHEDULE REQUEST
  // =========================================================================
  const handleSaveSchedule = async () => {
    const finalRoomId = useManualRoom ? manualRoomId.trim() : selectedRoomId;

    if (!finalRoomId) {
      setError("Please specify or select a Room ID.");
      return;
    }

    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session token expired.");

      // If in editing mode, first delete the old schedule
      if (editingScheduleId) {
        const deleteRes = await fetch(`${apiUrl}/api/schedules/${editingScheduleId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        if (!deleteRes.ok) {
          const deleteData = await deleteRes.json();
          throw new Error(deleteData.error || "Failed to clear existing schedule before updating.");
        }
      }

      const isCyclic = activeTab === "Cyclic";
      const scheduleName = isCyclic ? "Cyclic Optimization" : "Temp Maintainer";
      
      const payload = {
        name: scheduleName,
        roomId: finalRoomId,
        applyToFloor: null,
        startTime: convert24To12(startTime),
        endTime: convert24To12(endTime),
        targetTemp: parseFloat(targetTemp),
        ifRoomTempAbove: isCyclic ? parseFloat(ifRoomTempAbove) : 0,
        minOffTimeMinutes: isCyclic ? parseInt(minOffTimeMinutes, 10) : 0,
        cycles: isCyclic ? parseInt(cycles, 10) : 0,
        runtimeMinutes: isCyclic ? parseInt(runtimeMinutes, 10) : 0,
        isActive: true,
        nightOptimization: nightOptimization,
        days: selectedDays
      };

      const res = await fetch(`${apiUrl}/api/schedules/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create schedule.");
      }

      setSuccess(editingScheduleId ? "Successfully updated Automation Rule!" : `Successfully created ${scheduleName} Schedule!`);
      setEditingScheduleId(null);
      
      setTimeout(() => {
        setSuccess("");
        setCurrentView("list");
        fetchSchedules();
      }, 1500);

    } catch (err) {
      console.error("Save schedule error:", err);
      setError(err.message || "Request failed. Please verify API online status.");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // 3. FETCH AND CONTROL ACTIVE SCHEDULES
  // =========================================================================
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/schedules`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSchedules(data.schedules || []);
      } else {
        throw new Error(data.error || "Failed to load schedules.");
      }
    } catch (err) {
      console.error("Load schedules error:", err);
      setError(err.message || "Failed to fetch schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user && currentView === "list") {
      fetchSchedules();
    }
  }, [user, currentView, fetchSchedules]);

  const handleToggleSchedule = async (scheduleId, currentStatus) => {
    setError("");
    setSuccess("");
    const nextStatus = !currentStatus;

    setSchedules(prev => prev.map(s => s.scheduleId === scheduleId ? { ...s, isActive: nextStatus } : s));

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const res = await fetch(`${apiUrl}/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          isActive: nextStatus
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update schedule status.");
      }
      setSuccess(`Schedule successfully ${nextStatus ? "activated" : "deactivated"}.`);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("Toggle schedule error:", err);
      setError(err.message || "Failed to toggle schedule.");
      setSchedules(prev => prev.map(s => s.scheduleId === scheduleId ? { ...s, isActive: currentStatus } : s));
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm("Are you sure you want to delete this schedule automation?")) return;

    setError("");
    setSuccess("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const res = await fetch(`${apiUrl}/api/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete schedule.");
      }

      setSuccess("Schedule deleted successfully.");
      setSchedules(prev => prev.filter(s => s.scheduleId !== scheduleId));
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error("Delete schedule error:", err);
      setError(err.message || "Failed to delete schedule.");
    }
  };

  const handleEditClick = (sched) => {
    setError("");
    setSuccess("");
    setEditingScheduleId(sched.scheduleId);
    
    // Determine mode
    const isCyclic = (sched.cycles > 0) || (sched.name?.toLowerCase().includes("cyclic"));
    setActiveTab(isCyclic ? "Cyclic" : "Temp Maintainer");
    
    // Set room IDs
    const roomExists = rooms.some(r => r.roomId === sched.roomId);
    if (roomExists) {
      setSelectedRoomId(sched.roomId);
      setUseManualRoom(false);
    } else {
      setManualRoomId(sched.roomId);
      setUseManualRoom(true);
    }
    
    // Set times
    setStartTime(convert12To24(sched.startTime));
    setEndTime(convert12To24(sched.endTime));
    
    // Set values
    setTargetTemp(sched.targetTemp || 24.0);
    setIfRoomTempAbove(sched.ifRoomTempAbove || 27.0);
    setMinOffTimeMinutes(sched.minOffTimeMinutes || 15);
    setCycles(sched.cycles || 2);
    setRuntimeMinutes(sched.runtimeMinutes || 60);
    setNightOptimization(sched.nightOptimization ?? true);
    setSelectedDays(sched.days || [0, 1, 2, 3, 4, 5, 6]);
    
    // Switch view
    setCurrentView("create");
  };

  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    setCurrentView("list");
  };

  const getRoomName = (roomId) => {
    const rm = rooms.find(r => r.roomId === roomId);
    return rm ? `${rm.roomName} (${rm.floorName})` : roomId;
  };

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pt-2 sm:pt-4 pb-16 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* A. DYNAMIC UNIFIED HEADER ROW */}
      <div className="flex items-center justify-between w-full pb-6 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (currentView === "create") {
                setEditingScheduleId(null);
                setCurrentView("list");
              } else {
                router.back();
              }
            }}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div className="flex flex-col text-left">
            <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
              Schedules
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Automated Climate Controls
            </span>
          </div>
        </div>
      </div>

      {/* B. VIEW SELECTOR TOGGLE (Segmented Capsule Control) */}
      <div className="flex bg-white border border-slate-200/50 p-1.5 rounded-full w-full z-10 shadow-sm mb-6">
        <button
          onClick={() => {
            setEditingScheduleId(null);
            setStartTime("10:00");
            setEndTime("18:00");
            setCurrentView("create");
          }}
          className={`flex-1 py-3 text-[11px] font-extrabold uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
            currentView === "create" 
              ? "bg-[#FF6B35] text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          New Rule
        </button>
        <button
          onClick={() => setCurrentView("list")}
          className={`flex-1 py-3 text-[11px] font-extrabold uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
            currentView === "list" 
              ? "bg-[#FF6B35] text-white shadow-sm" 
              : "text-slate-400 hover:text-slate-700"
          }`}
        >
          Active Rules
        </button>
      </div>

      {/* Notifications */}
      {(error || success) && (
        <div className="mb-6 space-y-2 select-none z-10">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-3xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 p-4 rounded-3xl bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-[#FF6B35] shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* C. CONFIGURATION LAYOUT (Scrollable Viewport) */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-5 w-full select-none scrollbar-none z-10">
        
        {currentView === "list" ? (
          <div className="space-y-4 pb-4">
            {loadingSchedules ? (
              /* Premium Flashing Skeleton Loader Screen */
              <div className="space-y-4 animate-pulse select-none">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-[32px] border border-slate-200/50 shadow-sm p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-40 bg-slate-200 rounded-full" />
                        <div className="h-3 w-28 bg-slate-100 rounded-full animate-pulse" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-11 h-6 bg-slate-200 rounded-full" />
                        <div className="w-8 h-8 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
                      <div className="flex justify-between">
                        <div className="h-3 w-24 bg-slate-100 rounded-full" />
                        <div className="h-3 w-16 bg-slate-200 rounded-full" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 w-24 bg-slate-100 rounded-full" />
                        <div className="h-3 w-12 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : schedules.length > 0 ? (
              schedules.map((sched) => (
                <div 
                  key={sched.scheduleId} 
                  className="bg-white rounded-[32px] border border-slate-200/50 shadow-sm p-6 flex flex-col gap-4 text-left hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  {/* Left accent accent category strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                    sched.isActive ? "bg-[#FF6B35]" : "bg-slate-200"
                  }`} />

                  <div className="flex items-start justify-between pl-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1C1C1E] tracking-tight">
                        {sched.name || "Climate Automation"}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#FF6B35]/70" /> {getRoomName(sched.roomId)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Apple Style IOS Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSchedule(sched.scheduleId, sched.isActive)}
                        className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none ${
                          sched.isActive ? "bg-[#FF6B35]" : "bg-slate-200"
                        }`}
                      >
                        <div
                          className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                            sched.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditClick(sched)}
                        className="p-2 text-slate-400 hover:text-[#FF6B35] hover:bg-orange-50 hover:border-orange-100 active:scale-95 transition-all bg-slate-50 border border-slate-200/50 rounded-full cursor-pointer"
                        title="Edit Rule"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(sched.scheduleId)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 active:scale-95 transition-all bg-slate-50 border border-slate-200/50 rounded-full cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Days indicator bubbles in rule card */}
                  <div className="flex gap-1.5 pl-2 mt-0.5 select-none">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => {
                      const isDaySelected = sched.days?.includes(idx) ?? true;
                      return (
                        <span 
                          key={idx}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold tracking-tighter ${
                            isDaySelected 
                              ? "bg-[#FF6B35]/10 text-[#FF6B35]" 
                              : "bg-slate-100 text-slate-300"
                          }`}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>

                  {/* Premium Visual Value Grid */}
                  <div className="border-t border-slate-100 pt-4 pl-2 grid grid-cols-2 gap-3 text-xs text-slate-500 font-semibold select-none">
                    <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Time Window</span>
                      <span className="text-[#1C1C1E] font-extrabold text-xs flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#FF6B35]/80" /> {sched.startTime} - {sched.endTime}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Temp</span>
                      <span className="text-[#FF6B35] font-extrabold text-xs flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-[#FF6B35]" /> {sched.targetTemp}°C
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mode Profile</span>
                      <span className="text-[#1C1C1E] font-bold text-[10px] uppercase tracking-wide">
                        {sched.cycles > 0 ? "Cyclic Mode" : "Temp Maintainer"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Night Opt.</span>
                      <span className="text-[#1C1C1E] font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-[#FF6B35]/80" /> {sched.nightOptimization ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    {sched.cycles > 0 && (
                      <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50 col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-extrabold">Trigger & Duty Cycle</span>
                        <span className="text-slate-700 font-medium text-[10.5px] leading-relaxed">
                          Triggers when room temperature is above <strong className="text-slate-900">{sched.ifRoomTempAbove}°C</strong>. Runs for <strong className="text-slate-900">{sched.cycles} cycles</strong>, each cycling for <strong className="text-slate-900">{sched.runtimeMinutes}m ON</strong> and <strong className="text-slate-900">{sched.minOffTimeMinutes}m OFF</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 border border-slate-200/50 border-dashed rounded-[32px] select-none bg-white">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">No active automation rules.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 pb-6">
            {editingScheduleId && (
              <div className="flex items-center justify-between p-4 rounded-3xl bg-orange-50 border border-orange-100 text-slate-700 text-xs shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF6B35] shrink-0" />
                  <span>Editing active rule. Saving will replace it.</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B35] hover:opacity-85 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* 1. Rule Type Selection Card */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1C1C1E]">
                  Rule Configuration Type
                </h3>
              </div>

              <div className="flex bg-slate-50 border border-slate-200/40 p-1 rounded-2xl w-full">
                {["Temp Maintainer", "Cyclic"].map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === "Cyclic") {
                          setStartTime("00:30");
                          setEndTime("08:00");
                        } else {
                          setStartTime("10:00");
                          setEndTime("18:00");
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center ${
                        isActive 
                          ? "bg-white text-[#FF6B35] shadow-sm border border-slate-200/40 font-extrabold" 
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Explanatory description of selection */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FF6B35]/[0.03] border border-[#FF6B35]/10 text-slate-500 text-[11.5px] leading-relaxed flex-col w-full">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs">
                  <Info className="w-4 h-4 text-[#FF6B35] shrink-0" />
                  <span>Automation Profile</span>
                </div>
                <div className="mt-2 text-left text-slate-500 w-full">
                  {activeTab === "Temp Maintainer" ? (
                    <p>
                      <strong className="text-[#1C1C1E]">Temp Maintainer:</strong> Keeps the air conditioner running continuously to maintain your exact target temperature setpoint. This is more effective and best for both night and day comfort.
                    </p>
                  ) : (
                    <p>
                      <strong className="text-[#1C1C1E]">Cyclic:</strong> Runs the air conditioner in interval-based duty cycles (ON/OFF) once room temperature exceeds your trigger threshold. Ideal for saving energy during specific hours.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Target Scope & Optimization Options Card */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1C1C1E]">
                  Target & Optimization Scope
                </h3>
              </div>

              {/* Night Mode Toggle row */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex flex-col text-left max-w-[80%]">
                  <span className="text-[13px] font-bold text-[#1C1C1E] flex items-center gap-1.5">
                    Night Optimization <Moon className="w-3.5 h-3.5 text-[#FF6B35]" />
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    Adjusts trigger profiles during sleep cycles to prevent overcooling
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNightOptimization(!nightOptimization)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 outline-none ${
                    nightOptimization ? "bg-[#FF6B35]" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                      nightOptimization ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Room Selection row */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#1C1C1E]">Apply Target Room</span>
                  <button 
                    type="button"
                    onClick={() => setUseManualRoom(!useManualRoom)}
                    className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF6B35] hover:opacity-85 transition-opacity"
                  >
                    {useManualRoom ? "Use List" : "MANUAL ID"}
                  </button>
                </div>

                <div className="flex items-center justify-start mt-0.5 w-full">
                  {useManualRoom ? (
                    <input
                      type="text"
                      value={manualRoomId}
                      onChange={(e) => setManualRoomId(e.target.value)}
                      placeholder="Enter Room ID string (e.g. RtRocGbnYqLLmKna3zST)"
                      className="bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-3 text-[#FF6B35] text-xs font-bold outline-none placeholder-slate-400 w-full focus:border-[#FF6B35]/40 transition-colors"
                    />
                  ) : loadingRooms ? (
                    <span className="text-slate-400 text-xs flex items-center gap-1.5 font-semibold bg-slate-50 border border-slate-200/40 w-full px-4 py-3 rounded-xl">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B35]" /> Syncing rooms...
                    </span>
                  ) : rooms.length > 0 ? (
                    <div className="relative w-full">
                      <button
                        type="button"
                        onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200/50 rounded-xl px-4 py-3 text-[#FF6B35] text-xs font-extrabold outline-none cursor-pointer w-full text-left focus:border-[#FF6B35]/40 transition-colors select-none"
                      >
                        <span>
                          {rooms.find(r => r.roomId === selectedRoomId)
                            ? `${rooms.find(r => r.roomId === selectedRoomId).roomName} (${rooms.find(r => r.roomId === selectedRoomId).floorName})`
                            : "Select Target Room"}
                        </span>
                        <ChevronDown 
                          className="w-4 h-4 text-[#FF6B35] shrink-0 transition-transform duration-200" 
                          style={{ transform: showRoomDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} 
                        />
                      </button>

                      {showRoomDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-[20px] shadow-xl z-50 p-2 max-h-60 overflow-y-auto animate-fadeIn">
                          {rooms.map((rm) => (
                            <button
                              key={rm.roomId}
                              type="button"
                              onClick={() => {
                                setSelectedRoomId(rm.roomId);
                                setShowRoomDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer block ${
                                selectedRoomId === rm.roomId
                                  ? "bg-[#FF6B35] text-white shadow-sm"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                              }`}
                            >
                              {rm.roomName} ({rm.floorName})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs bg-slate-50 border border-slate-200/40 w-full px-4 py-3 rounded-xl">
                      No rooms available
                    </span>
                  )}
                </div>
              </div>

              {/* Target Temperature Stepper Control (UX Improvement - No Keyboard Input Required) */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[13px] font-bold text-[#1C1C1E]">Target Temperature</span>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/40 rounded-2xl p-2.5">
                  <button 
                    type="button" 
                    onClick={() => setTargetTemp(prev => Math.max(16, parseFloat(prev) - 0.5))} 
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center font-extrabold text-[#FF6B35] hover:bg-slate-100 cursor-pointer active:scale-95 transition-all text-sm"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-base font-extrabold text-[#1C1C1E] tracking-tight">
                      {parseFloat(targetTemp).toFixed(1)}°C
                    </span>
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                      Cooling Limit
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setTargetTemp(prev => Math.min(30, parseFloat(prev) + 0.5))} 
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center font-extrabold text-[#FF6B35] hover:bg-slate-100 cursor-pointer active:scale-95 transition-all text-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* 3. Cyclic Optimization Tuner Card (UX steppers, Cyclic only) */}
            {activeTab === "Cyclic" && (
              <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                    <RotateCw className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1C1C1E]">
                    Interval Cycle Tuning
                  </h3>
                </div>

                {/* Trigger Temperature Threshold stepper */}
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-[#1C1C1E]">Trigger Threshold Temperature</span>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200/40 rounded-2xl p-2.5">
                    <button 
                      type="button" 
                      onClick={() => setIfRoomTempAbove(prev => Math.max(18, parseFloat(prev) - 0.5))} 
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center font-extrabold text-[#FF6B35] hover:bg-slate-100 cursor-pointer active:scale-95 transition-all text-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-base font-extrabold text-[#1C1C1E] tracking-tight">
                        {parseFloat(ifRoomTempAbove).toFixed(1)}°C
                      </span>
                      <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                        Triggers ON Above
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setIfRoomTempAbove(prev => Math.min(35, parseFloat(prev) + 0.5))} 
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200/50 shadow-sm flex items-center justify-center font-extrabold text-[#FF6B35] hover:bg-slate-100 cursor-pointer active:scale-95 transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid of Number of Cycles & Runtime & Offtime steppers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Cycles stepper */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Cycles Count</span>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/40 rounded-xl p-1.5">
                      <button 
                        type="button" 
                        onClick={() => setCycles(prev => Math.max(1, parseInt(prev, 10) - 1))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold text-[#1C1C1E]">{cycles}</span>
                      <button 
                        type="button" 
                        onClick={() => setCycles(prev => Math.min(10, parseInt(prev, 10) + 1))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Run Time (min) stepper */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Min ON Time</span>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/40 rounded-xl p-1.5">
                      <button 
                        type="button" 
                        onClick={() => setRuntimeMinutes(prev => Math.max(10, parseInt(prev, 10) - 5))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold text-[#1C1C1E]">{runtimeMinutes}m</span>
                      <button 
                        type="button" 
                        onClick={() => setRuntimeMinutes(prev => Math.min(240, parseInt(prev, 10) + 5))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Off Time (min) stepper */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Min OFF Time</span>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200/40 rounded-xl p-1.5">
                      <button 
                        type="button" 
                        onClick={() => setMinOffTimeMinutes(prev => Math.max(5, parseInt(prev, 10) - 5))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-extrabold text-[#1C1C1E]">{minOffTimeMinutes}m</span>
                      <button 
                        type="button" 
                        onClick={() => setMinOffTimeMinutes(prev => Math.min(120, parseInt(prev, 10) + 5))} 
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200/50 flex items-center justify-center font-bold text-[#FF6B35] active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Scheduling & Repeat Frequency Card */}
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-6 shadow-sm flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#1C1C1E]">
                  Time Window & Frequency
                </h3>
              </div>

              {/* Start & End Time Input Rows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Start Time</span>
                  <div className="bg-slate-50 border border-slate-200/40 rounded-xl px-4 py-2.5 relative flex items-center justify-center">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-transparent text-[#FF6B35] text-xs font-extrabold outline-none cursor-pointer text-center w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Offtime (End)</span>
                  <div className="bg-slate-50 border border-slate-200/40 rounded-xl px-4 py-2.5 relative flex items-center justify-center">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-transparent text-[#FF6B35] text-xs font-extrabold outline-none cursor-pointer text-center w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Repeat Days Week Bubble Buttons */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#1C1C1E]">Repeat Days</span>
                  
                  {/* Preset filters (UX Improvement) */}
                  <div className="flex gap-2 text-[9px] font-extrabold uppercase tracking-wider">
                    <button 
                      type="button" 
                      onClick={() => selectPreset("weekdays")}
                      className="text-slate-400 hover:text-[#FF6B35] transition-colors"
                    >
                      Weekdays
                    </button>
                    <span className="text-slate-200">|</span>
                    <button 
                      type="button" 
                      onClick={() => selectPreset("weekends")}
                      className="text-slate-400 hover:text-[#FF6B35] transition-colors"
                    >
                      Weekends
                    </button>
                    <span className="text-slate-200">|</span>
                    <button 
                      type="button" 
                      onClick={() => selectPreset("all")}
                      className="text-slate-400 hover:text-[#FF6B35] transition-colors"
                    >
                      Everyday
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-1.5 mt-1.5">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#FF6B35] border-transparent text-white shadow-sm scale-105"
                            : "bg-[#F5F5F7] border-slate-200 text-slate-500 hover:text-slate-700 active:scale-95"
                        }`}
                      >
                        {dayName.slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* D. SAVING DISPATCH ACTION BUTTON */}
      {/* ========================================================================= */}
      {currentView === "create" && (
        <button
          onClick={handleSaveSchedule}
          disabled={actionLoading}
          className="w-full py-4 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 active:scale-[0.98] text-white text-[11px] font-extrabold uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-lg shadow-[#FF6B35]/15 text-center flex items-center justify-center gap-2 mt-4 shrink-0 z-10 animate-fadeIn"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{editingScheduleId ? "Updating Automation..." : "Saving Automation..."}</span>
            </>
          ) : (
            <span>{editingScheduleId ? "Update Automation Rule" : "Save Automation Rule"}</span>
          )}
        </button>
      )}

    </div>
  );
}

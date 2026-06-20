"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ChevronLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  ChevronDown
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
  const [activeTab, setActiveTab] = useState("Cyclic");

  // View toggle state: "create" | "list"
  const [currentView, setCurrentView] = useState("create");

  // Dynamic Room List Loader
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [manualRoomId, setManualRoomId] = useState("");
  const [useManualRoom, setUseManualRoom] = useState(false);

  // Form Configuration States
  const [startTime, setStartTime] = useState("10:00"); // 24h format for input type="time"
  const [endTime, setEndTime] = useState("08:00"); // 24h format for input type="time"
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

      const isCyclic = activeTab === "Cyclic";
      const scheduleName = isCyclic ? "Cyclic Optimization" : "Temp Maintainer";
      
      const payload = {
        name: scheduleName,
        roomId: finalRoomId,
        applyToFloor: null,
        startTime: convert24To12(startTime),
        endTime: convert24To12(endTime), // Off-time
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

      setSuccess(`Successfully created ${scheduleName} Schedule!`);
      
      // Redirect to active list
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

  const getRoomName = (roomId) => {
    const rm = rooms.find(r => r.roomId === roomId);
    return rm ? `${rm.roomName} (${rm.floorName})` : roomId;
  };

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pb-12 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* 1. MOCKUP HEADER BAR (Mobile Only) */}
      <div className="md:hidden flex items-center justify-between w-full z-10 pb-4">
        <button 
          onClick={() => router.push("/dashboard/rooms")}
          className="p-2 rounded-full bg-white border border-slate-200/50 text-[#FF6B35] hover:bg-slate-50 cursor-pointer shadow-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-slate-700" />
        </button>

        <h1 className="text-[18px] font-extrabold tracking-tight text-gray-900">
          Schedules
        </h1>

        <div className="w-8" />
      </div>

      {/* VIEW SELECTOR TOGGLE (Segmented Capsule Control) */}
      <div className="flex bg-white border border-slate-200/50 p-1 rounded-full w-full z-10 shadow-sm mb-4">
        <button
          onClick={() => setCurrentView("create")}
          className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
            currentView === "create" 
              ? "bg-[#FF6B35] text-white shadow-sm" 
              : "text-[#6E6E73] hover:text-[#1C1C1E]"
          }`}
        >
          New Rule
        </button>
        <button
          onClick={() => setCurrentView("list")}
          className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
            currentView === "list" 
              ? "bg-[#FF6B35] text-white shadow-sm" 
              : "text-[#6E6E73] hover:text-[#1C1C1E]"
          }`}
        >
          Active Rules
        </button>
      </div>

      {/* Notifications */}
      {(error || success) && (
        <div className="mb-4 space-y-1 select-none z-10">
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
      {/* 3. CONFIGURATION LAYOUT (Scrollable Viewport) */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-4 w-full select-none scrollbar-none z-10">
        
        {currentView === "list" ? (
          <div className="space-y-4 pb-4">
            {loadingSchedules ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Syncing rules...</span>
              </div>
            ) : schedules.length > 0 ? (
              schedules.map((sched) => (
                <div 
                  key={sched.scheduleId} 
                  className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200/50 shadow-sm p-5 flex flex-col gap-4 text-left"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-gray-900 tracking-tight">
                        {sched.name || "Climate Automation"}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                        Room: {getRoomName(sched.roomId)}
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
                        onClick={() => handleDeleteSchedule(sched.scheduleId)}
                        className="p-2 text-[#8E8E93] hover:text-red-600 active:scale-95 transition-all bg-slate-50 border border-slate-200/50 rounded-full cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Value Rows */}
                  <div className="border-t border-slate-100 pt-4 flex flex-col gap-2.5 text-xs text-slate-500 font-semibold">
                    <div className="flex justify-between">
                      <span>Schedule Type</span>
                      <span className="text-slate-800 font-bold uppercase tracking-wide">
                        {sched.cycles > 0 ? "Cyclic" : "Temp Maintainer"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Night Optimization</span>
                      <span className="text-slate-800 font-bold">
                        {sched.nightOptimization ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Repeat Days</span>
                      <span className="text-slate-800 font-bold">
                        {formatDays(sched.days)}
                      </span>
                    </div>
                    {sched.cycles > 0 ? (
                      <>
                        <div className="flex justify-between">
                          <span>Time Window</span>
                          <span className="text-slate-800">{sched.startTime} - {sched.endTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Target Temperature</span>
                          <span className="text-[#FF6B35] font-bold">{sched.targetTemp}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trigger Temperature</span>
                          <span className="text-slate-800">If Temp &gt; {sched.ifRoomTempAbove}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Interval Cycles</span>
                          <span className="text-slate-800">{sched.cycles} cycles ({sched.runtimeMinutes}m run, {sched.minOffTimeMinutes}m off)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>Time Window</span>
                          <span className="text-slate-800">{sched.startTime} - {sched.endTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Target Temperature</span>
                          <span className="text-[#FF6B35] font-bold">{sched.targetTemp}°C</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-8 border border-slate-200/50 border-dashed rounded-[24px] sm:rounded-[32px] select-none bg-white">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">No active automation rules.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            
            {/* Rule Type Selector Segmented Control */}
            <div className="flex bg-white border border-slate-200/50 p-1 rounded-full w-full shadow-sm">
              {["Cyclic", "Temp Maintainer"].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
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
                    className={`flex-1 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                      isActive 
                        ? "bg-[#FF6B35] text-white shadow-sm" 
                        : "text-[#6E6E73] hover:text-[#1C1C1E]"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Apple Home-style unified card list */}
            <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200/50 shadow-sm overflow-hidden p-2">
              
              {/* Row 0: Night Optimization Toggle */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="text-[14px] font-semibold text-slate-800">
                  Night Optimization Mode
                </span>
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

              {/* Row 1: Room Selection */}
              <div className="flex flex-col px-5 py-4 border-b border-slate-100 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-slate-800">Apply Target</span>
                  <button 
                    type="button"
                    onClick={() => setUseManualRoom(!useManualRoom)}
                    className="text-[10px] font-black uppercase tracking-wider text-[#FF6B35] hover:opacity-85 transition-opacity"
                  >
                    {useManualRoom ? "Use List" : "MANUAL ID"}
                  </button>
                </div>

                <div className="flex items-center justify-start mt-0.5">
                  {useManualRoom ? (
                    <input
                      type="text"
                      value={manualRoomId}
                      onChange={(e) => setManualRoomId(e.target.value)}
                      placeholder="Enter Room ID"
                      className="bg-transparent text-left text-[#FF6B35] text-sm font-semibold outline-none placeholder-slate-400 w-full"
                    />
                  ) : loadingRooms ? (
                    <span className="text-slate-400 text-xs flex items-center gap-1.5 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF6B35]" /> Syncing rooms...
                    </span>
                  ) : rooms.length > 0 ? (
                    <div className="relative flex items-center gap-1 cursor-pointer">
                      <select
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        className="appearance-none bg-transparent text-[#FF6B35] text-sm font-semibold outline-none cursor-pointer pr-5 w-auto"
                      >
                        {rooms.map((rm) => (
                          <option key={rm.roomId} value={rm.roomId} className="bg-white text-slate-800 text-left">
                            {rm.roomName} ({rm.floorName})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-0 pointer-events-none text-[#FF6B35] flex items-center">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">No rooms available</span>
                  )}
                </div>
              </div>

              {/* Row 2: Target Temp (common to both) */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="text-[14px] font-semibold text-slate-800">Target Temperature</span>
                <div className="flex items-center justify-end">
                  <input
                    type="number"
                    step="0.5"
                    value={targetTemp}
                    onChange={(e) => setTargetTemp(e.target.value)}
                    className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-0.5 max-w-[90px]"
                  />
                  <span className="text-slate-500 text-sm font-medium">°C</span>
                </div>
              </div>

              {/* ==================================== */}
              {/* CYCLIC FIELDS */}
              {/* ==================================== */}
              {activeTab === "Cyclic" && (
                <>
                  {/* Cycles */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <span className="text-[14px] font-semibold text-slate-800">Number of Cycles</span>
                    <input
                      type="number"
                      value={cycles}
                      onChange={(e) => setCycles(e.target.value)}
                      className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-1 max-w-[90px]"
                    />
                  </div>

                  {/* Runtime */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <span className="text-[14px] font-semibold text-slate-800">Minimum Run Time</span>
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        value={runtimeMinutes}
                        onChange={(e) => setRuntimeMinutes(e.target.value)}
                        className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-1 max-w-[90px]"
                      />
                      <span className="text-slate-500 text-sm font-medium">min</span>
                    </div>
                  </div>

                  {/* Min OFF Time */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <span className="text-[14px] font-semibold text-slate-800">Minimum OFF Time</span>
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        value={minOffTimeMinutes}
                        onChange={(e) => setMinOffTimeMinutes(e.target.value)}
                        className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-1 max-w-[90px]"
                      />
                      <span className="text-slate-500 text-sm font-medium">min</span>
                    </div>
                  </div>

                  {/* Temp Threshold */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <span className="text-[14px] font-semibold text-slate-800">Trigger Temperature Threshold</span>
                    <div className="flex items-center justify-end">
                      <input
                        type="number"
                        step="0.5"
                        value={ifRoomTempAbove}
                        onChange={(e) => setIfRoomTempAbove(e.target.value)}
                        className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-0.5 max-w-[90px]"
                      />
                      <span className="text-slate-500 text-sm font-medium">°C</span>
                    </div>
                  </div>
                </>
              )}

              {/* Start Time (common to both) */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="text-[14px] font-semibold text-slate-800">Start Time</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-1 max-w-[140px] cursor-pointer"
                />
              </div>

              {/* Offtime for Schedule / End Time (common to both) */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="text-[14px] font-semibold text-slate-800">Offtime for Schedule</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-transparent text-right text-[#FF6B35] text-sm font-semibold outline-none pr-1 max-w-[140px] cursor-pointer"
                />
              </div>

              {/* Repeat Days of Week (common to both) */}
              <div className="flex flex-col px-5 py-4 gap-2.5">
                <span className="text-[14px] font-semibold text-slate-800">Repeat Days</span>
                <div className="flex justify-between items-center gap-1.5 mt-1">
                  {["S", "M", "T", "W", "T", "F", "S"].map((dayName, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#FF6B35] border-transparent text-white shadow-sm"
                            : "bg-[#F5F5F7] border-slate-200 text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {dayName}
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
      {/* 4. SAVING DISPATCH ACTION BUTTON */}
      {/* ========================================================================= */}
      {currentView === "create" && (
        <button
          onClick={handleSaveSchedule}
          disabled={actionLoading}
          className="w-full py-4 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 active:scale-[0.98] text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-lg shadow-[#FF6B35]/15 text-center flex items-center justify-center gap-2 mt-2 shrink-0 z-10 animate-fadeIn"
        >
          {actionLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Rule</span>
          )}
        </button>
      )}

    </div>
  );
}

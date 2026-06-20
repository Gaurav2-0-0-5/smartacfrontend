"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  Settings, 
  Power, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  Plus,
  X
} from "lucide-react";
import { AC_BRANDS } from "@/constants/enums";

export default function AllRoomsPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  
  const [activeProperty, setActiveProperty] = useState(null);
  const [floors, setFloors] = useState([]);
  const [activeFloor, setActiveFloor] = useState(null);
  const [showFloorDropdown, setShowFloorDropdown] = useState(false);
  const [rooms, setRooms] = useState([]);
  
  // Filtering and display states
  const [activeTab, setActiveTab] = useState("all"); // "all" | "occupied" | "vacant"
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add Room modal states
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomBrand, setNewRoomBrand] = useState("VOLTAS");
  const [addRoomLoading, setAddRoomLoading] = useState(false);
  const [addRoomError, setAddRoomError] = useState("");
  const [addRoomSuccessToken, setAddRoomSuccessToken] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DATA COLLECTION & HIERARCHY ACCUMULATION
  // =========================================================================

  const fetchAllRooms = useCallback(async (propertyId) => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      // A. Fetch floors
      const floorsRes = await fetch(`${apiUrl}/api/properties/${propertyId}/floors`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const floorsData = await floorsRes.json();
      if (!floorsRes.ok) throw new Error(floorsData.error || "Failed to load floors.");

      const floorsList = floorsData.floors || [];
      floorsList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setFloors(floorsList);

      // Default to the first floor
      if (floorsList.length > 0) {
        setActiveFloor(floorsList[0]);
      } else {
        setActiveFloor(null);
      }

      const aggregatedRooms = [];

      // B. Retrieve rooms from all floors
      for (const floor of floorsList) {
        try {
          const roomsRes = await fetch(`${apiUrl}/api/properties/${propertyId}/floors/${floor.floorId}/rooms`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.rooms || [];
          
          roomsList.forEach(room => {
            aggregatedRooms.push({
              ...room,
              floorName: floor.name,
              floorId: floor.floorId
            });
          });
        } catch (rErr) {
          console.error(`Failed to load rooms for floor ${floor.name}:`, rErr);
        }
      }

      // Sort alphabetically
      aggregatedRooms.sort((a, b) => {
        return (a.name || a.roomName).localeCompare(b.name || b.roomName, undefined, { numeric: true });
      });

      setRooms(aggregatedRooms);
    } catch (err) {
      console.error("Rooms portfolio error:", err);
      setError(err.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  // Synchronize on active property change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivePropertyChange = (e) => {
      const prop = e.detail;
      setActiveProperty(prop);
      if (prop) {
        fetchAllRooms(prop.propertyId);
      } else {
        setRooms([]);
        setFloors([]);
        setActiveFloor(null);
        setLoading(false);
      }
    };

    window.addEventListener("activePropertyChange", handleActivePropertyChange);
    
    // Auto hydrate active local workspace
    const tryHydrateWorkspace = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${apiUrl}/api/properties`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.properties && data.properties.length > 0) {
          setActiveProperty(data.properties[0]);
          fetchAllRooms(data.properties[0].propertyId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };
    
    tryHydrateWorkspace();

    return () => {
      window.removeEventListener("activePropertyChange", handleActivePropertyChange);
    };
  }, [fetchAllRooms, getToken, apiUrl]);

  // =========================================================================
  // 2. QUICK INDIVIDUAL POWER Toggles
  // =========================================================================

  const handleQuickToggle = async (e, room) => {
    e.preventDefault();
    e.stopPropagation();

    if (actionLoading) return;

    const isCurrentlyOn = room.acPowered === true || room.power === "on";
    const nextPower = isCurrentlyOn ? "off" : "on";
    const propertyId = activeProperty?.propertyId;
    const roomId = room.roomId;
    const deviceId = room.deviceId || "";

    // Optimistic UI update
    setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, power: nextPower, acPowered: nextPower === "on" } : r));

    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired.");

      const response = await fetch(`${apiUrl}/api/device/command`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId,
          roomId,
          deviceId,
          action: "power",
          value: nextPower
        })
      });

      if (!response.ok) throw new Error("Command rejected.");
      
      setSuccess(`Quick set ${room.name || room.roomName} to ${nextPower.toUpperCase()}`);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      console.error(err);
      setError("Failed to override appliance state.");
      // Rollback
      setRooms(prev => prev.map(r => r.roomId === roomId ? { ...r, power: room.power, acPowered: room.acPowered } : r));
    }
  };

  // =========================================================================
  // 3. BROADCAST MASTER POWER ACTIONS
  // =========================================================================

  const handleMasterBroadcast = async (targetPowerState) => {
    if (rooms.length === 0 || !activeProperty || !activeFloor) return;

    setError("");
    setSuccess("");
    setActionLoading(true);

    const propertyId = activeProperty.propertyId;
    const floorRooms = rooms.filter(r => r.floorId === activeFloor.floorId);
    
    const targetRooms = floorRooms.filter(r => {
      const isTargetOn = r.acPowered === true || r.power === "on";
      if (activeTab === "occupied") return isTargetOn;
      if (activeTab === "vacant") return !isTargetOn;
      return true; // "all"
    });

    if (targetRooms.length === 0) {
      setError("No matching rooms on this view filter to broadcast commands.");
      setActionLoading(false);
      return;
    }

    // Optimistically update
    const originalRooms = [...rooms];
    setRooms(prev => prev.map(r => {
      const isTarget = targetRooms.some(tr => tr.roomId === r.roomId);
      return isTarget ? { ...r, power: targetPowerState, acPowered: targetPowerState === "on" } : r;
    }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const commandPromises = targetRooms.map(room => {
        const deviceId = room.deviceId || "";
        return fetch(`${apiUrl}/api/device/command`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            propertyId,
            roomId: room.roomId,
            deviceId,
            action: "power",
            value: targetPowerState
          })
        });
      });

      await Promise.all(commandPromises);
      
      setSuccess(`Successfully broadcasted Turn ${targetPowerState.toUpperCase()} All to ${activeFloor.name} matching hardware!`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Master broadcast failed:", err);
      setError("Failed to broadcast master overrides to all devices.");
      setRooms(originalRooms); // Rollback
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // 4. ADD NEW ROOM
  // =========================================================================

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setAddRoomError("Room name is required.");
      return;
    }
    if (!activeProperty || !activeFloor) {
      setAddRoomError("Property and floor must be selected.");
      return;
    }

    setAddRoomLoading(true);
    setAddRoomError("");
    setAddRoomSuccessToken("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}/floors/${activeFloor.floorId}/rooms`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomName: newRoomName.trim(),
          acBrand: newRoomBrand
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create room.");

      setAddRoomSuccessToken(data.claimToken || "");
      setNewRoomName("");
      // Re-fetch all rooms
      fetchAllRooms(activeProperty.propertyId);
    } catch (err) {
      console.error(err);
      setAddRoomError(err.message || "An error occurred.");
    } finally {
      setAddRoomLoading(false);
    }
  };

  // =========================================================================
  // 5. COMPUTED FILTERS & COUNTS SCOPED TO SELECTED FLOOR
  // =========================================================================

  const floorRooms = rooms.filter(room => room.floorId === activeFloor?.floorId);

  const isRoomPowerOn = (r) => r.acPowered === true || r.power === "on";

  const countAll = floorRooms.length;
  const countOccupied = floorRooms.filter(r => isRoomPowerOn(r)).length;
  const countVacant = floorRooms.filter(r => !isRoomPowerOn(r)).length;

  const filteredRooms = floorRooms.filter(room => {
    if (activeTab === "occupied") return isRoomPowerOn(room);
    if (activeTab === "vacant") return !isRoomPowerOn(room);
    return true; // "all"
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-transparent text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
          <p className="text-xs font-semibold text-slate-500">Loading floor coordinates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-4 sm:space-y-5 text-left select-none animate-fadeIn flex flex-col pb-12 min-h-[80vh]">
      
      {/* Backdrops */}
      <div className="absolute top-0 left-10 w-64 h-64 bg-[#FF6B35]/[0.01] rounded-full blur-[80px] pointer-events-none" />

      {/* A. HEADER ROW */}
      <div className="flex items-center justify-between w-full z-30 px-1">
        <button 
          onClick={() => router.back()}
          className="p-2.5 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 text-slate-700 cursor-pointer transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        {/* Dynamic Floor Dropdown Title */}
        <div className="relative">
          <button 
            onClick={() => setShowFloorDropdown(!showFloorDropdown)}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-900 hover:text-slate-700 transition-colors cursor-pointer select-none focus:outline-none bg-white border border-slate-200/50 px-4 py-3 rounded-full shadow-sm"
          >
            <span>{activeFloor ? activeFloor.name : "Select Floor"}</span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          </button>

          {/* Floor Dropdown portal */}
          {showFloorDropdown && floors.length > 0 && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-slate-200 rounded-[20px] shadow-xl z-50 p-2 min-w-[160px] animate-fadeIn">
              {floors.map((floor) => (
                <button
                  key={floor.floorId}
                  onClick={() => {
                    setActiveFloor(floor);
                    setShowFloorDropdown(false);
                  }}
                  className={`w-full text-center px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer block ${
                    activeFloor?.floorId === floor.floorId
                      ? "bg-[#FF6B35] text-white shadow-sm"
                      : "text-slate-655 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {floor.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeFloor ? (
          <button 
            onClick={() => setIsAddRoomOpen(true)}
            className="p-2.5 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 text-slate-750 cursor-pointer transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* B. DYNAMIC FILTERS SEGMENT TABS */}
      <div className="grid grid-cols-3 gap-1 bg-white/70 border border-slate-200/30 p-1.5 rounded-2xl z-10 shadow-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#FF6B35] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All ({countAll})
        </button>
        <button
          onClick={() => setActiveTab("occupied")}
          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "occupied"
              ? "bg-[#FF6B35] text-white shadow-sm shadow-[#FF6B35]/10"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Occupied ({countOccupied})
        </button>
        <button
          onClick={() => setActiveTab("vacant")}
          className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "vacant"
              ? "bg-[#FF6B35] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Vacant ({countVacant})
        </button>
      </div>

      {/* Status Alert Panels */}
      {(error || success) && (
        <div className="space-y-2 z-10">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2.5 p-4 rounded-[20px] bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* C. RESPONSIVE LIGHT-MODE ROOMS GRID */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white border border-slate-200/50 rounded-[32px] p-12 text-center flex flex-col items-center justify-center gap-4 flex-1 z-10 shadow-sm">
          <span className="text-[11px] text-gray-450 font-black tracking-wider uppercase">No appliances found on this floor view.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 z-10 pb-36 md:pb-6">
          {filteredRooms.map((room) => {
            const isPowerOn = room.acPowered === true || room.power === "on";
            const displayTemp = (room.currentTemp !== undefined && room.currentTemp !== null && room.currentTemp !== 0)
              ? (typeof room.currentTemp === 'number' ? room.currentTemp.toFixed(1) : room.currentTemp)
              : "24.0";

            return (
              <Link
                key={room.roomId}
                href={`/dashboard/rooms/${room.roomId}`}
                className="bg-white border border-slate-200/50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 flex flex-col justify-between min-h-[110px] sm:min-h-[140px] shadow-sm relative group active:scale-[0.98] transition-all hover:border-[#FF6B35]/40"
              >
                
                {/* Top left room name & Top right power button */}
                <div className="flex items-start justify-between w-full">
                  <span className="text-sm font-extrabold text-gray-800 pl-0.5 pt-0.5 tracking-tight group-hover:text-[#FF6B35] transition-colors truncate">
                    {room.name || room.roomName}
                  </span>

                  <button
                    onClick={(e) => handleQuickToggle(e, room)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border ${
                      isPowerOn 
                        ? "bg-[#FF6B35] border-transparent text-white shadow-md shadow-[#FF6B35]/15 active:scale-90" 
                        : "bg-[#F5F5F7] border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-[#EAEAEA] active:scale-90"
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom stats layout */}
                <div className="flex flex-col text-left mt-4 w-full">
                  {isPowerOn ? (
                    <>
                      <span className="text-2xl font-black text-gray-900 leading-none tracking-tight">
                        {displayTemp}<span className="text-sm font-bold text-gray-400 pl-0.5">°C</span>
                      </span>
                      <span className="text-[8.5px] font-black text-[#FF6B35] uppercase tracking-widest mt-2 leading-none">
                        AC Active
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1 pb-1">
                      Standby
                    </span>
                  )}
                </div>

              </Link>
            );
          })}
        </div>
      )}

      {/* D. STICKY MASTER BROADCAST ACTIONS FOOTER */}
      {rooms.length > 0 && activeFloor && (
        <div className="fixed bottom-[68px] left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto md:w-full z-20 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[24px] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg md:shadow-sm mt-auto md:mt-4">
          <div className="flex flex-col text-center sm:text-left">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Master Floor Control</span>
            <span className="text-xs font-bold text-gray-700 mt-0.5">Broadcast power commands to all rooms</span>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => handleMasterBroadcast("on")}
              disabled={actionLoading}
              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 sm:py-3 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-md shadow-[#FF6B35]/15 active:scale-95 text-center"
            >
              Turn ON All
            </button>
            <button
              onClick={() => handleMasterBroadcast("off")}
              disabled={actionLoading}
              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 sm:py-3 bg-[#F5F5F7] hover:bg-[#EAEAEA] disabled:opacity-50 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200/60 transition-all cursor-pointer active:scale-95 text-center"
            >
              Turn OFF All
            </button>
          </div>
        </div>
      )}

      {/* E. ADD ROOM MODAL */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 p-6 max-w-sm w-full animate-fadeIn shadow-2xl relative text-left">
            <button 
              onClick={() => {
                setIsAddRoomOpen(false);
                setAddRoomError("");
                setAddRoomSuccessToken("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {addRoomSuccessToken ? (
              <div className="flex flex-col items-center text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Room Created!</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">Use the claim token below to pair your ESP32 device.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl px-6 py-4 w-full">
                  <span className="text-3xl font-black tracking-widest text-[#FF6B35] font-mono">
                    {addRoomSuccessToken}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAddRoomOpen(false);
                    setAddRoomSuccessToken("");
                  }}
                  className="w-full py-3 bg-[#FF6B35] hover:bg-[#E0531F] text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer active:scale-95 text-center shadow-md shadow-[#FF6B35]/15"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddRoom} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Add Room</h3>
                  <p className="text-[10px] text-slate-450 font-black uppercase tracking-widest">Selected Floor: {activeFloor?.name}</p>
                </div>

                {addRoomError && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{addRoomError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                    Room Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Suite 302"
                    className="w-full bg-[#F5F5F7] border border-slate-200/60 text-xs font-bold text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#FF6B35]/50 transition-colors shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                    AC Brand Profile
                  </label>
                  <div className="relative">
                    <select
                      value={newRoomBrand}
                      onChange={(e) => setNewRoomBrand(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-slate-200/60 text-xs font-bold text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#FF6B35]/50 transition-colors appearance-none cursor-pointer shadow-sm animate-fadeIn"
                    >
                      {Object.values(AC_BRANDS).map((brand) => (
                        <option key={brand} value={brand} className="bg-white text-slate-700">
                          {brand}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addRoomLoading}
                  className="w-full py-3 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2 shadow-md shadow-[#FF6B35]/15"
                >
                  {addRoomLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Room"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );;
}

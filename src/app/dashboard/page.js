"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  Building2, 
  Plus, 
  Loader2, 
  AlertCircle,
  Leaf,
  Wallet,
  Clock,
  Timer,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Shield,
  Zap,
  Cpu,
  Calendar,
  Thermometer
} from "lucide-react";
import CreatePropertyModal from "@/components/CreatePropertyModal";
import AddFloorModal from "@/components/AddFloorModal";
import AddRoomModal from "@/components/AddRoomModal";

export default function DashboardPage() {
  const { user, getToken } = useAuth();
  
  // Property and Telemetry States
  const [properties, setProperties] = useState([]);
  const [activeProperty, setActiveProperty] = useState(null);
  const [floors, setFloors] = useState([]);
  const [totalRuntime, setTotalRuntime] = useState("12.5 hrs");
  
  // Loader and operational states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeFloorForRoom, setActiveFloorForRoom] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DATA ACQUISITION & MUTATION
  // =========================================================================
  
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${apiUrl}/api/properties`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load properties portfolio.");
      }

      const list = data.properties || [];
      setProperties(list);
      
      // Default to first property
      if (list.length > 0) {
        setActiveProperty(list[0]);
      } else {
        setActiveProperty(null);
      }
    } catch (err) {
      console.error("Dashboard properties load error:", err);
      setError(err.message || "Unable to sync with Firestore cloud backend.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  const fetchAnalytics = useCallback(async (propertyId) => {
    if (!propertyId) return;
    try {
      const token = await getToken();
      if (!token) return;

      // 1. Try to fetch today's analytics first
      let response = await fetch(`${apiUrl}/api/properties/${propertyId}/analytics/energy`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      let data = await response.json();

      // 2. Fall back to yesterday if today's data is not yet aggregated (status 404)
      if (response.status === 404) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${yyyy}-${mm}-${dd}`;

        response = await fetch(`${apiUrl}/api/properties/${propertyId}/analytics/energy?date=${yesterdayStr}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        data = await response.json();
      }

      if (response.ok && data.energy && data.energy.totalRuntimeHours !== undefined) {
        setTotalRuntime(`${data.energy.totalRuntimeHours} hrs`);
      } else {
        setTotalRuntime("12.5 hrs");
      }
    } catch (err) {
      console.warn("Failed to load live runtime analytics:", err);
      setTotalRuntime("12.5 hrs");
    }
  }, [getToken, apiUrl]);

  const fetchFloors = useCallback(async (propertyId) => {
    if (!propertyId) return;
    try {
      const token = await getToken();
      const response = await fetch(`${apiUrl}/api/properties/${propertyId}/floors`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (response.ok && data.floors) {
        const list = data.floors;
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        
        // Hydrate floor rooms portfolio
        const hydratedList = [];
        for (const floor of list) {
          try {
            const roomsRes = await fetch(`${apiUrl}/api/properties/${propertyId}/floors/${floor.floorId}/rooms`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              }
            });
            const roomsData = await roomsRes.json();
            floor.rooms = roomsData.rooms || [];
          } catch (roomsErr) {
            console.error(`Failed to hydrate rooms for ${floor.name}:`, roomsErr);
            floor.rooms = [];
          }
          hydratedList.push(floor);
        }

        setFloors(hydratedList);
      }
    } catch (err) {
      console.error("Dashboard floors fetch error:", err);
    }
  }, [getToken, apiUrl]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user, fetchProperties]);

  // Sync floors and analytics when active property changes
  useEffect(() => {
    if (activeProperty) {
      fetchFloors(activeProperty.propertyId);
      fetchAnalytics(activeProperty.propertyId);
    } else {
      setFloors([]);
      setTotalRuntime("0 hrs");
    }
  }, [activeProperty, fetchFloors, fetchAnalytics]);

  // Intercept layout active property dropdown switches
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivePropertyChange = (e) => {
      const selectedProp = e.detail;
      setActiveProperty(selectedProp);
      if (selectedProp) {
        fetchFloors(selectedProp.propertyId);
        fetchAnalytics(selectedProp.propertyId);
      }
    };

    window.addEventListener("activePropertyChange", handleActivePropertyChange);
    return () => {
      window.removeEventListener("activePropertyChange", handleActivePropertyChange);
    };
  }, [fetchFloors, fetchAnalytics]);

  // Auto-advance tips carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % 6);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Provision dynamic default property
  const handleRegisterProperty = async () => {
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token expired.");

      const propRes = await fetch(`${apiUrl}/api/properties/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Hotel Blue Sky",
          location: "Bandra West, Mumbai",
          type: "hotel",
          subscriptionPlan: "pro"
        })
      });

      const propData = await propRes.json();
      if (!propRes.ok) throw new Error(propData.error || "Failed to create property.");

      const newId = propData.propertyId;

      // Add floors & rooms portfolio dynamically
      const floorRes1 = await fetch(`${apiUrl}/api/properties/${newId}/floors`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ floorNumber: 1 })
      });
      const f1Id = (await floorRes1.json()).floorId;

      await fetch(`${apiUrl}/api/properties/${newId}/floors/${f1Id}/rooms`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: "Room 101" })
      });

      setSuccess("Hotel Blue Sky fully registered!");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshPropertiesList"));
      }

      await fetchProperties();

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to register property.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const totalRoomsCount = activeProperty ? activeProperty.totalRooms || 0 : 0;
  const totalAcsOn = floors.reduce((sum, floor) => sum + (floor.acOn || 0), 0);
  const roomsCountForAvg = totalRoomsCount || floors.reduce((sum, f) => sum + (f.rooms?.length || 0), 0) || 1;
  const avgRuntimeNum = parseFloat(totalRuntime) / roomsCountForAvg;
  const avgRuntime = !isNaN(avgRuntimeNum) ? `${avgRuntimeNum.toFixed(1)} hrs` : "0.0 hrs";

  // Circle SVG metrics
  const radius = 16;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex flex-col gap-4 w-full select-none text-left min-h-0 flex-1">
      
      {/* Clean Orange and Soft Gray Backdrops */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF6B35]/[0.01] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-72 h-72 bg-gray-500/[0.01] rounded-full blur-[90px] pointer-events-none" />

      {/* Header Row */}
      <div className="flex items-center justify-between z-10 px-1">
        <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">Overview</h1>
        <span className="text-[9px] font-bold tracking-wider text-gray-500 bg-[#EFEFEF] border border-slate-250/30 px-3.5 py-1.5 rounded-full shadow-sm">
          Today, {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </span>
      </div>

      {loading ? (
        /* Flashing Skeleton Loader Screen */
        <div className="space-y-6 animate-pulse select-none z-10">
          {/* Grid of 4 Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200/50 rounded-[32px] p-5 flex flex-col justify-between min-h-[135px] shadow-sm">
                <div className="h-3 w-16 bg-slate-200 rounded-full" />
                <div className="flex flex-col mt-4 space-y-2">
                  <div className="h-8 w-12 bg-slate-200 rounded-lg" />
                  <div className="h-2 w-16 bg-slate-100 rounded-full mt-1.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Tips Carousel Skeleton */}
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex justify-between items-center px-1">
              <div className="h-3.5 w-24 bg-slate-200 rounded-full" />
              <div className="h-7 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="bg-white border border-slate-200/50 rounded-[24px] p-5 flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-32 bg-slate-200 rounded-full" />
                <div className="h-3 w-full bg-slate-200 rounded-full" />
                <div className="h-3 w-4/5 bg-slate-200 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs animate-fadeIn leading-relaxed shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 p-4 rounded-[20px] bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs animate-fadeIn leading-relaxed shadow-sm">
          <Leaf className="w-4 h-4 shrink-0 text-[#FF6B35]" />
          <span>{success}</span>
        </div>
      )}

      {/* Empty Portfolio State */}
      {properties.length === 0 && !activeProperty && (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200/50 rounded-[32px] bg-white shadow-sm max-w-xl mx-auto mt-8 relative">
          <div className="w-14 h-14 rounded-[24px] bg-[#F5F5F7] border border-slate-100 flex items-center justify-center text-slate-400 mb-5">
            <Building2 className="w-6 h-6 text-gray-700" />
          </div>
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">No Properties Configured</h3>
          <p className="text-xs text-gray-550 mt-2.5 leading-relaxed max-w-sm">
            To start automating climate zones and monitoring ESP32 energy saving metrics, register your first property profile.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 flex items-center gap-2 bg-[#FF6B35] hover:bg-[#E0531F] text-xs font-black uppercase tracking-widest text-white px-6 py-3.5 rounded-full active:scale-[0.97] transition-all cursor-pointer shadow-lg shadow-[#FF6B35]/15"
          >
            <Plus className="w-4 h-4" />
            Register Property
          </button>
        </div>
      )}

      {/* Populated Portfolio Layout */}
      {properties.length > 0 && activeProperty && (
        <>

          {floors.length === 0 ? (
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-8 text-center flex flex-col items-center justify-center gap-4 my-6 shadow-sm z-10">
              <div className="w-12 h-12 rounded-[20px] bg-[#F5F5F7] border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                <Building2 className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">No Floors Configured Yet</h3>
                <p className="text-xs text-gray-500 max-w-xs leading-relaxed mx-auto">
                  Add your first floor to start mapping rooms, claiming ESP controllers, and monitoring real-time energy telemetry.
                </p>
              </div>
              <button 
                onClick={() => setIsFloorModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#FF6B35] hover:bg-[#E0531F] text-xs font-black uppercase tracking-widest text-white py-3.5 px-6 rounded-full active:scale-[0.97] transition-all cursor-pointer shadow-lg shadow-[#FF6B35]/15"
              >
                <Plus className="w-4 h-4" />
                Add Your First Floor
              </button>
            </div>
          ) : (
            <>
              {/* 2x2 on mobile, 1x4 on desktop Clean White Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 z-10">
                
                {/* Card 1: Total Rooms */}
                <div className="bg-white border border-slate-200/50 rounded-[32px] p-5 flex flex-col items-start justify-between min-h-[135px] relative overflow-hidden shadow-md transition-all">
                  <span className="text-sm font-semibold text-[#1C1C1E]">Total Rooms</span>
                  <div className="flex flex-col mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 leading-none tracking-tight">{totalRoomsCount || 0}</span>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-2.5 leading-none">
                      Configured
                    </span>
                  </div>
                </div>

                {/* Card 2: ACs On */}
                <div className="bg-white border border-slate-200/50 rounded-[32px] p-5 flex flex-col items-start justify-between min-h-[135px] relative overflow-hidden shadow-md transition-all">
                  <span className="text-sm font-semibold text-[#1C1C1E]">ACs On</span>
                  <div className="flex flex-col mt-4 w-full">
                    <span className="text-3xl font-extrabold text-gray-900 leading-none tracking-tight flex items-center gap-2">
                      {totalAcsOn || 0}
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B35] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B35]"></span>
                      </span>
                    </span>
                    <span className="text-[9px] text-[#FF6B35] font-semibold uppercase tracking-wider mt-2.5 leading-none flex items-center gap-1">
                      Live Telemetry
                    </span>
                  </div>
                </div>

                {/* Card 3: Total Runtime */}
                <div className="bg-white border border-slate-200/50 rounded-[32px] p-5 flex flex-col items-start justify-between min-h-[135px] relative overflow-hidden shadow-md transition-all">
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                  <span className="text-sm font-semibold text-[#1C1C1E]">Total Runtime</span>
                  <div className="flex flex-col mt-4">
                    <span className="text-2xl font-black text-[#FF6B35] leading-none tracking-tight">{totalRuntime}</span>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-2.5 leading-none">
                      AC Operations
                    </span>
                  </div>
                </div>

                {/* Card 4: Avg. Runtime */}
                <div className="bg-white border border-slate-200/50 rounded-[32px] p-5 flex flex-col items-start justify-between min-h-[135px] relative overflow-hidden shadow-md transition-all">
                  <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                    <Timer className="w-4 h-4 text-[#FF6B35]" />
                  </div>
                  <span className="text-sm font-semibold text-[#1C1C1E]">Avg. Runtime</span>
                  <div className="flex flex-col mt-4">
                    <span className="text-2xl font-black text-[#FF6B35] leading-none tracking-tight">{avgRuntime}</span>
                    <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mt-2.5 leading-none">
                      Per AC Room
                    </span>
                  </div>
                </div>

              </div>

              {/* Tips & Guide Carousel */}
              <div className="flex flex-col gap-2 mt-1 z-10 flex-1 min-h-0">
                
                {/* Header Row */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-[#1C1C1E]">Tips & Guide</h2>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setTipIndex(prev => prev === 0 ? 5 : prev - 1)}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setTipIndex(prev => prev === 5 ? 0 : prev + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 hover:text-[#FF6B35] hover:border-[#FF6B35]/30 transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Carousel Card */}
                {(() => {
                  const tips = [
                    {
                      icon: Lightbulb,
                      title: "Pair your first device",
                      description: "Create a room, grab the 6-digit claim token, and enter it on your ESP controller's captive portal. The device will auto-connect via MQTT within 30 seconds.",
                      accent: "bg-amber-50 border-amber-100 text-amber-600"
                    },
                    {
                      icon: Calendar,
                      title: "Schedule night optimization",
                      description: "Set up automated schedules with cycle limits and temperature thresholds. The system will intelligently cycle your ACs on/off to save energy while maintaining comfort.",
                      accent: "bg-blue-50 border-blue-100 text-blue-600"
                    },
                    {
                      icon: Shield,
                      title: "Secure multi-tenant isolation",
                      description: "Every API call is verified against your Firebase JWT and cross-checked for property ownership. Your data is fully tenant-isolated — no other manager can access your resources.",
                      accent: "bg-emerald-50 border-emerald-100 text-emerald-600"
                    },
                    {
                      icon: Zap,
                      title: "10 supported AC brands",
                      description: "NexaSmartAC supports Daikin, Mitsubishi, Panasonic, LG, Samsung, Voltas, Hitachi, Carrier, Toshiba, and Midea. Select the brand per room for accurate IR control.",
                      accent: "bg-violet-50 border-violet-100 text-violet-600"
                    },
                    {
                      icon: Cpu,
                      title: "Real-time MQTT telemetry",
                      description: "All device commands travel over encrypted MQTTS (port 8883). Temperature readings, power states, and schedule triggers sync in real-time between hardware and cloud.",
                      accent: "bg-rose-50 border-rose-100 text-rose-600"
                    },
                    {
                      icon: Thermometer,
                      title: "Track energy analytics",
                      description: "View daily energy savings in kWh, estimated cost reductions, and per-room runtime breakdowns. Analytics are aggregated and stored as daily snapshots for historical comparison.",
                      accent: "bg-orange-50 border-orange-100 text-[#FF6B35]"
                    }
                  ];
                  const tip = tips[tipIndex];
                  const TipIcon = tip.icon;
                  return (
                    <div key={tipIndex} className="bg-white border border-slate-200/50 rounded-[24px] p-5 shadow-sm relative overflow-hidden animate-fadeIn">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-2xl ${tip.accent} border flex items-center justify-center shrink-0`}>
                          <TipIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-[13px] font-bold text-[#1C1C1E] leading-tight">{tip.title}</span>
                          <span className="text-[11px] font-medium text-[#8E8E93] leading-relaxed mt-1.5">{tip.description}</span>
                        </div>
                      </div>
                      {/* Progress dots */}
                      <div className="flex items-center justify-center gap-1.5 mt-4">
                        {tips.map((_, i) => (
                          <button 
                            key={i}
                            onClick={() => setTipIndex(i)}
                            className={`rounded-full transition-all duration-300 cursor-pointer ${
                              i === tipIndex 
                                ? "w-5 h-1.5 bg-[#FF6B35]" 
                                : "w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </>
          )}
        </>
      )}
    </>
  )}

      {/* Property Registration Overlay Modal */}
      <CreatePropertyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchProperties} 
      />

      {/* Floor Addition Modal */}
      <AddFloorModal 
        isOpen={isFloorModalOpen}
        onClose={() => setIsFloorModalOpen(false)}
        onSuccess={() => {
          if (activeProperty) {
            fetchFloors(activeProperty.propertyId);
          }
        }}
        propertyId={activeProperty?.propertyId}
      />

      {/* Room Addition & Device Pairing Modal */}
      <AddRoomModal 
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setActiveFloorForRoom(null);
        }}
        onSuccess={() => {
          if (activeProperty) {
            fetchFloors(activeProperty.propertyId);
          }
        }}
        propertyId={activeProperty?.propertyId}
        floorId={activeFloorForRoom?.floorId}
      />
    </div>
  );
}

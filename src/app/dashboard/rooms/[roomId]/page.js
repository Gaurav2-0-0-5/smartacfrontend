"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Loader2, 
  AlertCircle, 
  Power, 
  RotateCw, 
  Wind,
  Settings,
  Fan,
  Menu,
  ChevronDown,
  X,
  Cpu,
  Trash2,
  Minus,
  Plus
} from "lucide-react";
import { AC_BRANDS, AC_BRAND_LABELS } from "@/constants/enums";

const AC_MODES = ["cool", "heat", "fan", "auto", "dry"];
const FAN_SPEEDS = ["auto", "low", "medium", "high"];

export default function RoomControlPage() {
  const params = useParams();
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  const roomId = params.roomId;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Resolved Hierarchy Identifiers
  const [parentPropertyId, setParentPropertyId] = useState(null);
  const [parentFloorId, setParentFloorId] = useState(null);
  const [deviceId, setDeviceId] = useState("");
  const [room, setRoom] = useState(null);

  // Dynamic Telemetry States
  const [currentTemp, setCurrentTemp] = useState(24);
  const [targetTemp, setTargetTemp] = useState(24); // Defaults to mockup 24
  const [mode, setMode] = useState("cool");
  const [fanSpeed, setFanSpeed] = useState("auto");
  const [swing, setSwing] = useState("on"); // Defaults to mockup swing on
  const [power, setPower] = useState("on"); // Defaults to mockup power on
  const [selectedBrand, setSelectedBrand] = useState(AC_BRANDS.VOLTAS || 'VOLTAS');

  // Manage room states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editRoomName, setEditRoomName] = useState("");
  const [editAcBrand, setEditAcBrand] = useState("");
  const [editClaimToken, setEditClaimToken] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  // Operational states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dialRef = useRef(null);

  useEffect(() => {
    if (room) {
      setEditRoomName(room.name || room.roomName || "");
      setEditAcBrand(room.acBrand || "VOLTAS");
      setEditClaimToken(room.claimToken || "");
    }
  }, [room, isSettingsOpen]);

  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");
    setModalLoading(true);

    if (!editRoomName.trim()) {
      setModalError("Please specify a room name.");
      setModalLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${parentPropertyId}/floors/${parentFloorId}/rooms/${room?.roomId || roomId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomName: editRoomName.trim(),
          acBrand: editAcBrand
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update room settings.");
      }

      setModalSuccess("Room settings saved successfully.");
      setRoom(prev => ({ ...prev, name: editRoomName.trim(), roomName: editRoomName.trim(), acBrand: editAcBrand }));
      setSelectedBrand(editAcBrand);
      
      // Auto close after 1.5s
      setTimeout(() => {
        setModalSuccess("");
        setIsSettingsOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Update room error:", err);
      setModalError(err.message || "Failed to update room.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRegenerateToken = async () => {
    setModalError("");
    setModalSuccess("");
    setModalLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${parentPropertyId}/floors/${parentFloorId}/rooms/${room?.roomId || roomId}/regenerateToken`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to regenerate token.");
      }

      setEditClaimToken(data.claimToken);
      setRoom(prev => prev ? { ...prev, claimToken: data.claimToken } : null);
      setModalSuccess("Claim token regenerated!");
      setTimeout(() => setModalSuccess(""), 3000);
    } catch (err) {
      console.error("Regenerate token error:", err);
      setModalError(err.message || "Failed to regenerate pairing token.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!confirm("Are you sure you want to delete this room and unpair its AC device? This action is permanent.")) return;

    setModalError("");
    setModalSuccess("");
    setModalLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${parentPropertyId}/floors/${parentFloorId}/rooms/${room?.roomId || roomId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete room.");
      }

      setModalSuccess("Room deleted successfully.");
      setTimeout(() => {
        setIsSettingsOpen(false);
        router.push("/dashboard/rooms");
      }, 1500);
    } catch (err) {
      console.error("Delete room error:", err);
      setModalError(err.message || "Failed to delete room.");
    } finally {
      setModalLoading(false);
    }
  };

  // =========================================================================
  // 1. DYNAMIC PROPERTY HIERARCHY RESOLUTION
  // =========================================================================
  
  const locateRoomHierarchy = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session expired.");

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
      let found = false;

      for (const prop of propertiesList) {
        if (found) break;

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
          if (found) break;

          const roomsRes = await fetch(`${apiUrl}/api/properties/${prop.propertyId}/floors/${floor.floorId}/rooms`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });
          const roomsData = await roomsRes.json();
          const roomsList = roomsData.rooms || [];

          const targetRoom = roomsList.find(r => r.roomId.toLowerCase() === roomId.toLowerCase());
          if (targetRoom) {
            setParentPropertyId(prop.propertyId);
            setParentFloorId(floor.floorId);
            setRoom(targetRoom);
            setDeviceId(targetRoom.deviceId || "");

            setCurrentTemp(targetRoom.currentTemp || 24);
            setTargetTemp(targetRoom.targetTemp || 24);
            setMode(targetRoom.mode || "cool");
            setFanSpeed(targetRoom.fanSpeed || "auto");
            setSwing(targetRoom.swing || "on");
            setPower(targetRoom.power || "on");
            setSelectedBrand(targetRoom.acBrand || "VOLTAS");

            found = true;
          }
        }
      }

      if (!found) {
        throw new Error("Target room could not be discovered.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to locate room settings.");
    } finally {
      setLoading(false);
    }
  }, [roomId, getToken, apiUrl]);

  useEffect(() => {
    if (user && roomId) {
      locateRoomHierarchy();
    }
  }, [user, roomId, locateRoomHierarchy]);

  // =========================================================================
  // SILENT BACKGROUND POLLING — refreshes live telemetry every 8s
  // =========================================================================
  const refreshRoomState = useCallback(async () => {
    if (!parentPropertyId || !parentFloorId || !roomId) return;
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `${apiUrl}/api/properties/${parentPropertyId}/floors/${parentFloorId}/rooms`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const rooms = data.rooms || [];
      const updated = rooms.find(r => r.roomId.toLowerCase() === roomId.toLowerCase());
      if (!updated) return;

      // Only update telemetry fields — never reset user-driven control states
      setRoom(updated);
      setCurrentTemp(updated.currentTemp ?? currentTemp);
      setDeviceId(updated.deviceId || "");

      // Update connection status passively (don't override user commands)
      if (updated.deviceStatus !== undefined) {
        setRoom(prev => prev ? { ...prev, deviceStatus: updated.deviceStatus } : prev);
      }
    } catch {
      // Silent — don't surface polling errors to the user
    }
  }, [parentPropertyId, parentFloorId, roomId, getToken, apiUrl, currentTemp]);

  useEffect(() => {
    if (!parentPropertyId || !parentFloorId) return;
    const interval = setInterval(refreshRoomState, 8000);
    return () => clearInterval(interval);
  }, [parentPropertyId, parentFloorId, refreshRoomState]);

  // =========================================================================
  // MQTT Live Dev Logging System
  // =========================================================================
  const isDevMode = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || 
     window.location.hostname === "127.0.0.1" || 
     process.env.NODE_ENV === "development");

  const [logs, setLogs] = useState([]);
  const [mqttConnected, setMqttConnected] = useState(false);
  const logEndRef = useRef(null);
  const mqttClientRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    if (!deviceId || typeof window === "undefined") return;

    let active = true;
    let client = null;

    const connectMqtt = async () => {
      try {
        const mqtt = (await import("mqtt")).default;
        
        const host = "089c2c6a70b34d51b2c6a8346fd0c15f.s1.eu.hivemq.cloud";
        const clientId = `frontend_${Math.random().toString(16).slice(2, 10)}`;
        const topic = `telemetry/${deviceId}/log`;

        console.log(`[MQTT Dev Logs] Connecting to wss://${host}:8884/mqtt with clientId ${clientId}`);
        
        client = mqtt.connect(`wss://${host}:8884/mqtt`, {
          clientId,
          username: "nexasmartac",
          password: "Nexa12345",
          clean: true,
          connectTimeout: 5000,
          reconnectPeriod: 2000,
        });

        mqttClientRef.current = client;

        client.on("connect", () => {
          if (!active) return;
          setMqttConnected(true);
          console.log(`[MQTT Dev Logs] Connected! Subscribing to topic: ${topic}`);
          client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              console.error("[MQTT Dev Logs] Subscribe error:", err);
            } else {
              setLogs(prev => [...prev, {
                timestamp: new Date().toLocaleTimeString(),
                message: `[System] Subscribed to topic: ${topic}`
              }]);
            }
          });
        });

        client.on("message", (msgTopic, payload) => {
          if (!active) return;
          const msgStr = payload.toString();
          console.log(`[MQTT Dev Logs] Received message:`, msgStr);
          
          setLogs(prev => {
            const nextLogs = [...prev, {
              timestamp: new Date().toLocaleTimeString(),
              message: msgStr
            }];
            if (nextLogs.length > 100) nextLogs.shift();
            return nextLogs;
          });
        });

        client.on("error", (err) => {
          console.error("[MQTT Dev Logs] Connection error:", err);
          if (active) {
            setMqttConnected(false);
            setLogs(prev => [...prev, {
              timestamp: new Date().toLocaleTimeString(),
              message: `[Error] Connection error: ${err.message || String(err)}`
            }]);
          }
        });

        client.on("close", () => {
          if (active) {
            setMqttConnected(false);
          }
        });

      } catch (err) {
        console.error("[MQTT Dev Logs] Init error:", err);
      }
    };

    connectMqtt();

    return () => {
      active = false;
      if (client) {
        console.log("[MQTT Dev Logs] Disconnecting client...");
        client.end();
      }
    };
  }, [deviceId]);

  // =========================================================================
  // 2. DISPATCH IoT DEVICE COMMANDS
  // =========================================================================
  
  const sendCommand = async (action, value, brandParam) => {
    if (!parentPropertyId || !roomId) {
      setError("Device coordination details hydrating...");
      return;
    }
    if (!deviceId) {
      setError("No hardware device paired to this room. Please pair a device in Settings.");
      return;
    }

    setError("");
    setSuccess("");
    setActionLoading(true);

    const activeBrand = brandParam !== undefined ? brandParam : selectedBrand;

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token invalid.");

      const response = await fetch(`${apiUrl}/api/device/command`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId: parentPropertyId,
          roomId: room?.roomId || roomId,
          deviceId,
          action,
          value,
          acBrand: activeBrand
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to dispatch command.");
      }

      setSuccess(`AC unit successfully set ${action} to ${String(value).toUpperCase()}`);
      setTimeout(() => setSuccess(""), 3000);

    } catch (err) {
      console.error(err);
      setError(err.message || "Hardware communication timed out.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePowerToggle = () => {
    const nextPower = power === "on" ? "off" : "on";
    setPower(nextPower);
    sendCommand("power", nextPower);
  };

  const handleCycleMode = () => {
    const currentIndex = AC_MODES.indexOf(mode);
    const nextIndex = (currentIndex + 1) % AC_MODES.length;
    const nextMode = AC_MODES[nextIndex];
    setMode(nextMode);
    sendCommand("mode", nextMode);
  };

  const handleCycleFan = () => {
    const currentIndex = FAN_SPEEDS.indexOf(fanSpeed);
    const nextIndex = (currentIndex + 1) % FAN_SPEEDS.length;
    const nextFan = FAN_SPEEDS[nextIndex];
    setFanSpeed(nextFan);
    sendCommand("fanSpeed", nextFan);
  };

  const handleSwingToggle = () => {
    const nextSwing = swing === "on" ? "off" : "on";
    setSwing(nextSwing);
    sendCommand("swing", nextSwing);
  };

  const handleBrandChange = (e) => {
    const newBrand = e.target.value;
    setSelectedBrand(newBrand);
    sendCommand("mode", mode, newBrand);
  };

  const handleTempAdjust = (direction) => {
    let nextTemp = targetTemp;
    if (direction === "up" && targetTemp < 30) {
      nextTemp = targetTemp + 1;
    } else if (direction === "down" && targetTemp > 16) {
      nextTemp = targetTemp - 1;
    }
    if (nextTemp !== targetTemp) {
      setTargetTemp(nextTemp);
      sendCommand("targetTemp", nextTemp);
    }
  };

  const handlePrecool = () => {
    setTargetTemp(18);
    setMode("cool");
    setFanSpeed("high");
    setPower("on");
    
    sendCommand("precool", "on");
    
    setSuccess("Instant Pre-cool command broadcasted!");
    setTimeout(() => setSuccess(""), 4000);
  };

  // =========================================================================
  // 3. DIAL RADIAL MATH & CLICK/DRAG TOUCH CONTROLS
  // =========================================================================

  const radius = 72;
  const centerX = 100;
  const centerY = 100;

  const ratio = (targetTemp - 16) / 14;
  const angleDeg = 225 - ratio * 270;
  const angleRad = angleDeg * (Math.PI / 180);

  const thumbX = centerX + radius * Math.cos(angleRad);
  const thumbY = centerY - radius * Math.sin(angleRad);

  const updateTempFromCoords = (clientX, clientY) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    let angle = Math.atan2(-y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    if (angle > 315) angle -= 360;
    
    if (angle < -45) angle = -45;
    if (angle > 225) angle = 225;

    const calculatedRatio = (225 - angle) / 270;
    const calculatedTemp = Math.round(16 + calculatedRatio * 14);
    
    if (calculatedTemp !== targetTemp) {
      setTargetTemp(calculatedTemp);
      sendCommand("targetTemp", calculatedTemp);
    }
  };

  const handleStartDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX || e.touches?.[0]?.clientX;
    const startY = e.clientY || e.touches?.[0]?.clientY;
    if (startX && startY) {
      updateTempFromCoords(startX, startY);
    }
    
    const handleMove = (moveEvent) => {
      const clientX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
      const clientY = moveEvent.clientY || moveEvent.touches?.[0]?.clientY;
      if (clientX && clientY) {
        updateTempFromCoords(clientX, clientY);
      }
    };
    
    const handleStop = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleStop);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleStop);
    };
    
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleStop);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleStop);
  };

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (power !== "on") return; // Freeze wave animation when AC is powered off
    
    let animId;
    const animate = () => {
      setPhase(prev => (prev + 0.05) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [power]);

  // Generate wavy active progress path or full unfilled track (wavy path along the circle arc)
  const generateWavyPath = (temp, isFullTrack = false) => {
    const startAngleDeg = 225;
    let endAngleDeg = -45;
    
    if (!isFullTrack) {
      if (temp <= 16) return "";
      const ratio = (temp - 16) / 14;
      endAngleDeg = 225 - ratio * 270;
    }
    
    const points = [];
    const baseRadius = 72;
    const amplitude = 2.4; // Subtle wave amplitude
    const frequency = 26;  // Number of wave cycles around the circle
    
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angleDeg = startAngleDeg - t * (startAngleDeg - endAngleDeg);
      const angleRad = angleDeg * (Math.PI / 180);
      
      const wave = Math.sin(angleRad * frequency + phase);
      const r = baseRadius + amplitude * wave;
      
      const x = centerX + r * Math.cos(angleRad);
      const y = centerY - r * Math.sin(angleRad);
      
      points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    return points.join(" ");
  };

  // Dynamic Theme mapping for light mode
  const getThemeColor = () => {
    if (power !== "on") return { glow: "bg-slate-200/[0.15]", text: "text-slate-400", border: "border-slate-200" };
    switch (mode) {
      case "cool":
        return { glow: "bg-[#FF6B35]/[0.02]", text: "text-[#FF6B35]", border: "border-[#FF6B35]/25" };
      case "heat":
        return { glow: "bg-[#FF6B35]/[0.03]", text: "text-[#FF6B35]", border: "border-[#FF6B35]/25" };
      case "fan":
      case "auto":
        return { glow: "bg-[#FF6B35]/[0.02]", text: "text-[#FF6B35]", border: "border-[#FF6B35]/20" };
      case "dry":
        return { glow: "bg-[#FF6B35]/[0.02]", text: "text-[#FF6B35]", border: "border-[#FF6B35]/20" };
      default:
        return { glow: "bg-[#FF6B35]/[0.02]", text: "text-[#FF6B35]", border: "border-[#FF6B35]/25" };
    }
  };

  const theme = getThemeColor();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-slate-850">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
          <p className="text-xs font-semibold text-slate-500">Loading device dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col pb-24 md:pb-8">
      <div className="relative w-full min-h-0 bg-transparent text-slate-900 flex flex-col md:flex-row justify-center items-stretch gap-6 select-none text-left animate-fadeIn">
      
      {/* Soft Light Mode Glowing Arc */}
      <div className={`absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${theme.glow} rounded-full blur-[100px] pointer-events-none transition-colors duration-500`} />

      {/* LEFT COLUMN: THERMOSTAT DIAL & BASICS */}
      <div className="flex-1 md:max-w-[360px] md:max-h-[460px] flex flex-col bg-white border border-slate-200/50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 shadow-sm relative justify-between">
        {/* 1. TOP HEADER ROW */}
        <div className="flex items-center justify-between w-full z-10 px-1">
          <button 
            onClick={() => router.push("/dashboard/rooms")}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 hover:bg-[#EAEAEA] text-slate-700 cursor-pointer transition-colors shadow-sm"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>

          <div className="flex flex-col items-center text-center flex-1 px-2 min-w-0">
            <div className="flex items-center justify-center gap-2 w-full">
              <h2 className="text-sm font-extrabold tracking-tight text-gray-900 truncate max-w-[140px]">
                {room?.name || room?.roomName || "Room Console"}
              </h2>
              <span className={`w-1.5 h-1.5 rounded-full ${room?.deviceStatus === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">
              {AC_BRAND_LABELS[selectedBrand] || selectedBrand || "VOLTAS"} AC
            </span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 hover:bg-[#EAEAEA] text-slate-700 cursor-pointer transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-slate-700" />
          </button>
        </div>



        {/* ========================================================================= */}
        {/* THE DRAGGABLE DIAL CENTERPIECE */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col items-center justify-center my-3 select-none z-10 w-full relative min-h-[220px]">
          
          <div 
            ref={dialRef}
            onMouseDown={handleStartDrag}
            onTouchStart={handleStartDrag}
            className="relative w-56 h-56 flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
          >
            {/* Inner shadow layer for dial depth */}
            <div className="absolute w-[124px] h-[124px] rounded-full bg-white border border-slate-100/60 shadow-[inset_0_2px_8px_rgba(0,0,0,0.01)] pointer-events-none" />

            <svg className="w-full h-full absolute" viewBox="0 0 200 200">
              {/* Inactive Wavy Track */}
              <path
                d={generateWavyPath(30, true)}
                fill="none"
                stroke="rgba(15, 23, 42, 0.05)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />

              {/* Active Wavy Progress */}
              {power === "on" && (
                <path
                  d={generateWavyPath(targetTemp, false)}
                  fill="none"
                  stroke="#FF6B35"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
              )}
            </svg>

             {/* Readout labels */}
            <div className="absolute flex flex-col items-center justify-center text-center mt-3 pointer-events-none">
              <div className="flex items-start justify-center relative">
                <span className="text-6xl font-black text-slate-900 tracking-tighter leading-none select-none">
                  {power === "on" ? targetTemp : "--"}
                </span>
                <span className="text-lg font-bold text-slate-400 select-none mt-1 pl-0.5">
                  °C
                </span>
              </div>
              
              <span className="text-[9px] font-black text-gray-450 mt-2.5 tracking-widest uppercase select-none">
                Room {typeof currentTemp === 'number' ? currentTemp.toFixed(1) : currentTemp}°C
              </span>
              
              {/* Mode display */}
              {power === "on" && (
                <div className="flex items-center gap-1.5 mt-2.5 select-none">
                  <span className={theme.text}>
                    <Wind className="w-3 h-3 animate-pulse text-[#FF6B35]" />
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${theme.text}`}>
                    {mode}
                  </span>
                </div>
              )}
            </div>

            <div className="absolute bottom-9 left-9 text-[8px] font-black text-slate-400 tracking-wider">16°C</div>
            <div className="absolute bottom-9 right-9 text-[8px] font-black text-slate-400 tracking-wider">30°C</div>
          </div>

          {/* Adjust Buttons */}
          {power === "on" && (
            <div className="flex items-center gap-8 mt-2 pb-1">
              <button 
                onClick={() => handleTempAdjust("down")}
                className="w-11 h-11 rounded-full bg-[#F5F5F7] border border-slate-200/50 hover:bg-[#EAEAEA] text-slate-700 flex items-center justify-center active:scale-90 transition-all shadow-sm cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleTempAdjust("up")}
                className="w-11 h-11 rounded-full bg-[#F5F5F7] border border-slate-200/50 hover:bg-[#EAEAEA] text-slate-700 flex items-center justify-center active:scale-90 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Reserved inline status feedback bar (prevents visual popups and layout shifts) */}
          <div className="h-5 flex items-center justify-center mt-3 text-center w-full select-none pointer-events-none px-4">
            {success ? (
              <span className="text-[9px] font-black text-[#FF6B35] tracking-widest uppercase animate-fadeIn">
                {success}
              </span>
            ) : error ? (
              <span className="text-[9px] font-black text-red-500 tracking-widest uppercase animate-fadeIn">
                {error}
              </span>
            ) : (
              <span className="text-[9px] font-black text-slate-350 tracking-widest uppercase">
                System Synchronized
              </span>
            )}
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: CONTROLS & DETAILS */}
      <div className="flex-1 md:max-w-[360px] md:max-h-[460px] flex flex-col bg-white border border-slate-200/50 rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 shadow-sm justify-between gap-4">
        
        {/* ========================================================================= */}
        {/* FOUR-COLUMN CONTROL WIDGETS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-4 gap-2 w-full select-none z-10">
          
          {/* Mode widget */}
          <button
            onClick={handleCycleMode}
            className={`flex flex-col items-center justify-between p-2.5 rounded-[20px] min-h-[82px] sm:min-h-[88px] active:scale-95 transition-all cursor-pointer text-center ${
              power === "on" 
                ? "bg-slate-50 border border-slate-200/65 hover:bg-slate-100 shadow-sm" 
                : "bg-slate-50 border border-slate-100 opacity-40 pointer-events-none"
            }`}
          >
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Mode</span>
            <span className={`${power === "on" ? "text-[#FF6B35]" : "text-slate-400"} py-1`}>
              <Wind className="w-4 h-4" />
            </span>
            <span className="text-[9.5px] font-black text-slate-800 capitalize leading-none">{power === "on" ? mode : "--"}</span>
          </button>

          {/* Fan speed widget */}
          <button
            onClick={handleCycleFan}
            className={`flex flex-col items-center justify-between p-2.5 rounded-[20px] min-h-[82px] sm:min-h-[88px] active:scale-95 transition-all cursor-pointer text-center ${
              power === "on" 
                ? "bg-slate-50 border border-slate-200/65 hover:bg-slate-100 shadow-sm" 
                : "bg-slate-50 border border-slate-100 opacity-40 pointer-events-none"
            }`}
          >
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Fan</span>
            <span className="text-[#FF6B35] py-1">
              <Fan className={`w-4 h-4 ${power === "on" ? "animate-spin-slow text-[#FF6B35]" : "text-slate-400"}`} />
            </span>
            <span className="text-[9.5px] font-black text-slate-800 capitalize leading-none">{power === "on" ? fanSpeed : "--"}</span>
          </button>

          {/* Swing widget */}
          <button
            onClick={handleSwingToggle}
            className={`flex flex-col items-center justify-between p-2.5 rounded-[20px] min-h-[82px] sm:min-h-[88px] active:scale-95 transition-all cursor-pointer text-center ${
              power === "on" 
                ? "bg-slate-50 border border-slate-200/65 hover:bg-slate-100 shadow-sm" 
                : "bg-slate-50 border border-slate-100 opacity-40 pointer-events-none"
            }`}
          >
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Swing</span>
            <span className={`py-1 ${power === "on" && swing === "on" ? "text-[#FF6B35]" : "text-slate-400"}`}>
              <RotateCw className="w-4 h-4" />
            </span>
            <span className="text-[9.5px] font-black text-slate-800 capitalize leading-none">{power === "on" ? swing : "--"}</span>
          </button>

          {/* Power Widget */}
          <button
            onClick={handlePowerToggle}
            className={`flex flex-col items-center justify-between p-2.5 rounded-[20px] min-h-[82px] sm:min-h-[88px] active:scale-95 transition-all cursor-pointer text-center border ${
              power === "on" 
                ? "bg-red-50/40 border-red-200/40 hover:bg-red-50" 
                : "bg-slate-50 border border-slate-200/65 hover:bg-slate-100 shadow-sm"
            }`}
          >
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Power</span>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
              power === "on" ? "bg-red-600 text-white shadow-sm" : "bg-slate-100 text-slate-400 border border-slate-200/50"
            }`}>
              <Power className="w-4 h-4" />
            </span>
            <span className="text-[9.5px] font-black text-slate-800 capitalize leading-none">{power}</span>
          </button>

        </div>

        {/* ========================================================================= */}
        {/* PRE-COOL TRIGGER */}
        {/* ========================================================================= */}
        <button
          onClick={handlePrecool}
          disabled={actionLoading}
          className="w-full py-4 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 active:scale-[0.98] text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer shadow-lg shadow-[#FF6B35]/15 text-center z-10 mt-auto"
        >
          {actionLoading ? "Processing command..." : "Pre-cool Room"}
        </button>
      </div>

      </div> {/* Closes inner columns wrapper */}

      {/* MQTT Log Console */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-[24px] sm:rounded-[32px] p-4 sm:p-5 shadow-2xl flex flex-col gap-3 text-left font-mono mt-4 sm:mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Cpu className="w-4 h-4 text-[#FF6B35] shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              MQTT Live Device Logs
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${mqttConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {mqttConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-[9.5px] text-slate-500 font-semibold truncate max-w-[200px] sm:max-w-[220px]">
              {deviceId ? `telemetry/${deviceId}/log` : "No device paired"}
            </span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="h-44 overflow-y-auto bg-slate-955/70 rounded-2xl p-3 text-[10px] space-y-1.5 scrollbar-thin border border-slate-950/40 select-text">
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} className="flex gap-2.5 items-start leading-relaxed">
                <span className="text-slate-500 select-none shrink-0 font-bold">{log.timestamp}</span>
                <span className="text-slate-300 whitespace-pre-wrap break-all">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-[10.5px] uppercase tracking-widest select-none">
              {deviceId ? "Listening for live MQTT telemetry logs..." : "Waiting for paired device to begin logging..."}
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {/* 6. MANAGE ROOM SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200/50 shadow-2xl relative flex flex-col text-left overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Room Settings</h3>
              <button 
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleUpdateRoom} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
              
              {/* Room Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                  Room Name / Number
                </label>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
                />
              </div>

              {/* AC Brand */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                  AC Brand
                </label>
                <select
                  value={editAcBrand}
                  onChange={(e) => setEditAcBrand(e.target.value)}
                  className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold mt-1 focus:outline-none focus:border-[#FF6B35]/50 cursor-pointer"
                >
                  {Object.keys(AC_BRANDS).map((b) => (
                    <option key={b} value={b} className="bg-white text-slate-850">
                      {AC_BRAND_LABELS[b] || b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Device Connection Info */}
              <div className="bg-[#F5F5F7] border border-slate-200/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest">
                    Device Connection
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${room?.deviceStatus === "online" ? "text-green-600" : "text-red-500"}`}>
                      {room?.deviceStatus === "online" ? "Online" : "Offline"}
                    </span>
                    <span className="relative flex h-2 w-2">
                      {room?.deviceStatus === "online" ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </>
                      ) : (
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200/40 my-1" />

                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest">
                    Hardware ID
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-700">
                    {deviceId || "No Device Paired"}
                  </span>
                </div>
              </div>

              {/* Hardware Pairing / Claim Token Section */}
              <div className="bg-[#F5F5F7] border border-slate-200/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-[#FF6B35]" />
                    Hardware Pairing
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className="text-[9.5px] font-black uppercase text-[#FF6B35] hover:text-[#E0531F] transition-colors cursor-pointer"
                  >
                    Regenerate Code
                  </button>
                </div>
                {editClaimToken ? (
                  <div className="flex items-center justify-between bg-white px-3.5 py-3 rounded-xl border border-slate-200/60">
                    <span className="text-sm font-mono font-black text-slate-900 tracking-widest">{editClaimToken}</span>
                    <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">Valid 30 Min</span>
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-500 leading-relaxed">No active claim token. Regenerate code to pair an ESP32 hardware device.</p>
                )}
              </div>

              {/* Warnings / Success Box */}
              {modalError && (
                <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}
              {modalSuccess && (
                <div className="flex items-center gap-2 p-4 rounded-[20px] bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col gap-3 pt-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 py-3 bg-[#F5F5F7] border border-slate-200/60 hover:bg-[#EAEAEA] text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 py-3 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-[#FF6B35]/15"
                  >
                    {modalLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Save Settings"
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteRoom}
                  disabled={modalLoading}
                  className="w-full py-3 bg-red-50 hover:bg-red-600 border border-red-100 hover:border-transparent text-red-650 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Room
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

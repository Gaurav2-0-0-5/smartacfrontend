"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Loader2, AlertCircle, Cpu, CheckCircle, Bluetooth, Wifi, Lock, ChevronDown, Check } from "lucide-react";

export default function AddRoomModal({ isOpen, onClose, onSuccess, propertyId, floorId }) {
  const { getToken } = useAuth();
  
  const [roomName, setRoomName] = useState("");
  const [claimToken, setClaimToken] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bleStatus, setBleStatus] = useState("idle"); // idle, scanning, connecting, writing, success, error
  const [bleError, setBleError] = useState("");
  const [pairedDeviceName, setPairedDeviceName] = useState("");
  const [showBlePanel, setShowBlePanel] = useState(false);
  const [isBleSupported, setIsBleSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWifiSSID(localStorage.getItem("nexaflow_wifi_ssid") || "");
      if (navigator.bluetooth) {
        setIsBleSupported(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!roomName.trim()) {
      setError("Please enter a room name.");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token expired.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/properties/${propertyId}/floors/${floorId}/rooms`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roomName: roomName.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create room.");
      }

      // Success: Capture claimToken, do NOT close yet.
      setClaimToken(data.claimToken || "123456");
      setRoomName("");
    } catch (err) {
      console.error("AddRoomModal error:", err);
      setError(err.message || "Failed to register room.");
    } finally {
      setLoading(false);
    }
  };

  const handleBleProvision = async () => {
    if (!wifiSSID.trim()) {
      setBleError("Wi-Fi SSID is required.");
      setBleStatus("error");
      return;
    }

    setBleError("");
    setBleStatus("scanning");

    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported on this browser or platform.");
      }

      console.log("Requesting Bluetooth Device...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: "Nexaflow-" }
        ],
        optionalServices: ["4fafc201-1fb5-459e-8fcc-c5c9c331914b"]
      });

      setPairedDeviceName(device.name || "Nexaflow Device");
      setBleStatus("connecting");

      const server = await device.gatt.connect();

      setBleStatus("writing");
      const service = await server.getPrimaryService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");

      const encoder = new TextEncoder();

      // Get characteristics
      const ssidChar = await service.getCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8");
      const passChar = await service.getCharacteristic("cba1e984-ab9f-4318-971c-43f147b493b2");
      const tokenChar = await service.getCharacteristic("dcd2f3a5-b12a-4c28-98e3-54b238a493c3");

      // Write values sequentially
      await ssidChar.writeValue(encoder.encode(wifiSSID.trim()));
      await passChar.writeValue(encoder.encode(wifiPassword));
      await tokenChar.writeValue(encoder.encode(claimToken));

      // Save SSID to cache on success
      localStorage.setItem("nexaflow_wifi_ssid", wifiSSID.trim());

      setBleStatus("success");

      // Clean disconnect
      await device.gatt.disconnect();
    } catch (err) {
      console.error("BLE Provisioning error:", err);
      if (err.name === "NotFoundError" || err.message.includes("User cancelled")) {
        setBleError("Pairing cancelled by user.");
      } else {
        setBleError(err.message || "Failed to configure device over Bluetooth.");
      }
      setBleStatus("error");
    }
  };

  const handleDone = () => {
    // Re-fetch statistics
    onSuccess();
    
    // Close modal and reset state
    setClaimToken(null);
    onClose();
  };

  const handleCloseWrapper = () => {
    if (claimToken) {
      handleDone();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      
      {/* Modal Card */}
      <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200/50 shadow-2xl relative flex flex-col text-left overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            {claimToken ? (
              <>
                <Cpu className="w-5 h-5 text-[#FF6B35] animate-pulse" />
                <span>Hardware Pairing</span>
              </>
            ) : (
              <span>Add Room Layer</span>
            )}
          </h3>
          <button 
            type="button"
            onClick={handleCloseWrapper}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 scrollbar-none">
          {/* ------------------------------------------------------------- */}
          {/* STATE A: INITIAL COLLECT NAME FORM */}
          {/* ------------------------------------------------------------- */}
          {!claimToken ? (
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {/* Room Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                  Room Name / Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room A"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
                />
              </div>

              {/* Error Message Box */}
              {error && (
                <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-705 text-xs animate-fadeIn leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-[#F5F5F7] border border-slate-200/60 hover:bg-[#EAEAEA] text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md shadow-[#FF6B35]/15"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Create Room"
                  )}
                </button>
              </div>

            </form>
          ) : (
            
            /* ------------------------------------------------------------- */
            /* STATE B: SUCCESS & DYNAMIC HARDWARE PAIRING CODE VIEW */
            /* ------------------------------------------------------------- */
            <div className="p-6 space-y-6 flex flex-col">
              
              {/* Header Success info */}
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 text-[#FF6B35] rounded-[20px] p-4 text-xs">
                <CheckCircle className="w-6 h-6 text-[#FF6B35] shrink-0" />
                <span className="font-black text-[#FF6B35] text-left">Room Created Successfully!</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed text-left pl-1">
                Enter this unique Claim Token into your **ESP8266 / ESP32 configuration portal** within the next 30 minutes to complete hardware pairing:
              </p>

              {/* Token visualization container */}
              <div className="bg-[#F5F5F7] border border-slate-200/50 rounded-[24px] py-6 flex items-center justify-center shadow-inner">
                <span className="text-5xl font-mono font-black text-[#FF6B35] tracking-widest text-center select-all cursor-pointer" title="Double click to copy code">
                  {claimToken}
                </span>
              </div>

              {/* Bluetooth Provisioning Option */}
              <div className="border border-slate-200/60 rounded-[24px] p-4 bg-slate-50 flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setShowBlePanel(!showBlePanel)}
                  className="flex items-center justify-between w-full text-left focus:outline-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Bluetooth className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Bluetooth Auto-Setup</span>
                      <span className="text-[9px] text-slate-400 font-medium">Send credentials & token instantly</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showBlePanel ? "rotate-180" : ""}`} />
                </button>

                {showBlePanel && (
                  <div className="border-t border-slate-200/60 pt-4 flex flex-col gap-4 animate-fadeIn">
                    {/* Bluetooth capability check */}
                    {!isBleSupported ? (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-[16px] text-[10px] text-amber-700 leading-normal flex items-start gap-2">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0 text-amber-500 mt-0.5" />
                        <span>
                          Web Bluetooth is not supported by your browser. Please use a Chromium-based browser (Chrome, Edge, Opera) to use BLE pairing.
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 leading-relaxed text-left pl-1">
                          Make sure your ESP32 controller is powered on, in **BLE mode** (blinking red rapidly), and near your computer.
                        </p>
                        
                        {/* Inputs for SSID and Password */}
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                              Wi-Fi SSID
                            </label>
                            <div className="relative">
                              <Wifi className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                value={wifiSSID}
                                onChange={(e) => setWifiSSID(e.target.value)}
                                placeholder="Enter Wi-Fi SSID"
                                className="w-full bg-white border border-slate-200/60 text-xs font-bold text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                              Wi-Fi Password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type={showPassword ? "text" : "password"}
                                value={wifiPassword}
                                onChange={(e) => setWifiPassword(e.target.value)}
                                placeholder="Enter Wi-Fi Password"
                                className="w-full bg-white border border-slate-200/60 text-xs font-bold text-slate-700 rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-[#FF6B35] hover:opacity-80 focus:outline-none"
                              >
                                {showPassword ? "HIDE" : "SHOW"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Status Visual Tracker */}
                        {bleStatus !== "idle" && (
                          <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pairing Progress</span>
                              <span className="text-[10px] font-bold text-blue-600 capitalize">{bleStatus}</span>
                            </div>
                            
                            {/* Step Progress Dots/Bars */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${bleStatus === "scanning" ? "bg-blue-500 animate-pulse" : bleStatus !== "idle" && bleStatus !== "error" ? "bg-blue-500" : "bg-slate-100"}`} />
                              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${bleStatus === "connecting" ? "bg-blue-500 animate-pulse" : (bleStatus === "writing" || bleStatus === "success") ? "bg-blue-500" : "bg-slate-100"}`} />
                              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${bleStatus === "writing" ? "bg-blue-500 animate-pulse" : bleStatus === "success" ? "bg-blue-500" : "bg-slate-100"}`} />
                            </div>

                            {/* Status Description Text */}
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              {bleStatus === "scanning" && "Please select your 'Nexaflow-xxxx' device from the browser prompt..."}
                              {bleStatus === "connecting" && `Connecting to ${pairedDeviceName}...`}
                              {bleStatus === "writing" && "Writing SSID, password, and claim token to device..."}
                              {bleStatus === "success" && "Device configured successfully! Releasing connection."}
                              {bleStatus === "error" && (
                                <span className="text-red-500 font-medium">{bleError}</span>
                              )}
                            </p>
                          </div>
                        )}

                        {/* Trigger configuration action */}
                        {bleStatus !== "success" ? (
                          <button
                            type="button"
                            onClick={handleBleProvision}
                            disabled={bleStatus === "scanning" || bleStatus === "connecting" || bleStatus === "writing"}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/15"
                          >
                            {(bleStatus === "scanning" || bleStatus === "connecting" || bleStatus === "writing") ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Configuring Device...</span>
                              </>
                            ) : (
                              <>
                                <Bluetooth className="w-4 h-4" />
                                <span>Configure Device via Bluetooth</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600 text-xs font-bold justify-center bg-green-50 border border-green-100 p-3 rounded-xl">
                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                            <span>Credentials Sent Successfully!</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[10px] text-slate-400 leading-normal text-left pl-1 italic">
                * The device will synchronize target temperature, occupancy state, and automated standby limits immediately upon network discovery.
              </p>

              {/* Completion Done Action */}
              <button
                onClick={handleDone}
                className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#E0531F] text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-colors cursor-pointer shadow-lg shadow-[#FF6B35]/15 text-center shrink-0"
              >
                Done & Save
              </button>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}

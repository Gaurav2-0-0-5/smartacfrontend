"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Loader2, AlertCircle, Cpu, CheckCircle } from "lucide-react";

export default function AddRoomModal({ isOpen, onClose, onSuccess, propertyId, floorId }) {
  const { getToken } = useAuth();
  
  const [roomName, setRoomName] = useState("");
  const [claimToken, setClaimToken] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200/50 shadow-2xl relative flex flex-col text-left overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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

            <p className="text-[10px] text-slate-400 leading-normal text-left pl-1 italic">
              * The device will synchronize target temperature, occupancy state, and automated standby limits immediately upon network discovery.
            </p>

            {/* Completion Done Action */}
            <button
              onClick={handleDone}
              className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#E0531F] text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-colors cursor-pointer shadow-lg shadow-[#FF6B35]/15 text-center"
            >
              Done & Save
            </button>

          </div>
        )}

      </div>
    </div>
  );
}

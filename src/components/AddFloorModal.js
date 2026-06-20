"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Loader2, AlertCircle } from "lucide-react";

export default function AddFloorModal({ isOpen, onClose, onSuccess, propertyId }) {
  const { getToken } = useAuth();
  const [floorNumber, setFloorNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const parsedNum = parseInt(floorNumber, 10);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      setError("Please enter a valid positive floor number.");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth token expired.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/properties/${propertyId}/floors`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          floorNumber: parsedNum
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add floor level.");
      }

      onSuccess();
      onClose();
      setFloorNumber("");
    } catch (err) {
      console.error("AddFloorModal error:", err);
      setError(err.message || "Failed to register floor layer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      
      {/* Modal Card */}
      <div className="bg-white w-full max-w-md rounded-[32px] border border-slate-200/50 shadow-2xl relative flex flex-col text-left overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Add Floor Level</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Floor Number */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Floor Number
            </label>
            <input
              type="number"
              placeholder="e.g. 4"
              min="1"
              value={floorNumber}
              onChange={(e) => setFloorNumber(e.target.value)}
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
                "Add Floor"
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

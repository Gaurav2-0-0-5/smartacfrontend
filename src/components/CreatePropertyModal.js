"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { PROPERTY_TYPES } from "@/constants/enums";
import { X, Loader2, AlertCircle } from "lucide-react";

export default function CreatePropertyModal({ isOpen, onClose, onSuccess }) {
  const { getToken } = useAuth();
  
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("hotel");
  const [subscriptionPlan] = useState("free");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name.trim()) {
      setError("Please enter a property name.");
      setLoading(false);
      return;
    }

    if (!location.trim()) {
      setError("Please enter a property location.");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token expired.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/properties/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          location,
          type,
          subscriptionPlan,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create property.");
      }

      // Success hooks
      onSuccess();
      onClose();
      
      // Reset inputs
      setName("");
      setLocation("");
      setType("hotel");

      // Dispatch event to refresh layout property dropdown selection
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshPropertiesList"));
      }

    } catch (err) {
      console.error("CreatePropertyModal error:", err);
      setError(err.message || "Failed to register property profile.");
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
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Register Property</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 text-slate-555 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Property Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Property Name
            </label>
            <input
              type="text"
              placeholder="e.g. Hotel Blue Sky"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Location
            </label>
            <input
              type="text"
              placeholder="e.g. Bandra West, Mumbai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Property Type Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Property Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1 capitalize cursor-pointer"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="bg-white text-slate-800 capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Plan Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Subscription Plan
            </label>
            <input
              type="text"
              disabled
              value={`${subscriptionPlan.toUpperCase()} (Standard Free Layer)`}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-400 rounded-2xl p-3 w-full text-xs font-bold mt-1 select-none"
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
                  Creating...
                </>
              ) : (
                "Create Property"
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

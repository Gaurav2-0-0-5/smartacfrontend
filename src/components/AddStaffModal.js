"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Loader2, AlertCircle } from "lucide-react";

const ROLES = [
  { value: "hotelManager", label: "Hotel Manager" },
  { value: "officeAdmin", label: "Office Admin" },
  { value: "technician", label: "Technician" },
  { value: "staff", label: "Staff Member" },
  { value: "reception", label: "Receptionist" }
];

const AVATAR_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#14B8A6"  // Teal
];

export default function AddStaffModal({ isOpen, onClose, onSuccess }) {
  const { getToken } = useAuth();
  
  // Form input states
  const [name, setName] = useState("");
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("staff");
  const [accessLevel, setAccessLevel] = useState("Level 1");
  const [assignedArea, setAssignedArea] = useState("Floor 1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Utility to generate dynamic initials
  const generateInitials = (fullName) => {
    if (!fullName) return "ST";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.trim().slice(0, 2).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!name.trim()) {
      setError("Please specify staff member's name.");
      setLoading(false);
      return;
    }
    if (!uid.trim()) {
      setError("Please enter the user's Firebase Auth UID.");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token expired.");

      const initials = generateInitials(name);
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const payload = {
        uid: uid.trim(),
        name: name.trim(),
        role,
        accessLevel: accessLevel.trim(),
        assignedArea: assignedArea.trim(),
        avatarInitials: initials,
        avatarColor: color
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/staff/add`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to register staff profile.");
      }

      // Reset states
      setName("");
      setUid("");
      setRole("staff");
      setAccessLevel("Level 1");
      setAssignedArea("Floor 1");

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      console.error("AddStaffModal submit error:", err);
      setError(err.message || "Failed to add user to personnel register.");
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
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Register Staff</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-[#F5F5F7] border border-slate-200/50 text-slate-550 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Firebase Auth UID */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Firebase Auth UID
            </label>
            <input
              type="text"
              placeholder="e.g. 5xJvN0..."
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Role selector dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Assigned Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold mt-1 focus:outline-none focus:border-[#FF6B35]/50 cursor-pointer capitalize"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-white text-slate-800">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Access level indicator */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Access Level
            </label>
            <input
              type="text"
              placeholder="e.g. Full Access or Level 2"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Assigned Area */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Assigned Area
            </label>
            <input
              type="text"
              placeholder="e.g. Floor 2"
              value={assignedArea}
              onChange={(e) => setAssignedArea(e.target.value)}
              className="bg-[#F5F5F7] border border-slate-200/60 text-slate-905 rounded-2xl p-3 w-full text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
            />
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs animate-fadeIn leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
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
                  Adding...
                </>
              ) : (
                "Register Staff"
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { X, Loader2, AlertCircle, Trash2 } from "lucide-react";

const ROLES = [
  { value: "hotelManager", label: "Hotel Manager" },
  { value: "officeAdmin", label: "Office Admin" },
  { value: "technician", label: "Technician" },
  { value: "staff", label: "Staff Member" },
  { value: "reception", label: "Receptionist" }
];

export default function EditStaffModal({ isOpen, onClose, onSuccess, staffMember }) {
  const { getToken } = useAuth();
  
  // Form input states
  const [name, setName] = useState("");
  const [role, setRole] = useState("staff");
  const [accessLevel, setAccessLevel] = useState("Level 1");
  const [assignedArea, setAssignedArea] = useState("Floor 1");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (staffMember) {
      setName(staffMember.name || "");
      setRole(staffMember.role || "staff");
      setAccessLevel(staffMember.accessLevel || "Level 1");
      setAssignedArea(staffMember.assignedArea || "Floor 1");
      setError("");
      setSuccess("");
    }
  }, [staffMember, isOpen]);

  if (!isOpen || !staffMember) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token expired.");

      const payload = {
        role,
        accessLevel: accessLevel.trim(),
        assignedArea: assignedArea.trim()
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/staff/${staffMember.uid}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update staff profile.");
      }

      setSuccess("Staff profile updated successfully.");
      if (onSuccess) onSuccess();
      
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err) {
      console.error("EditStaffModal submit error:", err);
      setError(err.message || "Failed to update staff.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to revoke access for ${name}? This action cannot be undone.`)) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token expired.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${apiUrl}/api/staff/${staffMember.uid}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete staff profile.");
      }

      setSuccess("Staff member deleted successfully.");
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 1500);
    } catch (err) {
      console.error("EditStaffModal delete error:", err);
      setError(err.message || "Failed to delete staff.");
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
          <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Manage Staff Access</h3>
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
          
          {/* Full Name (Read Only) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              Full Name
            </label>
            <input
              type="text"
              disabled
              value={name}
              className="bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl p-3 w-full text-xs font-semibold mt-1 select-none"
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

          {/* Warnings / Success Box */}
          {error && (
            <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs animate-fadeIn leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-4 rounded-[20px] bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs animate-fadeIn">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-pulse" />
              <span>{success}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-3">
            <div className="flex gap-3">
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3.5 bg-red-50 hover:bg-red-600 border border-red-100 hover:border-transparent text-red-650 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Revoke Access
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

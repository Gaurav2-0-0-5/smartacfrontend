"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Users, 
  Plus, 
  Shield, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function BackofficeStaffPage() {
  const { getToken } = useAuth();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals / forms state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "support",
    department: ""
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const apiUrl = process.env.Config || "";

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/staff`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRoster(data.roster || []);
      } else {
        setError(data.error || "Failed to load staff roster.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with backoffice API.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/staff`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newStaff)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Staff member successfully registered.");
        setIsAddModalOpen(false);
        setNewStaff({ name: "", email: "", role: "support", department: "" });
        fetchRoster();
      } else {
        setError(data.error || "Failed to onboard staff.");
      }
    } catch (err) {
      setError("Network error onboarding staff.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (uid, currentActive) => {
    setError("");
    setSuccess("");
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/staff`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid,
          active: !currentActive
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully ${!currentActive ? "activated" : "deactivated"} staff access.`);
        fetchRoster();
      } else {
        setError(data.error || "Failed to toggle status.");
      }
    } catch (err) {
      setError("Network error updating status.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/staff`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: editingStaff.uid,
          role: editingStaff.role,
          department: editingStaff.department
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Staff profile updated successfully.");
        setIsEditModalOpen(false);
        fetchRoster();
      } else {
        setError(data.error || "Failed to edit staff.");
      }
    } catch (err) {
      setError("Network error updating staff.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight">Staff Roster Directory</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Onboard administrative employees and sync role capabilities.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-white text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
        >
          <Plus className="w-3.5 h-3.5" />
          Onboard Employee
        </button>
      </div>

      {/* Notifications Alert */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Roster Table Container */}
      <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading && roster.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Loading Roster...</span>
            </div>
          ) : roster.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Employee Details</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Employee ID</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Department</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">System Role</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {roster.map((member) => (
                  <tr key={member.uid} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#18181B] border border-white/[0.05] flex items-center justify-center font-bold text-xs">
                          {member.name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white tracking-wide">{member.name}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10.5px] text-left">
                      {member.employeeId ? (
                        <span className="px-2.5 py-1 rounded bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 text-[#FF5A1F] text-[9px] font-black tracking-widest uppercase">
                          {member.employeeId}
                        </span>
                      ) : (
                        <span className="text-gray-500 font-mono tracking-normal" title={member.uid}>
                          {member.uid.slice(0, 6) + "..." + member.uid.slice(-4)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300 text-left">
                      {member.department}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <span className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest bg-[#18181B] border border-white/[0.05] text-gray-300">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(member.uid, member.active)}
                        className={`
                          px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer active:scale-95 transition-all
                          ${member.active 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                            : "bg-red-500/10 border-red-500/20 text-red-400"}
                        `}
                      >
                        {member.active ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingStaff(member);
                          setIsEditModalOpen(true);
                        }}
                        className="text-[9px] font-black uppercase tracking-widest text-[#FF5A1F] hover:bg-[#FF5A1F]/5 cursor-pointer border border-[#FF5A1F]/15 px-3 py-2 rounded-xl transition-all"
                      >
                        Edit Roster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 text-gray-500 text-xs">
              No registered backoffice staff members found.
            </div>
          )}
        </div>
      </div>

      {/* Onboard Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[450px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Onboard Employee</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-8 space-y-5">
              <p className="text-[10px] text-gray-400 leading-relaxed -mt-2">
                Make sure the employee has already signed up on the consumer app before onboarding them here.
              </p>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Amit Verma"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Operational Email</label>
                <input
                  type="email"
                  required
                  placeholder="amit@nexaflow.io"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1 font-bold">System Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="block w-full px-3 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                  >
                    <option value="support">Support</option>
                    <option value="technician">Technician</option>
                    <option value="sales">Sales</option>
                    <option value="developer">Developer</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="QA & Testing"
                    value={newStaff.department}
                    onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Register Employee
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && editingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Modify Staff Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              <div className="space-y-2 text-left opacity-60">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Employee Email (Read-Only)</label>
                <input
                  type="text"
                  disabled
                  value={editingStaff.email}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-gray-500"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">System Role</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className="block w-full px-3 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white focus:outline-none"
                >
                  <option value="support">Support</option>
                  <option value="technician">Technician</option>
                  <option value="sales">Sales</option>
                  <option value="developer">Developer</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Department</label>
                <input
                  type="text"
                  required
                  value={editingStaff.department}
                  onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Save Updates
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

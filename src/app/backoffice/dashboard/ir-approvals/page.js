"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Flame, 
  Check, 
  Trash2, 
  Clock, 
  Cpu, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  X,
  Database
} from "lucide-react";

export default function BackofficeIrApprovalsPage() {
  const { getToken } = useAuth();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Approval modal state
  const [selectedCode, setSelectedCode] = useState(null);
  const [approveForm, setApproveForm] = useState({
    acBrand: "VOLTAS",
    protocol: "RAW",
    actionDescription: ""
  });

  const apiUrl = process.env.Config || "";

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/ir-approvals`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQueue(data.queue || []);
      } else {
        setError(data.error || "Failed to load IR approvals queue.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with approvals server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!approveForm.actionDescription.trim()) {
      setError("Action description is required (e.g. Power Toggle, Temp 24C Cool).");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/ir-approvals`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: selectedCode.id,
          acBrand: approveForm.acBrand,
          protocol: approveForm.protocol.trim(),
          actionDescription: approveForm.actionDescription.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`IR timing code successfully approved and merged under ${approveForm.acBrand}.`);
        setSelectedCode(null);
        setApproveForm({ acBrand: "VOLTAS", protocol: "RAW", actionDescription: "" });
        fetchQueue();
      } else {
        setError(data.error || "Failed to approve IR code.");
      }
    } catch (err) {
      setError("Network error approving IR code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight">Global IR Approval Queue</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Approve raw carrier timings captured in rooms and promote them to the main verified database.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#121214] border border-white/[0.05] hover:bg-white/[0.02] rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95"
        >
          Reload Queue
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Queue Grid List (Desktop Optimized Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && queue.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">Analyzing Learned Timing Scans...</span>
          </div>
        ) : queue.length > 0 ? (
          queue.map((item) => (
            <div 
              key={item.id} 
              className="bg-[#121214] border border-white/[0.05] rounded-[24px] p-6 space-y-4 hover:border-white/[0.08] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3.5">
                <div className="flex justify-between items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col text-left flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">Scanned Signal: {item.id}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5 font-mono">From Device: {item.deviceId}</span>
                  </div>
                </div>

                <div className="bg-[#09090B] border border-white/[0.02] rounded-xl p-3 space-y-1 text-left">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Timing Sequence</span>
                  <div className="max-h-20 overflow-y-auto font-mono text-[9.5px] text-gray-400 leading-relaxed scrollbar-none pr-1">
                    {item.rawTimingArray ? item.rawTimingArray.join(", ") : "Empty sequence"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] text-gray-400 text-left">
                  <div>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Carrier Freq</span>
                    <span className="font-bold text-white">{item.frequencyKhz || 38} KHz</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block font-bold">Identified Code</span>
                    <span className="font-bold text-white">{item.protocol || "RAW"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.03] mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[9px] text-gray-500 font-mono"><Clock className="w-3.5 h-3.5" /> {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : ""}</span>
                
                <button
                  onClick={() => {
                    setSelectedCode(item);
                    setApproveForm(prev => ({
                      ...prev,
                      protocol: item.protocol || "RAW",
                      actionDescription: item.actionDescription || ""
                    }));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-lg text-white text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                >
                  <Database className="w-3 h-3" /> Approve promotion
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-[#121214] border border-white/[0.05] text-center py-20 text-gray-550 rounded-[32px] text-xs">
            No pending learned IR signal codes awaiting verification.
          </div>
        )}
      </div>

      {/* Promotion approval Form Modal */}
      {selectedCode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[420px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Verify & Promote IR Code</h3>
              <button onClick={() => setSelectedCode(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleApproveSubmit} className="p-8 space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Target AC Brand</label>
                <select
                  value={approveForm.acBrand}
                  onChange={(e) => setApproveForm({ ...approveForm, acBrand: e.target.value })}
                  className="block w-full px-3 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                >
                  <option value="VOLTAS">VOLTAS</option>
                  <option value="SAMSUNG">SAMSUNG</option>
                  <option value="DAIKIN">DAIKIN</option>
                  <option value="LG">LG</option>
                  <option value="HITACHI">HITACHI</option>
                  <option value="PANASONIC">PANASONIC</option>
                  <option value="BLUE_STAR">BLUE STAR</option>
                </select>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Carrier Protocol</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. samsung_ac, voltas_raw"
                  value={approveForm.protocol}
                  onChange={(e) => setApproveForm({ ...approveForm, protocol: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Action Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Power Toggle, Temp Down, Swing Mode"
                  value={approveForm.actionDescription}
                  onChange={(e) => setApproveForm({ ...approveForm, actionDescription: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-655 focus:outline-none"
                />
              </div>

              <div className="bg-[#09090B] border border-white/[0.03] rounded-2xl p-4 text-[10px] text-gray-500 space-y-1.5 text-left leading-relaxed">
                <span className="font-bold text-gray-300 block uppercase tracking-wider">Timing Check</span>
                <span>This will permanently write the {selectedCode.rawTimingArray?.length} length microsecond sequence into the master AC database and remove the unverified scan queue item.</span>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Promote to Verified Database
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

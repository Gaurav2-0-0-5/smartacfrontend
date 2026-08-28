"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Cpu, 
  Upload, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Clock, 
  Link as LinkIcon,
  Sliders
} from "lucide-react";

export default function BackofficeOtaPage() {
  const { getToken } = useAuth();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Rollout form state
  const [form, setForm] = useState({
    version: "",
    url: "",
    sha256: "",
    size: "",
    hardwareVersion: "v2",
    propertyId: "",
    deviceIdsStr: "", // comma separated list
    rolloutPercentage: 100
  });

  const apiUrl = process.env.Config || "";

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/ota`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReleases(data.releases || []);
      } else {
        setError(data.error || "Failed to load release history.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with OTA API server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const sizeNum = parseInt(form.size, 10);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setError("Size must be a valid positive number in bytes.");
      setLoading(false);
      return;
    }

    if (form.sha256.length !== 64) {
      setError("SHA-256 checksum must be exactly 64 characters.");
      setLoading(false);
      return;
    }

    // Parse comma separated devices list if present
    let deviceIds = null;
    if (form.deviceIdsStr.trim()) {
      deviceIds = form.deviceIdsStr.split(",").map(id => id.trim()).filter(id => id.length > 0);
    }

    const payload = {
      version: form.version.trim(),
      url: form.url.trim(),
      sha256: form.sha256.trim(),
      size: sizeNum,
      hardwareVersion: form.hardwareVersion,
      rolloutPercentage: form.rolloutPercentage,
      ...(form.propertyId.trim() && { propertyId: form.propertyId.trim() }),
      ...(deviceIds && { deviceIds })
    };

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/ota`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Firmware ${form.version} rollout dispatched to ${data.dispatchedCount} target devices.`);
        setForm({
          version: "",
          url: "",
          sha256: "",
          size: "",
          hardwareVersion: "v2",
          propertyId: "",
          deviceIdsStr: "",
          rolloutPercentage: 100
        });
        fetchReleases();
      } else {
        setError(data.error || "Failed to schedule firmware rollout.");
      }
    } catch (err) {
      setError("Network error scheduling OTA rollout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Canary Firmware OTA Releases</h1>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Announce updates, trigger firmware binaries, and monitor release schedules.
        </p>
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

      {/* Grid Split Panel (Desktop Optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Create/Schedule Form */}
        <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.03]">
            <Upload className="w-4 h-4 text-[#FF5A1F]" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Trigger OTA Rollout</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Build Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2.0.3"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Hardware Model</label>
                <select
                  value={form.hardwareVersion}
                  onChange={(e) => setForm({ ...form, hardwareVersion: e.target.value })}
                  className="block w-full px-3 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                >
                  <option value="v1">Nexa ESP v1</option>
                  <option value="v2">Nexa ESP-C3 v2</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Binary URL (.bin)</label>
              <input
                type="url"
                required
                placeholder="https://storage.googleapis.com/firmware/v2.0.3.bin"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">SHA-256 Checksum</label>
                <input
                  type="text"
                  required
                  placeholder="64-char hex string"
                  value={form.sha256}
                  onChange={(e) => setForm({ ...form, sha256: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all font-mono text-[10px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1 font-bold">Size (bytes)</label>
                <input
                  type="number"
                  required
                  placeholder="1843200"
                  value={form.size}
                  onChange={(e) => setForm({ ...form, size: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>
            </div>

            {/* Scope selection headers */}
            <div className="pt-2 border-t border-white/[0.03] space-y-3">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Canary Filtering (Optional)</span>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Canary Property ID</label>
                <input
                  type="text"
                  placeholder="prop_9YtX7rP"
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">Canary Device IDs (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Nexaflow-34FA, Nexaflow-34FB"
                  value={form.deviceIdsStr}
                  onChange={(e) => setForm({ ...form, deviceIdsStr: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-650 focus:outline-none focus:border-[#FF5A1F]/50 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-wider pl-1">
                  <span>Rollout Target Percentage</span>
                  <span className="text-white font-mono">{form.rolloutPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={form.rolloutPercentage}
                  onChange={(e) => setForm({ ...form, rolloutPercentage: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-[#09090B] rounded-lg appearance-none cursor-pointer accent-[#FF5A1F] mt-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center py-4 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
            >
              Execute OTA Announcement
            </button>
          </form>
        </div>

        {/* Right Side: Rollout History List (Takes 2 Columns) */}
        <div className="lg:col-span-2 bg-[#121214] border border-white/[0.05] rounded-[32px] p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.03]">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Release Registry Logs</h3>
          </div>

          <div className="space-y-4">
            {loading && releases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Loading history...</span>
              </div>
            ) : releases.length > 0 ? (
              releases.map((release) => (
                <div 
                  key={release.id}
                  className="p-5 border border-white/[0.03] hover:border-white/[0.06] bg-[#09090B]/40 rounded-2xl space-y-3 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs font-bold">
                        V{release.version}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-white">Firmware Release V{release.version}</span>
                        <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Model: {release.hardwareVersion}</span>
                      </div>
                    </div>

                    <span className={`
                      px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border
                      ${release.status === "active" 
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                        : "bg-orange-500/10 border-orange-500/25 text-orange-400"}
                    `}>
                      {release.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-white/[0.02] text-xs text-gray-400 text-left">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Binary URL</span>
                      <span className="flex items-center gap-1.5 font-mono text-[10px] truncate text-gray-300">
                        <LinkIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                        {release.url}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Scope & Percentage</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-gray-300 font-medium">
                        <Sliders className="w-3.5 h-3.5 text-gray-500" />
                        Rollout: {release.rolloutPercentage}% {release.targetScope?.propertyId ? `(Canary: ${release.targetScope.propertyId})` : "(Global)"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[9px] text-gray-500 font-mono text-left">
                    <span>SHA-256: {release.sha256?.slice(0, 20)}...{release.sha256?.slice(-10)}</span>
                    <span className="flex items-center gap-1 font-bold uppercase tracking-wider"><Clock className="w-3.5 h-3.5" /> {release.createdAt ? new Date(release.createdAt).toLocaleString() : ""}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-gray-500 text-xs">
                No firmware releases scheduled.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

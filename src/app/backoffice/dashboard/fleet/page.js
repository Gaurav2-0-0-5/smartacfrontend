"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Activity, 
  Radio, 
  RefreshCw, 
  Wifi, 
  ShieldAlert, 
  Cpu, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Play
} from "lucide-react";

export default function BackofficeFleetPage() {
  const { getToken } = useAuth();
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Pending actions tracker (to animate loading on buttons)
  const [pendingCommands, setPendingCommands] = useState({});

  const apiUrl = process.env.Config || "";

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/fleet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFleet(data.fleet || []);
      } else {
        setError(data.error || "Failed to load active fleet.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch fleet from backend server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  const dispatchCommand = async (deviceId, command) => {
    setError("");
    setSuccess("");
    const actionKey = `${deviceId}_${command}`;
    
    // Set pending loader
    setPendingCommands(prev => ({ ...prev, [actionKey]: true }));

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/fleet`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ deviceId, command })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Command "${command}" successfully published to device ${deviceId}.`);
      } else {
        setError(data.error || `Failed to dispatch command to ${deviceId}.`);
      }
    } catch (err) {
      setError(`Network error dispatching command to ${deviceId}.`);
    } finally {
      setPendingCommands(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const getRssiColor = (rssi) => {
    if (!rssi) return "text-gray-500";
    if (rssi >= -67) return "text-emerald-400";
    if (rssi >= -75) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight">Active Device Fleet Monitor</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Monitor real-time ESP32 diagnostics and dispatch remote system commands.
          </p>
        </div>

        <button
          onClick={fetchFleet}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#121214] border border-white/[0.05] hover:bg-white/[0.02] rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Nodes
        </button>
      </div>

      {/* Messages */}
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

      {/* Fleet Table Grid */}
      <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading && fleet.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Scanning Fleet Telemetry...</span>
            </div>
          ) : fleet.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Device Reference</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Wi-Fi RSSI</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Memory Heap</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Firmware Build</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Target AC Brand</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">System Commands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {fleet.map((device) => (
                  <tr key={device.deviceId} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#18181B] border border-white/[0.05] flex items-center justify-center text-gray-400 font-mono text-[10px]">
                          ESP
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white font-mono">{device.deviceId}</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Room: {device.roomName || "Unassigned"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`
                          w-2 h-2 rounded-full shrink-0
                          ${device.online 
                            ? "bg-emerald-400 animate-pulse border border-emerald-500/50" 
                            : "bg-gray-700 border border-gray-600/50"}
                        `} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${device.online ? "text-emerald-400" : "text-gray-500"}`}>
                          {device.online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {device.online && device.rssi ? (
                        <div className="flex items-center gap-1.5">
                          <Wifi className={`w-3.5 h-3.5 ${getRssiColor(device.rssi)}`} />
                          <span className={`text-xs font-bold font-mono ${getRssiColor(device.rssi)}`}>
                            {device.rssi} dBm
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {device.online && device.freeHeap ? (
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <Cpu className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold font-mono">
                            {device.freeHeap.toLocaleString()} B
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-mono text-xs">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-xs text-purple-400 font-mono">
                      V{device.firmwareVersion || "1.0.0"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9.5px] font-bold text-gray-300 uppercase">
                        {device.acBrand || "VOLTAS"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {[
                          { cmd: "reboot", color: "text-[#FF5A1F] hover:bg-[#FF5A1F]/5 hover:border-[#FF5A1F]/20" },
                          { cmd: "reset_wifi", color: "text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/20" },
                          { cmd: "force_ble", color: "text-purple-400 hover:bg-purple-400/5 hover:border-purple-400/20" }
                        ].map((btn) => {
                          const actionKey = `${device.deviceId}_${btn.cmd}`;
                          const isPending = pendingCommands[actionKey];
                          return (
                            <button
                              key={btn.cmd}
                              disabled={isPending}
                              onClick={() => dispatchCommand(device.deviceId, btn.cmd)}
                              className={`
                                flex items-center justify-center gap-1.5 px-3 py-1.5 border border-white/[0.05] rounded-xl text-[8.5px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 disabled:opacity-50
                                ${btn.color}
                              `}
                            >
                              {isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                btn.cmd.replace("_", " ")
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 text-gray-500 text-xs">
              No deployed devices found in field.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

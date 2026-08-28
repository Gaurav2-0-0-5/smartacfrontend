"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  FileText, 
  Clock, 
  Terminal, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Search,
  Globe
} from "lucide-react";

export default function BackofficeLogsPage() {
  const { getToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const apiUrl = process.env.Config || "";

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/backoffice/staff/logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || "Failed to load audit logs.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to communicate with audit logging endpoint.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter logs locally based on search input
  const filteredLogs = logs.filter(log => {
    const query = searchQuery.toLowerCase();
    return (
      log.details?.toLowerCase().includes(query) ||
      log.staffName?.toLowerCase().includes(query) ||
      log.action?.toLowerCase().includes(query) ||
      log.ipAddress?.toLowerCase().includes(query)
    );
  });

  const getActionBadgeStyle = (action) => {
    if (action.includes("ota") || action.includes("firmware")) {
      return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    }
    if (action.includes("staff") || action.includes("onboard")) {
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    }
    if (action.includes("ir_code") || action.includes("approve")) {
      return "bg-purple-500/10 border-purple-500/20 text-purple-400";
    }
    if (action.includes("inventory") || action.includes("stock")) {
      return "bg-orange-500/10 border-orange-500/20 text-orange-400";
    }
    return "bg-gray-500/10 border-gray-500/20 text-gray-400";
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight">Administrative Audit Trails</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Audit logging trail tracking backoffice activities, performers, and source IPs.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#121214] border border-white/[0.05] hover:bg-white/[0.02] rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          placeholder="Filter audit logs by employee, action, details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: "42px" }}
          className="block w-full pr-4 py-3.5 bg-[#121214] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Loading Operations history...</span>
            </div>
          ) : filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Performer</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Action Type</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Event Details Log</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Source IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02] font-medium text-xs">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-[10.5px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "just now"}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {log.staffName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${getActionBadgeStyle(log.action)}`}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-[10.5px] text-gray-400">
                      <div className="flex justify-end items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-gray-600" />
                        {log.ipAddress}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 text-gray-500 text-xs">
              No administrative audit trails recorded.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

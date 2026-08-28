"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Package, 
  Plus, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Truck, 
  SlidersHorizontal, 
  AlertCircle, 
  Loader2, 
  X,
  FileText
} from "lucide-react";

export default function BackofficeInventoryPage() {
  const { getToken } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPayload, setImportPayload] = useState("");

  const [isQaModalOpen, setIsQaModalOpen] = useState(false);
  const [qaForm, setQaForm] = useState({
    serialNumber: "",
    result: "passed", // "passed" | "failed"
    notes: ""
  });

  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipForm, setShipForm] = useState({
    serialNumber: "",
    shippedToOrgId: ""
  });

  const apiUrl = process.env.Config || "";

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      let url = `${apiUrl}/api/backoffice/inventory`;
      if (statusFilter !== "all") {
        url += `?status=${statusFilter}`;
      }

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStock(data.stock || []);
      } else {
        setError(data.error || "Failed to load inventory.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch inventory from server.");
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter, apiUrl]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Expect CSV/newline parsing: serialNumber,macAddress,deviceId
      const lines = importPayload.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const devices = [];

      for (const line of lines) {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length < 3) {
          throw new Error("Each line must contain: serialNumber,macAddress,deviceId");
        }
        devices.push({
          serialNumber: parts[0],
          macAddress: parts[1],
          deviceId: parts[2]
        });
      }

      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/inventory`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ devices })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully registered ${data.importedCount} hardware controllers.`);
        setIsImportModalOpen(false);
        setImportPayload("");
        fetchInventory();
      } else {
        setError(data.error || "Failed to register devices.");
      }
    } catch (err) {
      setError(err.message || "Failed to parse import block.");
    } finally {
      setLoading(false);
    }
  };

  const handleQaSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/inventory`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serialNumber: qaForm.serialNumber,
          qaResult: qaForm.result,
          notes: qaForm.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`QA Logged: device ${qaForm.serialNumber} marked as ${data.updates?.status}.`);
        setIsQaModalOpen(false);
        setQaForm({ serialNumber: "", result: "passed", notes: "" });
        fetchInventory();
      } else {
        setError(data.error || "Failed to submit QA result.");
      }
    } catch (err) {
      setError("Network error updating QA status.");
    } finally {
      setLoading(false);
    }
  };

  const handleShipSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/backoffice/inventory`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          serialNumber: shipForm.serialNumber,
          status: "shipped",
          shippedToOrgId: shipForm.shippedToOrgId
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Device ${shipForm.serialNumber} set to Shipped status.`);
        setIsShipModalOpen(false);
        setShipForm({ serialNumber: "", shippedToOrgId: "" });
        fetchInventory();
      } else {
        setError(data.error || "Failed to mark device shipped.");
      }
    } catch (err) {
      setError("Network error updating shipping status.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      assembled: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      testing: "bg-orange-500/10 border-orange-500/20 text-orange-400",
      in_stock: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      shipped: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      claimed: "bg-purple-500/10 border-purple-500/20 text-purple-400",
      faulty: "bg-red-500/10 border-red-500/20 text-red-400"
    };
    return map[status] || "bg-gray-500/10 border-gray-500/20 text-gray-400";
  };

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight">Stock Inventory Registry</h1>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Manage device assemblies, QA testings, and shipping logs.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsQaModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/[0.05] hover:bg-white/[0.02] rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            QA Evaluation
          </button>
          
          <button
            onClick={() => setIsShipModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#121214] border border-white/[0.05] hover:bg-white/[0.02] rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
          >
            <Truck className="w-4 h-4 text-indigo-400" />
            Ship Unit
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-white text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Batch Import
          </button>
        </div>
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

      {/* Filter Control Box */}
      <div className="flex gap-2 items-center bg-[#121214] border border-white/[0.05] px-6 py-3 rounded-2xl w-fit">
        <SlidersHorizontal className="w-4 h-4 text-gray-500" />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Filter Lifecycle:</span>
        <div className="flex flex-wrap gap-1.5">
          {["all", "assembled", "testing", "in_stock", "shipped", "claimed", "faulty"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`
                px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer
                ${statusFilter === f 
                  ? "bg-[#FF5A1F] text-white" 
                  : "bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.04]"}
              `}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {loading && stock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF5A1F] mb-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Loading Stock Records...</span>
            </div>
          ) : stock.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Serial Number</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">MAC Address</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Device ID</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">State Status</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Client Org / Shipping</th>
                  <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {stock.map((item) => (
                  <tr key={item.serialNumber} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-bold text-white text-xs">{item.serialNumber}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{item.macAddress}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">{item.deviceId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider border ${getStatusBadge(item.status)}`}>
                        {item.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300">
                      {item.status === "shipped" && item.shippedToOrgId ? (
                        <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                          <Truck className="w-3.5 h-3.5" /> Org: {item.shippedToOrgId}
                        </span>
                      ) : item.status === "claimed" ? (
                        <span className="text-purple-400 font-medium">Paired in Field</span>
                      ) : (
                        <span className="text-gray-600">In Warehouse</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-[10px] text-gray-500 font-mono">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 text-gray-500 text-xs">
              No matching inventory stock entries found.
            </div>
          )}
        </div>
      </div>

      {/* Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[500px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Batch stock import</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleImportSubmit} className="p-8 space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Payload Format (CSV)</label>
                <p className="text-[9px] text-gray-500 leading-relaxed">
                  Provide one device per line. Format: <code className="font-mono text-gray-300">serialNumber,macAddress,deviceId</code>
                </p>
                <textarea
                  required
                  rows={6}
                  placeholder="SN-9021-C3, 34:85:18:03:34:FA, Nexaflow-34FA&#10;SN-9022-C3, 34:85:18:03:34:FB, Nexaflow-34FB"
                  value={importPayload}
                  onChange={(e) => setImportPayload(e.target.value)}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all font-mono leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Execute Bulk Import
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QA Modal */}
      {isQaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">QA Evaluation Log</h3>
              <button onClick={() => setIsQaModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQaSubmit} className="p-8 space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Device Serial Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SN-9021-C3"
                  value={qaForm.serialNumber}
                  onChange={(e) => setQaForm({ ...qaForm, serialNumber: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">QA Verdict</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setQaForm({ ...qaForm, result: "passed" })}
                    className={`
                      py-3 rounded-[16px] text-xs font-bold uppercase border cursor-pointer transition-all flex items-center justify-center gap-1.5
                      ${qaForm.result === "passed" 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                        : "bg-transparent border-white/[0.05] text-gray-400 hover:text-white"}
                    `}
                  >
                    <CheckCircle className="w-4 h-4" /> Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaForm({ ...qaForm, result: "failed" })}
                    className={`
                      py-3 rounded-[16px] text-xs font-bold uppercase border cursor-pointer transition-all flex items-center justify-center gap-1.5
                      ${qaForm.result === "failed" 
                        ? "bg-red-500/10 border-red-500 text-red-400" 
                        : "bg-transparent border-white/[0.05] text-gray-400 hover:text-white"}
                    `}
                  >
                    <XCircle className="w-4 h-4" /> Failed
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1 font-bold">QA notes / comments</label>
                <input
                  type="text"
                  placeholder="Carrier frequency aligned, BLE beacon verified"
                  value={qaForm.notes}
                  onChange={(e) => setQaForm({ ...qaForm, notes: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Log QA Outcome
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ship Modal */}
      {isShipModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 animate-fadeIn">
          <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-scaleIn">
            <div className="px-8 py-6 border-b border-white/[0.03] flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Log Device Shipment</h3>
              <button onClick={() => setIsShipModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleShipSubmit} className="p-8 space-y-5">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1 font-bold">Device Serial Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SN-9021-C3"
                  value={shipForm.serialNumber}
                  onChange={(e) => setShipForm({ ...shipForm, serialNumber: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">Destination Client Organization ID</label>
                <input
                  type="text"
                  required
                  placeholder="org_9J8xY31"
                  value={shipForm.shippedToOrgId}
                  onChange={(e) => setShipForm({ ...shipForm, shippedToOrgId: e.target.value })}
                  className="block w-full px-4 py-3 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg mt-6"
              >
                Mark as Shipped
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

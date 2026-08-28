"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Shield, 
  Users, 
  Package, 
  Activity, 
  Cpu, 
  Flame, 
  FileText,
  TrendingUp,
  Radio,
  Clock,
  ArrowUpRight
} from "lucide-react";

export default function BackofficeDashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState({
    fleetTotal: 0,
    fleetOnline: 0,
    inventoryTotal: 0,
    inventoryTesting: 0,
    otaReleases: 0,
    pendingIrs: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.Config || "";

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const token = await getToken();
        if (!token) return;

        // Fetch Fleet
        const fleetRes = await fetch(`${apiUrl}/api/backoffice/fleet`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const fleetData = await fleetRes.json();
        const activeFleet = fleetData.fleet || [];
        const onlineCount = activeFleet.filter(d => d.online).length;

        // Fetch Inventory
        const invRes = await fetch(`${apiUrl}/api/backoffice/inventory`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const invData = await invRes.json();
        const activeInv = invData.stock || [];
        const testingCount = activeInv.filter(d => d.status === "testing").length;

        // Fetch OTA releases
        const otaRes = await fetch(`${apiUrl}/api/backoffice/ota`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const otaData = await otaRes.json();
        const activeOta = otaData.releases || [];

        // Fetch IR Approvals
        const irRes = await fetch(`${apiUrl}/api/backoffice/ir-approvals`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const irData = await irRes.json();
        const activeIr = irData.queue || [];

        // Fetch Audit Logs
        const logsRes = await fetch(`${apiUrl}/api/backoffice/staff/logs?limit=5`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        const activeLogs = logsData.logs || [];

        setStats({
          fleetTotal: activeFleet.length,
          fleetOnline: onlineCount,
          inventoryTotal: activeInv.length,
          inventoryTesting: testingCount,
          otaReleases: activeOta.length,
          pendingIrs: activeIr.length,
        });
        setRecentLogs(activeLogs);

      } catch (err) {
        console.error("Error fetching dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [getToken, apiUrl]);

  const cards = [
    {
      title: "Field Deployment",
      value: `${stats.fleetOnline} / ${stats.fleetTotal}`,
      desc: "Live Online Nodes",
      color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/[0.02]",
      icon: Radio,
      href: "/backoffice/dashboard/fleet"
    },
    {
      title: "Warehouse Stock",
      value: stats.inventoryTotal,
      desc: `${stats.inventoryTesting} in QA evaluation`,
      color: "border-orange-500/20 text-[#FF5A1F] bg-[#FF5A1F]/[0.02]",
      icon: Package,
      href: "/backoffice/dashboard/inventory"
    },
    {
      title: "IR Signals Queue",
      value: stats.pendingIrs,
      desc: "Awaiting Verification",
      color: "border-purple-500/20 text-purple-400 bg-purple-500/[0.02]",
      icon: Flame,
      href: "/backoffice/dashboard/ir-approvals"
    },
    {
      title: "Canary Rollouts",
      value: stats.otaReleases,
      desc: "Uploaded Firmware Builds",
      color: "border-blue-500/20 text-blue-400 bg-blue-500/[0.02]",
      icon: Cpu,
      href: "/backoffice/dashboard/ota"
    }
  ];

  return (
    <div className="space-y-8 select-none text-left animate-fadeIn">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold tracking-tight">Executive Control Console</h1>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Fleet diagnostics, stock telemetry, and operational approvals.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link 
              key={card.title} 
              href={card.href}
              className={`
                group relative p-6 border rounded-[24px] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5
                ${card.color}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                    {card.title}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold tracking-tight text-white group-hover:scale-[1.01] transition-transform">
                      {card.value}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {card.desc}
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.03] flex items-center justify-center text-inherit shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <ArrowUpRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-650 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>

      {/* Main split panels (Desktop optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Audit Trail logs */}
        <div className="lg:col-span-2 bg-[#121214] border border-white/[0.05] rounded-[32px] p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/[0.03]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#FF5A1F]" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Recent Audit Trails</h3>
            </div>
            <Link 
              href="/backoffice/dashboard/logs"
              className="text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest border border-white/[0.05] px-3 py-1.5 rounded-full"
            >
              View All Logs
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/[0.05] mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-white/[0.05] rounded-full" />
                    <div className="h-2 w-20 bg-white/[0.02] rounded-full" />
                  </div>
                </div>
              ))
            ) : recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex gap-4 text-xs hover:bg-white/[0.01] p-2 rounded-xl transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F]/30 mt-1.5 shrink-0 border border-[#FF5A1F]/50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 font-medium leading-relaxed">
                      <span className="font-bold text-white">{log.staffName}</span> {log.details}
                    </p>
                    <div className="flex gap-3 text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1.5">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {log.timestamp ? new Date(log.timestamp).toLocaleString() : "just now"}</span>
                      <span>IP: {log.ipAddress}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                No recent administrative actions recorded.
              </div>
            )}
          </div>
        </div>

        {/* Action Panel Sidebar */}
        <div className="bg-[#121214] border border-white/[0.05] rounded-[32px] p-8 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.03]">
            <Shield className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Operational Links</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { label: "Configure Canary OTA", desc: "Push firmware binary rollouts", color: "text-blue-400", href: "/backoffice/dashboard/ota" },
              { label: "Verify Learned codes", desc: "Promote timings queue to DB", color: "text-purple-400", href: "/backoffice/dashboard/ir-approvals" },
              { label: "Register New Stock", desc: "Batch import serial inventory", color: "text-[#FF5A1F]", href: "/backoffice/dashboard/inventory" },
              { label: "Onboard Team Staff", desc: "Authorize internal access claims", color: "text-emerald-400", href: "/backoffice/dashboard/staff" }
            ].map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className="block p-4 border border-white/[0.03] hover:border-white/[0.08] hover:bg-white/[0.01] rounded-2xl transition-all"
              >
                <span className={`text-xs font-bold ${link.color} block`}>
                  {link.label}
                </span>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {link.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

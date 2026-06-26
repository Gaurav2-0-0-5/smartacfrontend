"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Layers,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Bell,
  ChevronDown,
  Loader2,
  LogOut,
  Users,
  Activity,
  LayoutGrid
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const { user, loading, logout, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [properties, setProperties] = useState([]);
  const [activeProperty, setActiveProperty] = useState(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Redirect if session is confirmed offline
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch properties collection
  const fetchProperties = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/properties`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (res.ok && data.properties) {
        setProperties(data.properties);

        // Default select the first property
        if (data.properties.length > 0) {
          const defaultProp = data.properties[0];
          setActiveProperty(defaultProp);

          // Emit initial event to hydrate child page
          if (typeof window !== "undefined") {
            setTimeout(() => {
              const event = new CustomEvent("activePropertyChange", { detail: defaultProp });
              window.dispatchEvent(event);
            }, 100);
          }
        }
      }
    } catch (err) {
      console.error("Layout properties fetch failed:", err);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user, fetchProperties]);

  // Listen to children events to refresh property dropdown lists on creation
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleRefreshList = () => {
      fetchProperties();
    };

    window.addEventListener("refreshPropertiesList", handleRefreshList);
    return () => {
      window.removeEventListener("refreshPropertiesList", handleRefreshList);
    };
  }, [fetchProperties]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (e) {
      console.error("Sign out failed:", e);
    }
  };

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname === "/dashboard/rooms") return "Rooms Grid";
    if (pathname === "/dashboard/floors") return "Floor Manager";
    if (pathname.startsWith("/dashboard/rooms/")) return "Climate Control";
    if (pathname === "/dashboard/schedules") return "Schedules & Rules";
    if (pathname === "/dashboard/analytics") return "System Performance";
    if (pathname === "/dashboard/staff") return "Personnel Directory";
    if (pathname === "/dashboard/more") return "System Settings";
    return "Dashboard";
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] text-slate-800">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center text-white shadow-lg shadow-[#FF6B35]/20 animate-bounce">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-500">Verifying Operator Session...</p>
        </div>
      </div>
    );
  }

  const activePropertyName = activeProperty ? activeProperty.name : "Select Property";

  const navLinks = [
    { label: "Overview", icon: Home, path: "/dashboard" },
    { label: "Floor Manager", icon: LayoutGrid, path: "/dashboard/floors" },
    { label: "Rooms Grid", icon: Layers, path: "/dashboard/rooms" },
    { label: "Schedules", icon: Calendar, path: "/dashboard/schedules" },
    { label: "Staff Registry", icon: Users, path: "/dashboard/staff" },
    { label: "Analytics", icon: TrendingUp, path: "/dashboard/analytics" },
    { label: "More Options", icon: MoreHorizontal, path: "/dashboard/more" }
  ];

  return (
    <div className="min-h-screen bg-[#EFEFEF] text-[#1C1C1E] flex flex-row overflow-hidden font-sans select-none">

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR VIEW */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B35] flex items-center justify-center text-white shadow-sm shadow-[#FF6B35]/10">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-slate-900 text-sm tracking-tight">Nexaflow</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Automations</span>
          </div>
        </div>

        {/* Dynamic Property Switcher */}
        <div className="p-4 border-b border-slate-100 relative">
          <button
            onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-[#F5F5F7] hover:bg-[#EAEAEA] border border-slate-200/60 rounded-[16px] transition-all cursor-pointer text-left focus:outline-none"
          >
            <span className="text-xs font-bold text-slate-800 truncate">{activePropertyName}</span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          </button>

          {showPropertyDropdown && properties.length > 0 && (
            <div className="absolute top-full left-4 right-4 bg-white border border-slate-200 rounded-[20px] shadow-xl z-50 p-1.5 mt-1 animate-fadeIn">
              {properties.map((prop) => (
                <button
                  key={prop.propertyId}
                  onClick={() => {
                    setActiveProperty(prop);
                    setShowPropertyDropdown(false);
                    if (typeof window !== "undefined") {
                      const event = new CustomEvent("activePropertyChange", { detail: prop });
                      window.dispatchEvent(event);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#FF6B35] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer block truncate"
                >
                  {prop.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path || (link.path === "/dashboard/rooms" && pathname.startsWith("/dashboard/rooms/"));
            return (
              <button
                key={link.label}
                onClick={() => router.push(link.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[16px] text-xs font-bold transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/15"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-white text-[11px] font-bold uppercase shrink-0">
              {user.email ? user.email.slice(0, 2) : "US"}
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[10px] font-bold text-slate-850 truncate">System Operator</span>
              <span className="text-[9px] text-slate-450 truncate">{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-[#FF6B35] hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* DESKTOP CONTENT VIEW */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 h-screen overflow-hidden">
        {/* Desktop Header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between z-10 shrink-0">
          <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
            {getPageTitle()}
          </h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/notifications")}
              className="relative p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-650 hover:text-slate-900 cursor-pointer transition-all duration-200 shadow-sm hover:bg-slate-100"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF6B35] shadow-sm shadow-[#FF6B35]/30" />
            </button>
          </div>
        </header>

        {/* Desktop Main Content container */}
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE APPLICATION VIEW */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col flex-1 min-h-screen relative overflow-x-hidden">

        {/* Mobile Header Bar */}
        {pathname === "/dashboard" && (
          <header className="sticky top-0 bg-[#EFEFEF]/95 backdrop-blur-md border-b border-slate-200/40 px-4 py-3 flex items-center justify-between z-40">
            <div className="relative flex-1 mr-4">
              <button
                onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                className="flex items-center gap-1.5 text-sm font-black text-slate-900 hover:text-slate-700 transition-colors cursor-pointer text-left"
              >
                <span className="truncate max-w-[160px]">{activePropertyName}</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {showPropertyDropdown && properties.length > 0 && (
                <div className="absolute top-full left-0 bg-white border border-slate-200 rounded-[20px] shadow-xl z-50 p-1.5 mt-2 min-w-[200px] animate-fadeIn">
                  {properties.map((prop) => (
                    <button
                      key={prop.propertyId}
                      onClick={() => {
                        setActiveProperty(prop);
                        setShowPropertyDropdown(false);
                        if (typeof window !== "undefined") {
                          const event = new CustomEvent("activePropertyChange", { detail: prop });
                          window.dispatchEvent(event);
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-750 hover:text-[#FF6B35] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer block truncate"
                    >
                      {prop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard/notifications")}
                className="relative p-2 rounded-full bg-white border border-slate-200/60 text-slate-655 cursor-pointer shadow-sm"
              >
                <Bell className="w-4 h-4 text-slate-750" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-full bg-white border border-slate-200/60 text-slate-400 hover:text-[#FF6B35] cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* Mobile Page Content Area */}
        <main className="flex-1 overflow-y-auto pb-16 px-4 pt-4">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200/50 flex items-center justify-around px-4 z-40 shadow-lg pb-1">
          {[
            { label: "Home", icon: Home, path: "/dashboard" },
            { label: "Floors", icon: LayoutGrid, path: "/dashboard/floors" },
            { label: "Rooms", icon: Layers, path: "/dashboard/rooms" },
            { label: "Schedule", icon: Calendar, path: "/dashboard/schedules" },
            { label: "More", icon: MoreHorizontal, path: "/dashboard/more" }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.path || (tab.path === "/dashboard/rooms" && pathname.startsWith("/dashboard/rooms/"));
            return (
              <button
                key={tab.label}
                onClick={() => router.push(tab.path)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-[16px] transition-all duration-200 cursor-pointer ${isActive
                    ? "bg-[#FF6B35] text-white shadow-md shadow-[#FF6B35]/25 scale-105"
                    : "text-slate-400 hover:text-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className={`text-[8px] font-bold mt-0.5 ${isActive ? "text-white" : "text-slate-500"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}

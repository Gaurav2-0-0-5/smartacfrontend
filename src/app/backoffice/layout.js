"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  LogOut, 
  Menu, 
  X,
  Loader2
} from "lucide-react";

export default function BackofficeLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If loading is finished, check permissions and redirect
  useEffect(() => {
    if (!loading && (!user || !user.isStaff)) {
      // Allow them to be on the bootstrap / login root page
      if (pathname !== "/backoffice") {
        router.push("/backoffice");
      }
    }
  }, [user, loading, pathname, router]);

  // Render a loading spinner during session verification
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#FF5A1F] mb-4" />
        <span className="text-xs font-black uppercase tracking-widest text-gray-500">
          Verifying Admin Credentials...
        </span>
      </div>
    );
  }

  // If on the entry page, do not wrap with sidebar/nav layout
  if (pathname === "/backoffice") {
    return <>{children}</>;
  }

  // Deny access if unauthorized
  if (!user || !user.isStaff) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-white p-6">
        <Shield className="w-16 h-16 text-[#FF5A1F] mb-4 animate-pulse" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-xs text-gray-500 mt-2 max-w-sm text-center">
          This portal is restricted to authorized NexaFlow staff. Your account does not have custom claims.
        </p>
        <button
          onClick={async () => {
            await logout();
            router.push("/backoffice");
          }}
          className="mt-6 px-6 py-2.5 bg-[#18181B] border border-white/[0.05] rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white/[0.02]"
        >
          Return to Login
        </button>
      </div>
    );
  }

  const rolePermissions = {
    superadmin: [
      "/backoffice/dashboard",
      "/backoffice/dashboard/staff",
      "/backoffice/dashboard/inventory",
      "/backoffice/dashboard/fleet",
      "/backoffice/dashboard/ota",
      "/backoffice/dashboard/ir-approvals",
      "/backoffice/dashboard/logs"
    ],
    developer: [
      "/backoffice/dashboard",
      "/backoffice/dashboard/inventory",
      "/backoffice/dashboard/fleet",
      "/backoffice/dashboard/ota",
      "/backoffice/dashboard/ir-approvals"
    ],
    support: [
      "/backoffice/dashboard",
      "/backoffice/dashboard/inventory",
      "/backoffice/dashboard/fleet",
      "/backoffice/dashboard/ir-approvals"
    ],
    technician: [
      "/backoffice/dashboard",
      "/backoffice/dashboard/inventory",
      "/backoffice/dashboard/fleet"
    ],
    sales: [
      "/backoffice/dashboard",
      "/backoffice/dashboard/inventory"
    ]
  };

  const currentRole = user?.staffRole || "support";
  const allowedRoutes = rolePermissions[currentRole] || [];
  const isPathAllowed = allowedRoutes.includes(pathname);

  const navItems = [
    { name: "Overview", href: "/backoffice/dashboard", icon: Shield },
    { name: "Staff Directory", href: "/backoffice/dashboard/staff", icon: Users },
    { name: "Product Stock", href: "/backoffice/dashboard/inventory", icon: Package },
    { name: "Device Fleet", href: "/backoffice/dashboard/fleet", icon: Activity },
    { name: "OTA Firmware", href: "/backoffice/dashboard/ota", icon: Cpu },
    { name: "IR Approvals", href: "/backoffice/dashboard/ir-approvals", icon: Flame },
    { name: "Audit Trail", href: "/backoffice/dashboard/logs", icon: FileText },
  ].filter(item => allowedRoutes.includes(item.href));

  const handleLogoutClick = async () => {
    await logout();
    router.push("/backoffice");
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col md:flex-row select-none">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#18181B] border-b border-white/[0.05] z-30">
        <Link href="/backoffice/dashboard" className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#FF5A1F]" />
          <span className="font-bold text-sm tracking-tight">NexaFlow <span className="text-[#FF5A1F]">Admin</span></span>
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="p-1 text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform md:relative md:translate-x-0 w-64 bg-[#121214] border-r border-white/[0.05] flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Logo Section */}
        <div className="hidden md:flex items-center gap-3 px-6 py-6 border-b border-white/[0.03]">
          <div className="w-8 h-8 rounded-lg bg-[#FF5A1F]/10 flex items-center justify-center border border-[#FF5A1F]/20 text-[#FF5A1F]">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight">NexaFlow Admin</span>
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Control Center</span>
          </div>
        </div>

        {/* User Badge Section */}
        <div className="px-6 py-4 border-b border-white/[0.03] bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FF5A1F] flex items-center justify-center font-bold text-xs">
              {user.email?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-gray-200 truncate">{user.email}</span>
              <span className="text-[8px] font-black text-[#FF5A1F] uppercase tracking-widest mt-0.5 bg-[#FF5A1F]/10 border border-[#FF5A1F]/10 px-1.5 py-0.5 rounded-md w-fit">
                {user.staffRole || "Staff"}
              </span>
            </div>
          </div>
        </div>

        {/* Links Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150
                  ${isActive 
                    ? "bg-[#FF5A1F] text-white shadow-lg shadow-[#FF5A1F]/10" 
                    : "text-gray-400 hover:text-white hover:bg-white/[0.02]"}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Bottom Footer */}
        <div className="p-4 border-t border-white/[0.03]">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 py-3 border border-white/[0.05] rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-950/20 hover:border-red-900/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen p-6 md:p-10">
        <div className="max-w-7xl mx-auto w-full">
          {isPathAllowed ? (
            children
          ) : (
            <div className="min-h-[65vh] flex flex-col items-center justify-center text-center max-w-md mx-auto animate-fadeIn">
              <Shield className="w-16 h-16 text-[#FF5A1F] mb-5 animate-pulse" />
              <h1 className="text-xl font-bold tracking-tight text-white">Insufficient Role Clearance</h1>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Your system staff role (<span className="text-[#FF5A1F] font-bold uppercase">{currentRole}</span>) does not have clearance to view this dashboard section.
              </p>
              <Link
                href="/backoffice/dashboard"
                className="mt-8 px-6 py-3.5 bg-[#FF5A1F] hover:bg-[#E04D16] text-[10px] font-black uppercase tracking-widest text-white rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Return to Dashboard Overview
              </Link>
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}

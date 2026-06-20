"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  User, 
  Building, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Globe, 
  Phone, 
  ShieldAlert,
  Edit3
} from "lucide-react";
import { PROPERTY_TYPES } from "@/constants/enums";

export default function MorePage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Section Navigation: "profile" | "property" | "floor" | "main"
  const [activePanel, setActivePanel] = useState("main");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. SELF-PROFILE MANAGEMENT (GET & PUT)
  // =========================================================================
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLang, setProfileLang] = useState("en");
  const [profileColor, setProfileColor] = useState("#FF6B35");
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setProfileName(data.user.name || "");
        setProfilePhone(data.user.phone || "");
        setProfileLang(data.user.language || "en");
        setProfileColor(data.user.avatarColor || "#3B82F6");
      }
    } catch (err) {
      console.error("Load user profile failed:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, [getToken, apiUrl]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication expired.");

      const res = await fetch(`${apiUrl}/api/users/me`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim(),
          language: profileLang,
          avatarColor: profileColor
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile.");

      setSuccess("Profile settings updated successfully!");
      setProfile(data.user);
      setTimeout(() => {
        setSuccess("");
        setActivePanel("main");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // 2. PROPERTY MANAGEMENT (GET, PUT & DELETE)
  // =========================================================================
  const [properties, setProperties] = useState([]);
  const [activeProperty, setActiveProperty] = useState(null);
  const [editPropName, setEditPropName] = useState("");
  const [editPropLoc, setEditPropLoc] = useState("");
  const [editPropType, setEditPropType] = useState("hotel");
  const [loadingProps, setLoadingProps] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoadingProps(true);
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
        if (data.properties.length > 0 && !activeProperty) {
          const firstProp = data.properties[0];
          setActiveProperty(firstProp);
          setEditPropName(firstProp.name || "");
          setEditPropLoc(firstProp.location || "");
          setEditPropType(firstProp.type || "hotel");
        }
      }
    } catch (err) {
      console.error("Load properties failed:", err);
    } finally {
      setLoadingProps(false);
    }
  }, [getToken, apiUrl, activeProperty]);

  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    if (!activeProperty) return;

    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication expired.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editPropName.trim(),
          location: editPropLoc.trim(),
          type: editPropType
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update property.");

      setSuccess("Property settings updated!");
      
      // Dispatch event to refresh layout list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshPropertiesList"));
      }

      // Reload
      fetchProperties();
      setTimeout(() => {
        setSuccess("");
        setActivePanel("main");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to save property.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!activeProperty) return;
    if (!confirm(`WARNING: Are you sure you want to delete the entire property "${activeProperty.name}"? This will permanently delete all floors, rooms, automations, and revoke all hardware device assignments.`)) return;

    setError("");
    setSuccess("");
    setActionLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication expired.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete property.");

      setSuccess("Property successfully deleted.");
      setActiveProperty(null);

      // Refresh layout list
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshPropertiesList"));
      }

      fetchProperties();
      setTimeout(() => {
        setSuccess("");
        setActivePanel("main");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to delete property.");
    } finally {
      setActionLoading(false);
    }
  };



  // Listen to Layout selection changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivePropChange = (e) => {
      const prop = e.detail;
      setActiveProperty(prop);
      setEditPropName(prop?.name || "");
      setEditPropLoc(prop?.location || "");
      setEditPropType(prop?.type || "hotel");
    };

    window.addEventListener("activePropertyChange", handleActivePropChange);
    return () => {
      window.removeEventListener("activePropertyChange", handleActivePropChange);
    };
  }, []);

  // Hydrate Data on Mount
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchProperties();
    }
  }, [user, fetchProfile, fetchProperties]);



  // Global actions states
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pb-12 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between w-full pb-4 border-b border-slate-200/60 z-30">
        <div className="flex items-center gap-2.5">
          {activePanel !== "main" && (
            <button 
              onClick={() => {
                setActivePanel("main");
                setError("");
                setSuccess("");
              }}
              className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 cursor-pointer hover:bg-slate-50 transition-all border border-slate-200 bg-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
            {activePanel === "profile" && "Edit User Profile"}
            {activePanel === "property" && "Property Management"}
            {activePanel === "floor" && "Floor Level Directory"}
            {activePanel === "main" && "Settings & Properties"}
          </h1>
        </div>
      </div>

      {/* WARNINGS & ALERTS */}
      {(error || success) && (
        <div className="mt-3.5 select-none space-y-1.5 z-30">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6B35] text-xs shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-[#FF6B35] shrink-0 animate-pulse" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC SCROLLABLE BODY */}
      <div className="flex-1 my-4 space-y-4">
        
        {/* PANEL 1: MAIN OPTIONS MENU */}
        {activePanel === "main" && (
          <div className="space-y-4">
            
            {/* Quick Profile Widget */}
            {profile && (
              <div 
                onClick={() => setActivePanel("profile")}
                className="bg-white border border-slate-200/80 p-4 rounded-[24px] flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-xs uppercase shadow-sm"
                    style={{ backgroundColor: profile.avatarColor || "#FF6B35" }}
                  >
                    {profile.avatarInitials || "U"}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{profile.name || "Administrator"}</h4>
                    <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{profile.email}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            )}

            {/* Menu List Grid */}
            <div className="bg-white border border-slate-200/80 rounded-[24px] overflow-hidden shadow-sm divide-y divide-slate-200">
              
              {/* Property Settings */}
              <button
                onClick={() => setActivePanel("property")}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Building className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Property Administration</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      {activeProperty ? activeProperty.name : "Configure properties"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Floor Management */}
              <button
                onClick={() => router.push("/dashboard/floors")}
                disabled={!activeProperty}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 disabled:opacity-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Floor Levels Directory</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Manage building zones</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Personnel Registry Link */}
              <button
                onClick={() => router.push("/dashboard/staff")}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4.5 h-4.5 text-[#FF6B35]" />
                  <div>
                    <span className="text-xs font-black text-slate-800 block">Personnel &amp; Staff Registry</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Staff roles &amp; permissions</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

            </div>

            {/* System Info Block */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-[24px] flex flex-col gap-2 text-slate-500 text-[9px] font-bold select-text">
              <div className="flex justify-between">
                <span>API ENDPOINT</span>
                <span className="text-slate-700 font-mono">{apiUrl}</span>
              </div>
              <div className="flex justify-between">
                <span>CONSOLE STATUS</span>
                <span className="text-emerald-600 font-black">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>SESSION ID</span>
                <span className="text-slate-700 font-mono">{user?.uid ? user.uid.slice(0, 12) + "..." : "OFFLINE"}</span>
              </div>
            </div>

          </div>
        )}

        {/* PANEL 2: EDIT PROFILE */}
        {activePanel === "profile" && (
          <form onSubmit={handleUpdateProfile} className="bg-white border border-slate-200/80 rounded-[24px] p-5 space-y-4 shadow-sm">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
                placeholder="e.g. John Doe"
              />
            </div>

            {/* Phone number */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Phone Number
              </label>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 pl-10 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 transition-colors"
                  placeholder="e.g. +1 555-0199"
                />
              </div>
            </div>

            {/* Preferred Language */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                System Language
              </label>
              <div className="relative mt-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={profileLang}
                  onChange={(e) => setProfileLang(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 pl-10 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 cursor-pointer appearance-none"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español (ES)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="de">Deutsch (DE)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Avatar Theme Color */}
            <div className="space-y-1.5">
              <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1 block">
                Avatar Theme Color
              </label>
              <div className="flex gap-2.5 pt-1">
                {["#FF6B35", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setProfileColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer border border-white/5 active:scale-90 ${
                      profileColor === color ? "scale-125 ring-2 ring-[#FF6B35]/40 ring-offset-2 ring-offset-white" : ""
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3.5 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 active:scale-[0.98] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md shadow-[#FF6B35]/15 text-center mt-2 flex items-center justify-center gap-1.5"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Profile"
              )}
            </button>
          </form>
        )}

        {/* PANEL 3: PROPERTY ADMINISTRATION */}
        {activePanel === "property" && activeProperty && (
          <div className="space-y-4">
            <form onSubmit={handleUpdateProperty} className="bg-white border border-slate-200/80 rounded-[24px] p-5 space-y-4 shadow-sm">
              {/* Property Name */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Property Name
                </label>
                <input
                  type="text"
                  value={editPropName}
                  onChange={(e) => setEditPropName(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
                  placeholder="e.g. Grand Resort"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Property Location
                </label>
                <input
                  type="text"
                  value={editPropLoc}
                  onChange={(e) => setEditPropLoc(e.target.value)}
                  className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 w-full text-xs font-semibold focus:outline-none focus:border-[#FF6B35]/50 transition-colors mt-1"
                  placeholder="e.g. Miami, FL"
                />
              </div>

              {/* Property Type Selector */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Property Category
                </label>
                <div className="relative">
                  <select
                    value={editPropType}
                    onChange={(e) => setEditPropType(e.target.value)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-800 rounded-xl p-3 w-full text-xs font-semibold mt-1 focus:outline-none focus:border-[#FF6B35]/50 cursor-pointer capitalize appearance-none"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-white text-slate-800">
                        {t === "home" ? "Home / Residential" : t}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 pt-1 text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3.5 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteProperty}
                  disabled={actionLoading}
                  className="px-4 py-3.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-95"
                  title="Delete Property"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
          </div>
        )}

    </div>
  </div>
  );
}

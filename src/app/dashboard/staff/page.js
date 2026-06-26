"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AddStaffModal from "@/components/AddStaffModal";
import EditStaffModal from "@/components/EditStaffModal";
import { 
  ArrowLeft, 
  ChevronRight,
  Plus, 
  Loader2, 
  AlertCircle,
  UserCheck,
  Building,
  Shield
} from "lucide-react";

export default function StaffPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Modal toggle state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);

  // Staff lists
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DYNAMICALLY LOAD REGISTERED STAFF FROM API
  // =========================================================================
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${apiUrl}/api/staff`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.staff || data;
        if (Array.isArray(list)) {
          setStaff(list);
        }
      }
    } catch (err) {
      console.warn("Live staff registry endpoint not yet online.", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  useEffect(() => {
    if (user) {
      fetchStaff();
    }
  }, [user, fetchStaff]);

  // Translate raw database enum values to user-friendly titles
  const getRoleLabel = (roleKey) => {
    const rolesMap = {
      hotelManager: "Hotel Manager",
      officeAdmin: "Office Admin",
      technician: "Technician",
      staff: "Staff Member",
      reception: "Receptionist"
    };
    return rolesMap[roleKey] || "Staff Member";
  };

  // Dynamic Tailwind Badge Color mapping
  const getRoleBadgeStyles = (roleKey) => {
    const stylesMap = {
      hotelManager: "bg-red-50 text-red-600 border-red-100",
      officeAdmin: "bg-indigo-50 text-indigo-600 border-indigo-100",
      technician: "bg-blue-50 text-blue-600 border-blue-100",
      reception: "bg-emerald-50 text-emerald-700 border-emerald-100",
      staff: "bg-slate-50 text-slate-600 border-slate-200/50"
    };
    return stylesMap[roleKey] || stylesMap.staff;
  };

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pt-2 sm:pt-4 pb-16 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* Ambient backdrop glows */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF6B35]/[0.015] rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gray-500/[0.01] rounded-full blur-[100px] pointer-events-none" />

      {/* Dynamic Header Section */}
      <div className="flex items-center justify-between w-full pb-6 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="md:hidden w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
              Staff Registry
            </h1>
            <p className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Manage personnel, permissions, and target zone mappings.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#E0531F] rounded-full text-white text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shadow-[#FF6B35]/15 z-10"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Primary scrollable staff feed area */}
      <div className="flex-1 overflow-y-auto mt-6 pr-0.5 scrollbar-none space-y-3.5 z-10">
        
        {/* Error notification bar */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-750 text-xs select-none">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Premium Flashing Skeleton Loader Screen */
          <div className="space-y-3.5 animate-pulse select-none">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-5 border border-slate-200/50 bg-white/80 rounded-[24px] shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
                  <div className="flex flex-col space-y-2">
                    <div className="h-3.5 w-28 bg-slate-200 rounded-full" />
                    <div className="h-2 w-16 bg-slate-100 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-6.5 w-20 bg-slate-200 rounded-xl" />
                  <div className="w-4 h-4 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : staff.length > 0 ? (
          staff.map((member) => (
            <div
              key={member.uid}
              onClick={() => {
                setSelectedStaffMember(member);
                setIsEditModalOpen(true);
              }}
              className="group flex items-center justify-between p-5 border border-slate-200/50 bg-white/80 backdrop-blur-sm hover:-translate-y-0.5 hover:bg-white rounded-[24px] transition-all shadow-sm hover:shadow-md hover:border-slate-350 select-none cursor-pointer active:scale-[0.995]"
            >
              {/* Left Side: Dynamic Circular Avatar and Role/Name Meta */}
              <div className="flex items-center gap-4 min-w-0 text-left">
                <div 
                  className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm select-none border border-white/20 ring-2 ring-slate-100 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: member.avatarColor || "#FF6B35" }}
                >
                  {member.avatarInitials || "ST"}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[13px] font-bold text-gray-900 group-hover:text-[#FF6B35] transition-colors truncate">
                    {member.name}
                  </span>
                  
                  {/* Styled Role Badge */}
                  <div className="flex mt-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider border ${getRoleBadgeStyles(member.role)}`}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Access level / Assigned Area & Chevron */}
              <div className="shrink-0 flex items-center gap-3 text-right pl-3 select-none">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border border-slate-200/40 px-3 py-1.5 rounded-xl group-hover:bg-[#FF6B35]/5 group-hover:border-[#FF6B35]/15 group-hover:text-[#FF6B35] transition-all">
                  {member.assignedArea || member.accessLevel || "No Area"}
                </span>
                
                <ChevronRight className="w-4 h-4 text-slate-350 group-hover:text-[#FF6B35] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 border border-dashed border-slate-200/80 rounded-[32px] select-none bg-white">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-350 border border-slate-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 text-center">
              <span className="text-xs font-bold text-slate-700">No Staff Profiles Registered</span>
              <span className="text-[10px] text-slate-400 font-medium">Add new team members to delegate zone access controls.</span>
            </div>
          </div>
        )}

      </div>

      {/* Add Staff Registration Modal Dialog */}
      <AddStaffModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchStaff}
      />

      {/* Edit Staff Registration Modal Dialog */}
      <EditStaffModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedStaffMember(null);
        }}
        onSuccess={fetchStaff}
        staffMember={selectedStaffMember}
      />

    </div>
  );
}

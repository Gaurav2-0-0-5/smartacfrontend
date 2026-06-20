"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AddStaffModal from "@/components/AddStaffModal";
import EditStaffModal from "@/components/EditStaffModal";
import { 
  ChevronLeft, 
  Plus, 
  Loader2, 
  AlertCircle,
  Building,
  UserCheck,
  ShieldAlert
} from "lucide-react";

export default function StaffPage() {
  const router = useRouter();
  const { user, getToken } = useAuth();
  
  // Modal toggle state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState(null);

  // Staff lists
  const [staff, setStaff] = useState([
    {
      uid: "staff_1",
      name: "Sarah Jenkins",
      role: "hotelManager",
      accessLevel: "Full Access",
      assignedArea: "All Zones",
      avatarInitials: "SJ",
      avatarColor: "#EF4444"
    },
    {
      uid: "staff_2",
      name: "Michael Chen",
      role: "technician",
      accessLevel: "Level 3",
      assignedArea: "Floors 1-3",
      avatarInitials: "MC",
      avatarColor: "#3B82F6"
    },
    {
      uid: "staff_3",
      name: "Elena Rostova",
      role: "reception",
      accessLevel: "Level 1",
      assignedArea: "Lobby Deck",
      avatarInitials: "ER",
      avatarColor: "#10B981"
    }
  ]);

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
        if (Array.isArray(list) && list.length > 0) {
          setStaff(list);
        }
      }
    } catch (err) {
      console.warn("Live staff registry endpoint not yet online. Using mockup fallbacks.", err);
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

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pb-12 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* Dynamic Header Section */}
      <div className="flex items-center justify-between w-full pb-4 border-b border-slate-200/60 z-30">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.back()}
            className="md:hidden p-1.5 rounded-full text-slate-650 hover:text-slate-900 cursor-pointer hover:bg-white/60 transition-all border border-slate-200 bg-white"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="md:hidden text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
            Staff
          </h1>
          <p className="hidden md:block text-xs font-semibold text-slate-500">
            Manage personnel roles, system privileges, and target zone mappings.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#FF6B35] hover:bg-[#E0531F] rounded-full text-white text-[11px] font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-md shadow-[#FF6B35]/15"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Primary scrollable staff feed area */}
      <div className="flex-1 overflow-y-auto my-3 pr-1 scrollbar-none space-y-2">
        
        {/* Error notification bar */}
        {error && (
          <div className="flex items-start gap-2.5 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs select-none">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35]" />
            <span className="text-[9px] font-black tracking-widest uppercase text-slate-500">Loading Staff Portfolio...</span>
          </div>
        ) : staff.length > 0 ? (
          staff.map((member) => (
            <div
              key={member.uid}
              onClick={() => {
                setSelectedStaffMember(member);
                setIsEditModalOpen(true);
              }}
              className="flex items-center justify-between p-4 border border-slate-200/50 bg-white hover:bg-slate-50 rounded-[24px] mb-3 transition-all shadow-sm select-none cursor-pointer active:scale-[0.99]"
            >
              {/* Left Side: Dynamic Circular Avatar and Role/Name Meta */}
              <div className="flex items-center gap-3.5 min-w-0 text-left">
                <div 
                  className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-white text-xs uppercase shadow-sm select-none"
                  style={{ backgroundColor: member.avatarColor || "#FF6B35" }}
                >
                  {member.avatarInitials || "ST"}
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-xs font-black text-[#1C1C1E] truncate">
                    {member.name}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              </div>

              {/* Right Side: Access level or Assigned Area */}
              <div className="shrink-0 flex items-center text-right pl-3 select-none">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-[#F5F5F7] border border-slate-200/40 px-3.5 py-1.5 rounded-full">
                  {member.assignedArea || member.accessLevel || "No Area"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-slate-200 rounded-[32px] select-none bg-white">
            <UserCheck className="w-6 h-6 text-slate-400 mb-1" />
            <span className="text-xs font-bold text-slate-500">No staff profiles registered.</span>
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

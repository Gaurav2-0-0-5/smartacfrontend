"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Building,
  Layers
} from "lucide-react";

export default function FloorManagerPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  
  const [activeProperty, setActiveProperty] = useState(null);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add Floor Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newFloorNumber, setNewFloorNumber] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Floor Modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [editFloorNumber, setEditFloorNumber] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete Floor Modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // =========================================================================
  // 1. DATA HYDRATION & RE-FETCH
  // =========================================================================

  const fetchFloors = useCallback(async (propertyId) => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${propertyId}/floors`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load floors.");

      const list = data.floors || [];
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setFloors(list);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch floors.");
    } finally {
      setLoading(false);
    }
  }, [getToken, apiUrl]);

  // Synchronize on active property changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleActivePropertyChange = (e) => {
      const prop = e.detail;
      setActiveProperty(prop);
      if (prop) {
        fetchFloors(prop.propertyId);
      } else {
        setFloors([]);
        setLoading(false);
      }
    };

    window.addEventListener("activePropertyChange", handleActivePropertyChange);

    // Auto-hydrate first active workspace property
    const tryHydrateWorkspace = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch(`${apiUrl}/api/properties`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.properties && data.properties.length > 0) {
          setActiveProperty(data.properties[0]);
          fetchFloors(data.properties[0].propertyId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    tryHydrateWorkspace();

    return () => {
      window.removeEventListener("activePropertyChange", handleActivePropertyChange);
    };
  }, [fetchFloors, getToken, apiUrl]);

  // =========================================================================
  // 2. CREATE FLOOR HANDLER
  // =========================================================================

  const handleAddFloor = async (e) => {
    e.preventDefault();
    if (!newFloorNumber || isNaN(parseInt(newFloorNumber, 10))) {
      setAddError("Please specify a valid floor number.");
      return;
    }
    if (!activeProperty) {
      setAddError("Property must be selected.");
      return;
    }

    setAddLoading(true);
    setAddError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}/floors`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          floorNumber: parseInt(newFloorNumber, 10)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create floor.");

      setSuccess(`Floor ${newFloorNumber} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      setIsAddOpen(false);
      setNewFloorNumber("");
      fetchFloors(activeProperty.propertyId);
    } catch (err) {
      console.error(err);
      setAddError(err.message || "An error occurred.");
    } finally {
      setAddLoading(false);
    }
  };

  // =========================================================================
  // 3. EDIT FLOOR HANDLER
  // =========================================================================

  const handleEditFloor = async (e) => {
    e.preventDefault();
    if (!editFloorNumber || isNaN(parseInt(editFloorNumber, 10))) {
      setEditError("Please specify a valid floor number.");
      return;
    }
    if (!activeProperty || !editingFloor) {
      setEditError("Operation parameters missing.");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}/floors/${editingFloor.floorId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          floorNumber: parseInt(editFloorNumber, 10)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update floor.");

      setSuccess(`Floor updated to ${editFloorNumber} successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      setIsEditOpen(false);
      setEditingFloor(null);
      setEditFloorNumber("");
      fetchFloors(activeProperty.propertyId);
    } catch (err) {
      console.error(err);
      setEditError(err.message || "An error occurred.");
    } finally {
      setEditLoading(false);
    }
  };

  // =========================================================================
  // 4. DELETE FLOOR HANDLER
  // =========================================================================

  const handleDeleteFloor = async () => {
    if (!activeProperty || !deletingFloor) {
      setDeleteError("Operation parameters missing.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Auth session invalid.");

      const res = await fetch(`${apiUrl}/api/properties/${activeProperty.propertyId}/floors/${deletingFloor.floorId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete floor.");

      setSuccess(`${deletingFloor.name} and all nested rooms deleted successfully!`);
      setTimeout(() => setSuccess(""), 3000);
      setIsDeleteOpen(false);
      setDeletingFloor(null);
      fetchFloors(activeProperty.propertyId);
    } catch (err) {
      console.error(err);
      setDeleteError(err.message || "An error occurred.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Extract raw floor number from name (e.g. "Floor 3" -> 3)
  const openEditModal = (floor) => {
    setEditingFloor(floor);
    const num = floor.name.replace(/\D/g, "");
    setEditFloorNumber(num);
    setIsEditOpen(true);
  };

  return (
    <div className="relative w-full min-h-screen md:min-h-0 bg-transparent text-[#1C1C1E] flex flex-col pt-2 sm:pt-4 pb-16 select-none text-left animate-fadeIn max-w-2xl mx-auto">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-10 w-64 h-64 bg-[#FF6B35]/[0.01] rounded-full blur-[80px] pointer-events-none" />

      {/* A. HEADER ROW */}
      <div className="flex items-center justify-between w-full pb-6 z-10">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>

        <div className="flex flex-col items-center text-center">
          <h1 className="text-[20px] font-semibold tracking-tight text-[#1C1C1E]">
            Floor Manager
          </h1>
          {activeProperty && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {activeProperty.name}
            </span>
          )}
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="w-10 h-10 rounded-full bg-white border border-slate-200/50 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 text-slate-700" />
        </button>
      </div>

      {loading ? (
        /* Premium Flashing Skeleton Loader Screen */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 z-10 animate-pulse select-none w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200/50 rounded-[24px] sm:rounded-[32px] p-5 flex items-center justify-between shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-200 shrink-0" />
                <div className="flex flex-col space-y-2 text-left">
                  <div className="h-3.5 w-24 bg-slate-200 rounded-full" />
                  <div className="h-2.5 w-16 bg-slate-100 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Status Notifications */}
          {(error || success) && (
            <div className="space-y-2 z-10">
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2.5 p-4 rounded-[20px] bg-green-50 border border-green-100 text-green-700 text-xs shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{success}</span>
                </div>
              )}
            </div>
          )}

          {/* B. LIST OF FLOORS */}
          {floors.length === 0 ? (
            <div className="bg-white border border-slate-200/50 rounded-[32px] p-12 text-center flex flex-col items-center justify-center gap-4 flex-1 z-10 shadow-sm">
              <Building className="w-8 h-8 text-slate-300" />
              <span className="text-[11px] text-gray-450 font-black tracking-wider uppercase">
                No floors declared for this property.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 z-10">
              {floors.map((floor) => (
                <div
                  key={floor.floorId}
                  className="bg-white border border-slate-200/50 rounded-[24px] sm:rounded-[32px] p-5 flex items-center justify-between shadow-sm relative group transition-all hover:border-[#FF6B35]/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FF6B35]/5 border border-[#FF6B35]/10 flex items-center justify-center text-[#FF6B35]">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-slate-800 tracking-tight">
                        {floor.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {floor.roomCount || 0} {floor.roomCount === 1 ? "Room" : "Rooms"} paired
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(floor)}
                      className="p-2 rounded-full text-slate-400 hover:text-slate-655 hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                      title="Rename Floor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingFloor(floor);
                        setIsDeleteOpen(true);
                      }}
                      className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete Floor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* C. ADD FLOOR MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 p-6 max-w-sm w-full animate-fadeIn shadow-2xl relative text-left">
            <button 
              onClick={() => {
                setIsAddOpen(false);
                setAddError("");
                setNewFloorNumber("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleAddFloor} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Add Floor</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">
                  Insert floor level to declare
                </p>
              </div>

              {addError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                  Floor Number
                </label>
                <input
                  type="number"
                  required
                  min="-5"
                  max="100"
                  value={newFloorNumber}
                  onChange={(e) => setNewFloorNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full bg-[#F5F5F7] border border-slate-200/60 text-xs font-bold text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#FF6B35]/50 transition-colors shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="w-full py-3 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2 shadow-md shadow-[#FF6B35]/15"
              >
                {addLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create Floor"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* D. EDIT FLOOR MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 p-6 max-w-sm w-full animate-fadeIn shadow-2xl relative text-left">
            <button 
              onClick={() => {
                setIsEditOpen(false);
                setEditError("");
                setEditingFloor(null);
                setEditFloorNumber("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleEditFloor} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Edit Floor</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">
                  Change level identifier for {editingFloor?.name}
                </p>
              </div>

              {editError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
                  Floor Number
                </label>
                <input
                  type="number"
                  required
                  min="-5"
                  max="100"
                  value={editFloorNumber}
                  onChange={(e) => setEditFloorNumber(e.target.value)}
                  placeholder="e.g. 3"
                  className="w-full bg-[#F5F5F7] border border-slate-200/60 text-xs font-bold text-slate-700 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#FF6B35]/50 transition-colors shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={editLoading}
                className="w-full py-3 bg-[#FF6B35] hover:bg-[#E0531F] disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer active:scale-95 text-center flex items-center justify-center gap-2 shadow-md shadow-[#FF6B35]/15"
              >
                {editLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* E. DELETE FLOOR CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 p-6 max-w-sm w-full animate-fadeIn shadow-2xl relative text-left">
            <button 
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteError("");
                setDeletingFloor(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Delete Floor</h3>
                <p className="text-[10px] text-red-500 font-black uppercase tracking-widest leading-none mt-1">
                  WARNING: Cascade Deletion
                </p>
              </div>

              {deleteError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-xs font-semibold text-slate-550 leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-slate-800">{deletingFloor?.name}</span>? This will permanently delete the floor and <span className="text-red-500 font-extrabold">ALL {deletingFloor?.roomCount || 0} rooms</span> registered inside it.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setDeletingFloor(null);
                  }}
                  className="flex-1 py-3 bg-[#F5F5F7] hover:bg-[#EAEAEA] text-slate-700 text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFloor}
                  disabled={deleteLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-650 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deleteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/utils/firebaseClient";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Shield, Rocket } from "lucide-react";

export default function BackofficeGatewayPage() {
  const router = useRouter();
  const { user, getToken, refreshUserClaims } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);

  const apiUrl = process.env.Config || "";

  // Redirect to dashboard if already logged in and verified as staff
  useEffect(() => {
    if (user && user.isStaff) {
      router.push("/backoffice/dashboard");
    }
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { email, password } = formData;

    if (!email.trim() || !password) {
      setError("Please fill in all credentials.");
      setLoading(false);
      return;
    }

    try {
      // 1. Firebase Login
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Fetch latest claims
      await refreshUserClaims();

      // 3. Re-evaluate user claims directly
      const currentToken = await auth.currentUser?.getIdTokenResult();
      if (currentToken?.claims?.isStaff) {
        router.push("/backoffice/dashboard");
      } else {
        setError("Access Denied. You do not have backoffice staff permissions.");
        await auth.signOut();
      }
    } catch (err) {
      console.error("Backoffice login error:", err);
      let errMsg = "Authentication failed. Check credentials and retry.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        errMsg = "Incorrect password or username. Please check your credentials.";
      } else if (err.code === "auth/too-many-requests") {
        errMsg = "System locked this IP temporarily due to consecutive failures.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { email, password } = formData;

    if (!email.trim() || !password) {
      setError("Provide a valid email and password to bootstrap.");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign in or register in Firebase
      let userCred;
      try {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr) {
        // If account doesn't exist, bootstrap requires them to create it first via consumer portal
        throw new Error("Bootstrap requires an existing Firebase account. Please sign up on the main portal first.");
      }

      // 2. Retrieve token
      const token = await userCred.user.getIdToken();

      // 3. Request bootstrap elevation
      const res = await fetch(`${apiUrl}/api/backoffice/bootstrap`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to bootstrap backoffice.");
      }

      setSuccess("SuperAdmin elevation successfully configured. Reloading credentials...");

      // 4. Force claim sync
      await refreshUserClaims();
      router.push("/backoffice/dashboard");

    } catch (err) {
      console.error("Bootstrapping failed:", err);
      setError(err.message || "Failed to initialize SuperAdmin. The system may already be bootstrapped.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center px-6 py-12 text-white select-none relative overflow-hidden">
      
      {/* Dynamic ambient backdrop glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FF5A1F]/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[400px] space-y-8 flex flex-col z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-[24px] bg-[#18181B] border border-white/[0.05] text-[#FF5A1F] shadow-lg mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight text-white">
            NexaFlow <span className="text-[#FF5A1F]">Backoffice</span>
          </h2>
          <p className="mt-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Internal Operations Portal
          </p>
        </div>

        {/* Auth Box Card */}
        <div className="space-y-6 bg-[#18181B]/60 border border-white/[0.05] backdrop-blur-md rounded-[32px] p-8 shadow-2xl">
          
          <div className="flex flex-col text-left pb-2 border-b border-white/[0.05]">
            <h3 className="text-sm font-bold text-gray-200">
              {isBootstrapMode ? "System Initialization" : "Staff Authentication"}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
              {isBootstrapMode 
                ? "First-time setup. Elevates the target account to the root SuperAdmin role."
                : "Protected admin session. Access restricted to registered employee accounts."}
            </p>
          </div>

          <form className="space-y-5" onSubmit={isBootstrapMode ? handleBootstrap : handleLogin}>
            
            {/* Input - Email */}
            <div className="space-y-2 text-left">
              <label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@nexaflow.io"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: "42px" }}
                  className="block w-full pr-4 py-3.5 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Input - Password */}
            <div className="space-y-2 text-left">
              <label htmlFor="password" className="text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: "42px", paddingRight: "42px" }}
                  className="block w-full py-3.5 bg-[#09090B] border border-white/[0.05] rounded-[16px] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5A1F]/50 focus:ring-2 focus:ring-[#FF5A1F]/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full text-xs font-black uppercase tracking-widest text-white bg-[#FF5A1F] hover:bg-[#E04D16] focus:outline-none active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none shadow-lg shadow-[#FF5A1F]/10 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : isBootstrapMode ? (
                <>
                  Bootstrap System
                  <Rocket className="w-4 h-4" />
                </>
              ) : (
                <>
                  Admin Login
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Messages Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs leading-relaxed text-left animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs leading-relaxed text-left animate-fadeIn">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Toggle Bootstrapping State */}
          <div className="pt-4 text-center text-xs text-gray-500 border-t border-white/[0.05]">
            <button
              onClick={() => {
                setIsBootstrapMode(!isBootstrapMode);
                setError("");
                setSuccess("");
              }}
              className="font-bold text-gray-400 hover:text-[#FF5A1F] transition-colors"
            >
              {isBootstrapMode ? "Back to Staff Sign-In" : "Initialize Root SuperAdmin Server Setup"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

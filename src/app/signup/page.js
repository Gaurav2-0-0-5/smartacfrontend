"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/utils/firebaseClient";
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Activity } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Field change handler
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error on input change
    if (error) setError("");
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { name, email, password } = formData;

    // Standard client side validations
    if (!name.trim()) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      
      // 1. Dispatch profile registration to Backend
      const response = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register profile.");
      }

      // 2. Success flow: Programmatically log the user in via Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // 3. Route to the private dashboard
      router.push("/dashboard");

    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEFEF] flex flex-col items-center justify-center px-6 py-12 select-none animate-fadeIn">
      <div className="w-full max-w-[400px] space-y-8 flex flex-col">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          {/* Logo container with orange accent */}
          <div className="flex items-center justify-center w-14 h-14 rounded-[24px] bg-white border border-[#E5E5EA] text-[#FF6B35] shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-4">
            <Activity className="w-7 h-7 text-[#FF6B35]" />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight text-gray-900">
            Nexaflow <span className="text-[#FF6B35]">Automations</span>
          </h2>
          <p className="mt-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Create an enterprise manager account
          </p>
        </div>

        {/* Form Body Container */}
        <div className="space-y-6 bg-white border border-[#E5E5EA]/60 rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Input - Name */}
            <div className="space-y-2 text-left">
              <label htmlFor="name" className="text-[10px] font-black text-gray-450 uppercase tracking-wider pl-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  style={{ paddingLeft: "42px" }}
                  className="block w-full pr-4 py-3.5 bg-[#F5F5F7] border border-transparent rounded-[16px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#FF6B35]/40 focus:ring-2 focus:ring-[#FF6B35]/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Input - Email */}
            <div className="space-y-2 text-left">
              <label htmlFor="email" className="text-[10px] font-black text-gray-450 uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="manager@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: "42px" }}
                  className="block w-full pr-4 py-3.5 bg-[#F5F5F7] border border-transparent rounded-[16px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#FF6B35]/40 focus:ring-2 focus:ring-[#FF6B35]/10 transition-all duration-200"
                />
              </div>
            </div>

            {/* Input - Password */}
            <div className="space-y-2 text-left">
              <label htmlFor="password" className="text-[10px] font-black text-gray-450 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
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
                  className="block w-full py-3.5 bg-[#F5F5F7] border border-transparent rounded-[16px] text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#FF6B35]/40 focus:ring-2 focus:ring-[#FF6B35]/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-655 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Pill Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full text-xs font-black uppercase tracking-widest text-white bg-[#FF6B35] hover:bg-[#E0531F] focus:outline-none active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none shadow-lg shadow-[#FF6B35]/15 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Sign Up
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Form Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-55/40 border border-red-100 text-red-700 text-xs animate-fadeIn leading-relaxed text-left">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Toggle Footer */}
          <div className="pt-4 text-center text-xs text-gray-500 border-t border-[#E5E5EA]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[#FF6B35] hover:opacity-80 transition-all duration-150"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react"
import { apiJson } from "@/lib/api-client"
import { PremiumMotionStyles } from "@/components/premium-ui"
import { HomepageThemeStyles, StoreHeader } from "@/components/homepage-theme"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)

  const handleLogin = async () => {
    try {
      setLoggingIn(true)
      await apiJson<{ authenticated: boolean }>("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password }),
      })

      toast.success("Admin login successful", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })

      setTimeout(() => {
        window.location.href = "/admin"
      }, 800)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wrong admin password", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <>
      <PremiumMotionStyles />
      <HomepageThemeStyles />

      <main className="agt-page premium-page min-h-screen px-4 py-6 text-slate-900">
        <StoreHeader cartCount={0} likedCount={0} />
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center pb-10 pt-8">
        <section className="w-full max-w-md overflow-hidden rounded-[34px] border border-white/70 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="relative overflow-hidden bg-slate-950 px-8 py-8 text-white">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-violet-200 ring-1 ring-white/10">
                <ShieldCheck size={28} strokeWidth={1.8} />
              </div>

              <p className="text-xs font-black uppercase tracking-[0.26em] text-violet-200">
                Secure Admin Access
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Admin Login</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Enter the admin password to access product uploads, payments, and dashboard tools.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-8">
            <div>
              <label className="mb-2 block text-sm font-black text-slate-700">
                Admin Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  strokeWidth={1.7}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loggingIn) handleLogin()
                  }}
                  placeholder="Enter admin password"
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-12 py-4 text-sm font-semibold outline-none transition-all duration-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.7} />
                  ) : (
                    <Eye size={18} strokeWidth={1.7} />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 py-4 text-lg font-black text-white shadow-xl shadow-violet-100 transition hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative flex items-center gap-2">
                {loggingIn && (
                  <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white premium-spin" />
                )}
                {loggingIn ? "Logging in..." : "Login to Dashboard"}
              </span>
            </button>

            <a
              href="/"
              className="block w-full rounded-2xl border border-slate-300 bg-white py-4 text-center font-black text-slate-700 hover:bg-slate-50"
            >
              Back to Marketplace
            </a>

            <p className="text-center text-xs leading-5 text-slate-400">
              Protected workspace for managing premium teaching materials and payment approvals.
            </p>
          </div>
        </section>
        </div>
      </main>
    </>
  )
}

"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { Eye, EyeOff } from "lucide-react"

const ADMIN_PASSWORD = "angeladmin123"
const ADMIN_SESSION_KEY = "angel-glez-admin-auth"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_SESSION_KEY, "true")

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
    } else {
      toast.error("Wrong admin password", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-[28px] bg-white p-8 shadow-sm">
        <h1 className="mb-3 text-4xl font-extrabold">Admin Login</h1>
        <p className="mb-6 text-slate-500">
          Enter the admin password to access the dashboard.
        </p>

        <div className="space-y-4">
          <div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Admin password"
    className="w-full rounded-md border border-gray-300 p-3 pr-10 text-sm outline-none focus:border-blue-500"
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
  >
    {showPassword ? (
      <EyeOff size={18} strokeWidth={1.5} />
    ) : (
      <Eye size={18} strokeWidth={1.5} />
    )}
  </button>
</div>

          <button
            onClick={handleLogin}
            className="w-full rounded-2xl bg-violet-600 py-4 text-lg font-bold text-white hover:bg-violet-700"
          >
            Login
          </button>

          <a
            href="/"
            className="block w-full rounded-2xl border border-slate-300 py-4 text-center font-bold text-slate-700 hover:bg-slate-100"
          >
            Back to Marketplace
          </a>
        </div>
      </div>
    </main>
  )
}
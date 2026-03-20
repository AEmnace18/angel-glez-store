"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const ADMIN_SESSION_KEY = "angel-glez-admin-auth"

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

type PaymentSubmission = {
  id: string
  buyer_name: string
  buyer_email: string
  proof_path: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
  product_id: number
  products?: {
    id: number
    title: string
    price: number
    grade: string
    quarter: string
    file_name: string
    image_url: string
    sold?: number
  } | null
}

function StatCard({
  label,
  value,
  tone = "slate",
  subtext,
}: {
  label: string
  value: string | number
  tone?: "slate" | "amber" | "emerald" | "rose" | "violet"
  subtext?: string
}) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    violet: "border-violet-200 bg-violet-50 text-violet-900",
  }

  const labelToneMap = {
    slate: "text-slate-500",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    violet: "text-violet-700",
  }

  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] ${toneMap[tone]}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.22em] ${labelToneMap[tone]}`}>{label}</p>
      <p className="mt-3 text-4xl font-black tracking-tight">{value}</p>
      {subtext ? <p className="mt-2 text-sm opacity-75">{subtext}</p> : null}
    </div>
  )
}

export default function AdminPaymentsPage() {
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [payments, setPayments] = useState<PaymentSubmission[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isAdmin = localStorage.getItem(ADMIN_SESSION_KEY)
    if (isAdmin !== "true") {
      window.location.href = "/admin-login"
      return
    }

    setCheckedAuth(true)
    void loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        products (
          id,
          title,
          price,
          grade,
          quarter,
          file_name,
          image_url,
          sold
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load payments", { style: toastStyle })
      setLoading(false)
      return
    }

    setPayments((data || []) as PaymentSubmission[])
    setLoading(false)
  }

  const filteredPayments = useMemo(() => {
    const keyword = search.toLowerCase()

    return payments.filter((payment) => {
      const matchesKeyword =
        payment.buyer_name?.toLowerCase().includes(keyword) ||
        payment.buyer_email?.toLowerCase().includes(keyword) ||
        payment.status?.toLowerCase().includes(keyword) ||
        payment.products?.title?.toLowerCase().includes(keyword)

      const matchesStatus = statusFilter === "all" ? true : payment.status === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [payments, search, statusFilter])

  const totals = useMemo(() => {
    const pending = payments.filter((p) => p.status === "pending")
    const approved = payments.filter((p) => p.status === "approved")
    const rejected = payments.filter((p) => p.status === "rejected")
    const revenue = approved.reduce((sum, p) => sum + Number(p.products?.price || 0), 0)

    const bestProductsMap = new Map<string, { title: string; count: number; revenue: number }>()
    for (const payment of approved) {
      const title = payment.products?.title || "Unknown product"
      const entry = bestProductsMap.get(title) || { title, count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += Number(payment.products?.price || 0)
      bestProductsMap.set(title, entry)
    }

    const bestProducts = [...bestProductsMap.values()]
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5)

    const topGrade = (() => {
      const grades = new Map<string, number>()
      for (const payment of approved) {
        const grade = payment.products?.grade || "-"
        grades.set(grade, (grades.get(grade) || 0) + 1)
      }
      return [...grades.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
    })()

    const topQuarter = (() => {
      const quarters = new Map<string, number>()
      for (const payment of approved) {
        const quarter = payment.products?.quarter || "-"
        quarters.set(quarter, (quarters.get(quarter) || 0) + 1)
      }
      return [...quarters.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
    })()

    const approvalRate = payments.length ? Math.round((approved.length / payments.length) * 100) : 0

    return {
      total: payments.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      revenue,
      bestProducts,
      topGrade,
      topQuarter,
      approvalRate,
    }
  }, [payments])

  const updateStatus = async (
    payment: PaymentSubmission,
    status: "pending" | "approved" | "rejected"
  ) => {
    const { error } = await supabase.from("purchases").update({ status }).eq("id", payment.id)

    if (error) {
      toast.error("Failed to update status", { style: toastStyle })
      return
    }

    if (status === "approved") {
      const currentSold = Number(payment.products?.sold || 0)

      await supabase.from("products").update({ sold: currentSold + 1 }).eq("id", payment.product_id)

      if (payment.proof_path) {
        await supabase.storage.from("payment-proofs").remove([payment.proof_path])
        await supabase.from("purchases").update({ proof_path: null }).eq("id", payment.id)
      }
    }

    toast.success(`Payment marked as ${status}`, { style: toastStyle })
    void loadPayments()
  }

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase.from("purchases").delete().eq("id", id)

    if (error) {
      toast.error("Failed to delete record", { style: toastStyle })
      return
    }

    toast.success("Payment record deleted", { style: toastStyle })
    void loadPayments()
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    window.location.href = "/admin-login"
  }

  const getProofUrl = (proofPath: string | null) => {
    if (!proofPath) return null
    const { data } = supabase.storage.from("payment-proofs").getPublicUrl(proofPath)
    return data.publicUrl
  }

  if (!checkedAuth) return null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.16),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-[36px] border border-white/60 bg-slate-900 px-6 py-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.20)] md:px-8 lg:px-10">
          <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute left-1/3 top-10 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-violet-300">
                  Admin Analytics
                </p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                  Payments, approvals, and revenue dashboard
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  Review buyer submissions, approve payments fast, and spot which products,
                  grade levels, and quarters are performing best.
                </p>
              </div>

              <div className="flex gap-3">
                <a
                  href="/admin"
                  className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15"
                >
                  ← Admin
                </a>
                <button
                  onClick={handleLogout}
                  className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Orders" value={totals.total} subtext="All submitted payments" />
          <StatCard label="Pending" value={totals.pending} tone="amber" subtext="Waiting for review" />
          <StatCard label="Approved" value={totals.approved} tone="emerald" subtext={`${totals.approvalRate}% approval rate`} />
          <StatCard label="Rejected" value={totals.rejected} tone="rose" subtext="Needs follow-up" />
          <StatCard label="Revenue" value={`₱${totals.revenue}`} tone="violet" subtext="Approved orders only" />
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                  Leaderboard
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">Top-selling products</h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                Top Grade: {totals.topGrade}
              </div>
            </div>

            {totals.bestProducts.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                No approved sales yet.
              </div>
            ) : (
              <div className="space-y-4">
                {totals.bestProducts.map((item, index) => (
                  <div
                    key={item.title}
                    className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                          {index + 1}
                        </div>

                        <div>
                          <p className="text-lg font-extrabold text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-500">
                            {item.count} approved sale{item.count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:w-auto">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Sales</p>
                          <p className="mt-1 text-xl font-black text-slate-900">{item.count}</p>
                        </div>
                        <div className="rounded-2xl bg-violet-50 px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-500">Revenue</p>
                          <p className="mt-1 text-xl font-black text-violet-900">₱{item.revenue}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
              Snapshot
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Performance focus</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top Quarter</p>
                <p className="mt-2 text-4xl font-black text-slate-900">{totals.topQuarter}</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top Grade</p>
                <p className="mt-2 text-4xl font-black text-slate-900">{totals.topGrade}</p>
              </div>

              <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Admin Note</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Approved payments increase product sold counts and automatically clear stored proof images.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-4 z-20 mb-6 rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search buyer name, email, product, or status"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 outline-none transition focus:border-violet-500 focus:bg-white"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected")}
              className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 font-bold text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">No payment submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPayments.map((payment) => {
              const proofUrl = getProofUrl(payment.proof_path)

              return (
                <div
                  key={payment.id}
                  className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-7"
                >
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-extrabold text-slate-900">{payment.buyer_name}</h2>
                        <div
                          className={`rounded-full px-4 py-2 text-sm font-bold ${
                            payment.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : payment.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {payment.status}
                        </div>
                      </div>
                      <p className="mt-2 text-slate-500">{payment.buyer_email}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Submitted: {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Amount</p>
                      <p className="mt-1 text-2xl font-black text-slate-900">₱{payment.products?.price || 0}</p>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Product Details</p>
                        <div className="mt-4 flex items-center gap-4">
                          {payment.products ? (
                            <img
                              src={payment.products.image_url}
                              alt={payment.products.title}
                              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-200 text-xs font-bold text-slate-500">
                              No Image
                            </div>
                          )}

                          <div>
                            <p className="font-extrabold text-slate-900">{payment.products?.title || "Unknown product"}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {payment.products?.grade || "-"} • {payment.products?.quarter || "-"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{payment.products?.file_name || "-"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[22px] bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Product</p>
                          <p className="mt-2 font-bold text-slate-900">{payment.products?.title || "Unknown product"}</p>
                        </div>
                        <div className="rounded-[22px] bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Grade / Quarter</p>
                          <p className="mt-2 font-bold text-slate-900">
                            {payment.products?.grade || "-"} • {payment.products?.quarter || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {proofUrl ? (
                        <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Proof of Payment</p>
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              Open Full Image
                            </a>
                          </div>
                          <a href={proofUrl} target="_blank" rel="noreferrer">
                            <img
                              src={proofUrl}
                              alt="Proof of payment"
                              className="max-h-[320px] w-full rounded-2xl border border-slate-200 object-contain bg-slate-50"
                            />
                          </a>
                        </div>
                      ) : (
                        <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                          No proof image available.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => updateStatus(payment, "pending")}
                          className="rounded-2xl bg-amber-500 px-4 py-3 font-bold text-white transition hover:bg-amber-600"
                        >
                          Mark Pending
                        </button>

                        <button
                          onClick={() => updateStatus(payment, "approved")}
                          className="rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700"
                        >
                          Mark Approved
                        </button>

                        <button
                          onClick={() => updateStatus(payment, "rejected")}
                          className="rounded-2xl bg-rose-500 px-4 py-3 font-bold text-white transition hover:bg-rose-600"
                        >
                          Mark Rejected
                        </button>

                        <button
                          onClick={() => deleteSubmission(payment.id)}
                          className="rounded-2xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                          Delete Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

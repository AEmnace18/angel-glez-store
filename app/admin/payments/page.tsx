"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { PremiumMotionStyles } from "@/components/premium-ui"
import { HomepageThemeStyles, StoreHeader } from "@/components/homepage-theme"

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

export default function AdminPaymentsPage() {
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [payments, setPayments] = useState<PaymentSubmission[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "history">("pending")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { authenticated } = await apiJson<{ authenticated: boolean }>("/api/admin/session")

        if (!authenticated) {
          window.location.href = "/admin-login"
          return
        }

        setCheckedAuth(true)
        await loadPayments()
      } catch {
        window.location.href = "/admin-login"
      }
    }

    checkAdminSession()
  }, [])

  const loadPayments = async () => {
    setLoading(true)

    try {
      const { payments: loadedPayments } = await apiJson<{ payments: PaymentSubmission[] }>("/api/admin/payments")
      setPayments(loadedPayments || [])
    } catch (error) {
      console.warn("Handled client error:", error instanceof Error ? error.message : error)
      toast.error(error instanceof Error ? error.message : "Failed to load payments", { style: toastStyle })
    } finally {
      setLoading(false)
    }
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

  const tabCounts = useMemo(
    () => ({
      pending: payments.filter((payment) => payment.status === "pending").length,
      approved: payments.filter((payment) => payment.status === "approved").length,
      rejected: payments.filter((payment) => payment.status === "rejected").length,
      history: payments.filter((payment) => payment.status !== "pending").length,
    }),
    [payments]
  )

  const visiblePayments = useMemo(() => {
    if (activeTab === "history") {
      return filteredPayments.filter((payment) => payment.status !== "pending")
    }

    return filteredPayments.filter((payment) => payment.status === activeTab)
  }, [filteredPayments, activeTab])

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

    return {
      total: payments.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      revenue,
      bestProducts,
      topGrade,
      topQuarter,
    }
  }, [payments])

  const updateStatus = async (
    payment: PaymentSubmission,
    status: "pending" | "approved" | "rejected"
  ) => {
    const previousPayments = payments

    setPayments((current) =>
      current.map((item) =>
        item.id === payment.id
          ? {
              ...item,
              status,
              proof_path: status === "approved" ? null : item.proof_path,
            }
          : item
      )
    )

    if (status === "approved") setActiveTab("approved")
    if (status === "rejected") setActiveTab("rejected")
    if (status === "pending") setActiveTab("pending")

    try {
      await apiJson<{ updated: boolean }>(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    } catch (error) {
      setPayments(previousPayments)
      toast.error(error instanceof Error ? error.message : "Failed to update status", { style: toastStyle })
      return
    }

    toast.success(`Payment marked as ${status}`, { style: toastStyle })
    loadPayments()
  }

  const deleteSubmission = async (id: string) => {
    try {
      await apiJson<{ deleted: boolean }>(`/api/admin/payments/${id}`, {
        method: "DELETE",
      })
      toast.success("Payment record deleted", { style: toastStyle })
      loadPayments()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete record", { style: toastStyle })
    }
  }

  const handleLogout = async () => {
    await apiJson<{ authenticated: boolean }>("/api/admin/session", {
      method: "DELETE",
    }).catch(() => null)
    window.location.href = "/admin-login"
  }

  const getProofUrl = (proofPath: string | null) => {
    if (!proofPath) return null
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/payment-proofs/${proofPath}`
  }

  if (!checkedAuth) return null

  return (
    <>
      <PremiumMotionStyles />
      <HomepageThemeStyles />
      <main className="agt-page premium-page min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
        <StoreHeader cartCount={0} likedCount={0} />
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-slate-900 px-6 py-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)] md:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-violet-300">
                Admin Analytics
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Payments, approvals, and revenue at a glance
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Review buyer submissions, approve payments fast, and track which files and grade levels are selling best.
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
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Total Orders</p>
            <p className="mt-3 text-4xl font-black text-slate-900">{totals.total}</p>
          </div>
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 shadow-[0_20px_60px_rgba(245,158,11,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Pending</p>
            <p className="mt-3 text-4xl font-black text-amber-900">{totals.pending}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_20px_60px_rgba(16,185,129,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Approved</p>
            <p className="mt-3 text-4xl font-black text-emerald-900">{totals.approved}</p>
          </div>
          <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-[0_20px_60px_rgba(244,63,94,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Rejected</p>
            <p className="mt-3 text-4xl font-black text-rose-900">{totals.rejected}</p>
          </div>
          <div className="rounded-[28px] border border-violet-200 bg-violet-50 p-5 shadow-[0_20px_60px_rgba(124,58,237,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Revenue</p>
            <p className="mt-3 text-4xl font-black text-violet-900">₱{totals.revenue}</p>
          </div>
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                  Insights
                </p>
                <h2 className="mt-2 text-2xl font-black">Best-performing products</h2>
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
                    className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500">{item.count} approved sale{item.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revenue</p>
                      <p className="mt-1 text-xl font-black text-slate-900">₱{item.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
              Quick Snapshot
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Selling trend</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top Quarter</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{totals.topQuarter}</p>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top Grade</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{totals.topGrade}</p>
              </div>

              <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-5">
                <p className="text-sm leading-7 text-slate-600">
                  Approved payments increase product sold counts and automatically clear stored proof images.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
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

        <section className="mb-6 flex flex-wrap gap-3">
          {[
            { key: "pending", label: "Pending", count: tabCounts.pending },
            { key: "approved", label: "Approved", count: tabCounts.approved },
            { key: "rejected", label: "Rejected", count: tabCounts.rejected },
            { key: "history", label: "History", count: tabCounts.history },
          ].map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "pending" | "approved" | "rejected" | "history")}
                className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            )
          })}
        </section>

        {loading ? (
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">Loading payments...</p>
          </div>
        ) : visiblePayments.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">No payment submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visiblePayments.map((payment) => {
              const proofUrl = getProofUrl(payment.proof_path)

              return (
                <div
                  key={payment.id}
                  className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900">{payment.buyer_name}</h2>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
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
                      <p className="mt-1 text-sm text-slate-500">{payment.buyer_email}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted: {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Amount
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900">₱{payment.products?.price || 0}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Product Details
                      </p>

                      {payment.products && (
                        <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
                          <img
                            src={getProductImageSrc(payment.products.image_url)}
                            alt={payment.products.title}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-900">
                              {payment.products.title}
                            </p>
                            <p className="text-sm text-slate-500">
                              {payment.products.grade} • {payment.products.quarter}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {payment.products.file_name}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Product
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {payment.products?.title || "Unknown product"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Grade / Quarter
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {payment.products?.grade || "-"} • {payment.products?.quarter || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Proof of Payment
                        </p>

                        {proofUrl ? (
                          <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={proofUrl}
                              alt="Proof of payment"
                              className="h-28 w-full rounded-2xl border border-slate-200 object-cover"
                            />
                            <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                              View full proof
                            </span>
                          </a>
                        ) : (
                          <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
                            No proof image available.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updateStatus(payment, "pending")}
                          className="rounded-xl bg-amber-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
                        >
                          Pending
                        </button>

                        <button
                          onClick={() => updateStatus(payment, "approved")}
                          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => updateStatus(payment, "rejected")}
                          className="rounded-xl bg-rose-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-rose-600"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => deleteSubmission(payment.id)}
                          className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                          Delete
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
    </>
  )
}

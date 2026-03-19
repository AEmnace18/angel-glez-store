"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const ADMIN_SESSION_KEY = "angel-glez-admin-auth"

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isAdmin = localStorage.getItem(ADMIN_SESSION_KEY)
    if (isAdmin !== "true") {
      window.location.href = "/admin-login"
      return
    }

    setCheckedAuth(true)
    loadPayments()
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
      toast.error("Failed to load payments", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      setLoading(false)
      return
    }

    setPayments((data || []) as PaymentSubmission[])
    setLoading(false)
  }

  const filteredPayments = useMemo(() => {
    const keyword = search.toLowerCase()

    return payments.filter((payment) => {
      return (
        payment.buyer_name?.toLowerCase().includes(keyword) ||
        payment.buyer_email?.toLowerCase().includes(keyword) ||
        payment.status?.toLowerCase().includes(keyword) ||
        payment.products?.title?.toLowerCase().includes(keyword)
      )
    })
  }, [payments, search])

  const updateStatus = async (
    payment: PaymentSubmission,
    status: "pending" | "approved" | "rejected"
  ) => {
    const { error } = await supabase
      .from("purchases")
      .update({ status })
      .eq("id", payment.id)

    if (error) {
      toast.error("Failed to update status", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    if (status === "approved") {
      const currentSold = Number(payment.products?.sold || 0)

      await supabase
        .from("products")
        .update({ sold: currentSold + 1 })
        .eq("id", payment.product_id)

      if (payment.proof_path) {
        await supabase.storage
          .from("payment-proofs")
          .remove([payment.proof_path])

        await supabase
          .from("purchases")
          .update({ proof_path: null })
          .eq("id", payment.id)
      }
    }

    toast.success(`Payment marked as ${status}`, {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })

    loadPayments()
  }

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete record", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    toast.success("Payment record deleted", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })

    loadPayments()
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    window.location.href = "/admin-login"
  }

  const getProofUrl = (proofPath: string | null) => {
    if (!proofPath) return null

    const { data } = supabase.storage
      .from("payment-proofs")
      .getPublicUrl(proofPath)

    return data.publicUrl
  }

  if (!checkedAuth) return null

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">Payment Tracker</h1>
            <p className="mt-2 text-slate-500">
              Review submitted GCash payments from buyers.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/admin"
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
            >
              ← Admin
            </a>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer name, email, product, or status"
            className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
          />
        </div>

        {loading ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">No payment submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPayments.map((payment) => {
              const proofUrl = getProofUrl(payment.proof_path)

              return (
                <div key={payment.id} className="rounded-[28px] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold">{payment.buyer_name}</h2>
                      <p className="mt-1 text-slate-500">
                        {payment.buyer_email}
                      </p>
                      <p className="mt-1 text-slate-500">
                        Submitted: {new Date(payment.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        payment.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : payment.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {payment.status}
                    </div>
                  </div>

                  <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Product</p>
                      <p className="mt-2 font-bold">{payment.products?.title || "Unknown product"}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Grade / Quarter</p>
                      <p className="mt-2 font-bold">
                        {payment.products?.grade || "-"} • {payment.products?.quarter || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Amount</p>
                      <p className="mt-2 font-bold">₱{payment.products?.price || 0}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">File</p>
                      <p className="mt-2 font-bold">{payment.products?.file_name || "-"}</p>
                    </div>
                  </div>

                  {payment.products && (
                    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
                      <img
                        src={payment.products.image_url}
                        alt={payment.products.title}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                      <div>
                        <p className="font-bold">{payment.products.title}</p>
                        <p className="text-sm text-slate-500">
                          {payment.products.grade} • {payment.products.quarter}
                        </p>
                      </div>
                    </div>
                  )}

                  {proofUrl ? (
                    <div className="mb-6">
                      <p className="mb-3 text-sm font-semibold text-slate-500">
                        Proof of Payment
                      </p>
                      <a href={proofUrl} target="_blank" rel="noreferrer">
                        <img
                          src={proofUrl}
                          alt="Proof of payment"
                          className="max-h-[320px] rounded-2xl border border-slate-200 object-contain"
                        />
                      </a>
                    </div>
                  ) : (
                    <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      No proof image available.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => updateStatus(payment, "pending")}
                      className="rounded-2xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-600"
                    >
                      Mark Pending
                    </button>

                    <button
                      onClick={() => updateStatus(payment, "approved")}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                    >
                      Mark Approved
                    </button>

                    <button
                      onClick={() => updateStatus(payment, "rejected")}
                      className="rounded-2xl bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
                    >
                      Mark Rejected
                    </button>

                    <button
                      onClick={() => deleteSubmission(payment.id)}
                      className="rounded-2xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Delete Record
                    </button>
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
"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

const PAYMENT_SUBMISSIONS_KEY = "angel-glez-payment-submissions"
const ADMIN_SESSION_KEY = "angel-glez-admin-auth"

type PaymentItem = {
  id: number
  title: string
  price: number
  grade: string
  quarter: string
  fileName: string
  imageUrl: string
}

type PaymentSubmission = {
  id: number
  buyerName: string
  buyerGcash: string
  reference: string
  total: number
  selectedQR: number
  submittedAt: string
  status: "Pending" | "Verified" | "Rejected"
  items: PaymentItem[]
}

export default function AdminPaymentsPage() {
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [payments, setPayments] = useState<PaymentSubmission[]>([])
  const [search, setSearch] = useState("")
  const [showResetModal, setShowResetModal] = useState(false)

  const resetAllData = () => {
    localStorage.removeItem("angel-glez-cart")
    localStorage.removeItem("angel-glez-likes")
    localStorage.removeItem("angel-glez-purchases")
    localStorage.removeItem("angel-glez-payments")
    localStorage.removeItem(PAYMENT_SUBMISSIONS_KEY)
    localStorage.removeItem("angel-glez-orders")

    setPayments([])
    setShowResetModal(false)

    toast.success("All test data has been reset.", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  useEffect(() => {
    const isAdmin = localStorage.getItem(ADMIN_SESSION_KEY)
    if (isAdmin !== "true") {
      window.location.href = "/admin-login"
      return
    }

    setCheckedAuth(true)

    const saved = localStorage.getItem(PAYMENT_SUBMISSIONS_KEY)
    setPayments(saved ? JSON.parse(saved) : [])
  }, [])

  const filteredPayments = useMemo(() => {
    const keyword = search.toLowerCase()
    return payments.filter((payment) => {
      return (
        payment.buyerName.toLowerCase().includes(keyword) ||
        payment.buyerGcash.toLowerCase().includes(keyword) ||
        payment.reference.toLowerCase().includes(keyword) ||
        payment.status.toLowerCase().includes(keyword)
      )
    })
  }, [payments, search])

  const savePayments = (updated: PaymentSubmission[]) => {
    setPayments(updated)
    localStorage.setItem(PAYMENT_SUBMISSIONS_KEY, JSON.stringify(updated))
  }

  const updateStatus = (id: number, status: "Pending" | "Verified" | "Rejected") => {
    const updated = payments.map((payment) =>
      payment.id === id ? { ...payment, status } : payment
    )

    savePayments(updated)

    toast.success(`Payment marked as ${status}`, {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const deleteSubmission = (id: number) => {
    const updated = payments.filter((payment) => payment.id !== id)
    savePayments(updated)

    toast.success("Payment record deleted", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const copyReference = async (reference: string) => {
    await navigator.clipboard.writeText(reference)

    toast.success("Reference copied", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    window.location.href = "/admin-login"
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
              onClick={() => setShowResetModal(true)}
              className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
            >
              Reset Test Data
            </button>

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
            placeholder="Search buyer name, GCash number, reference, or status"
            className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
          />
        </div>

        {filteredPayments.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">No payment submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="rounded-[28px] bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-extrabold">{payment.buyerName}</h2>
                    <p className="mt-1 text-slate-500">
                      Submitted: {payment.submittedAt}
                    </p>
                  </div>

                  <div
                    className={`rounded-full px-4 py-2 text-sm font-bold ${
                      payment.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : payment.status === "Verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {payment.status}
                  </div>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-500">GCash Number</p>
                    <p className="mt-2 font-bold">{payment.buyerGcash}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-500">Reference</p>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="font-bold">{payment.reference}</p>
                      <button
                        onClick={() => copyReference(payment.reference)}
                        className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-500">QR Used</p>
                    <p className="mt-2 font-bold">Option {payment.selectedQR}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-500">Amount</p>
                    <p className="mt-2 font-bold">₱{payment.total}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-500">Items</p>
                    <p className="mt-2 font-bold">{payment.items.length}</p>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  {payment.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex gap-4">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />
                        <div>
                          <p className="font-bold">{item.title}</p>
                          <p className="text-sm text-slate-500">
                            {item.grade} • {item.quarter}
                          </p>
                          <p className="text-sm text-slate-500">{item.fileName}</p>
                        </div>
                      </div>

                      <p className="text-lg font-black">₱{item.price}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => updateStatus(payment.id, "Pending")}
                    className="rounded-2xl bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-600"
                  >
                    Mark Pending
                  </button>

                  <button
                    onClick={() => updateStatus(payment.id, "Verified")}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                  >
                    Mark Verified
                  </button>

                  <button
                    onClick={() => updateStatus(payment.id, "Rejected")}
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
            ))}
          </div>
        )}
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-extrabold text-slate-900">Reset all test data?</h2>
            <p className="mt-2 text-slate-500">
              This will remove cart, likes, purchases, orders, and payment submissions.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                onClick={resetAllData}
                className="rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
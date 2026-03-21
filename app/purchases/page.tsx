"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type PurchaseRow = {
  id: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  products: {
    id: number
    title: string
    price: number
    quarter: string
    grade: string
    file_name: string
    file_url: string
    image_url: string
  } | null
}

export default function PurchasesPage() {
  const [buyerEmail, setBuyerEmail] = useState("")
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const isZipFile = (fileName: string) => fileName.toLowerCase().endsWith(".zip")

  const loadPurchases = async (email: string, silent = false) => {
    if (!email) {
      setPurchases([])
      setLoading(false)
      return
    }

    if (!silent) setLoading(true)

    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        status,
        created_at,
        products (
          id,
          title,
          price,
          quarter,
          grade,
          file_name,
          file_url,
          image_url
        )
      `)
      .eq("buyer_email", email)
      .order("created_at", { ascending: false })

    if (error) {
      console.log("Load purchases error:", error)
      if (!silent) setPurchases([])
      setLoading(false)
      return
    }

    setPurchases((data || []) as unknown as PurchaseRow[])
    setLoading(false)
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem("angel-glez-buyer-email") || ""
    setBuyerEmail(savedEmail)
    loadPurchases(savedEmail)
  }, [])

  useEffect(() => {
    if (!buyerEmail) return

    const channel = supabase
      .channel("buyer-purchases")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
        },
        () => {
          loadPurchases(buyerEmail, true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [buyerEmail])

  const openPurchasedFiles = (purchaseId: string) => {
    window.location.href = `/purchases/${purchaseId}`
  }

  const handleDownload = async (
    purchaseId: string,
    fileKey: string,
    fileName: string
  ) => {
    try {
      setDownloadingId(purchaseId)

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey,
          fileName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Download failed")
      }

      window.open(data.downloadUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Download failed")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 shadow-lg">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold">My Purchases</h1>
            <p className="mt-2 text-slate-500">
              {buyerEmail ? `Checking purchases for ${buyerEmail}` : "No buyer email found yet."}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => loadPurchases(buyerEmail)}
              className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700"
            >
              Refresh Status
            </button>

            <a href="/" className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">
              Back to Store
            </a>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="text-slate-500">No purchases found yet.</p>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const product = purchase.products
              if (!product) return null

              return (
                <div
                  key={purchase.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-20 w-20 rounded-xl object-cover"
                    />

                    <div>
                      <p className="text-xl font-bold">{product.title}</p>
                      <p className="text-sm text-slate-500">
                        {product.grade} • {product.quarter}
                      </p>
                      <p className="text-sm text-slate-500">{product.file_name}</p>
                      {isZipFile(product.file_name) && (
                        <p className="mt-1 text-xs font-semibold text-violet-600">
                          ZIP package • can be opened inside the website after approval
                        </p>
                      )}
                      <p className="font-bold text-violet-600">₱{product.price}</p>

                      <div className="mt-2">
                        {purchase.status === "pending" && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                            Pending approval
                          </span>
                        )}

                        {purchase.status === "approved" && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                            Approved
                          </span>
                        )}

                        {purchase.status === "rejected" && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {purchase.status === "approved" ? (
                    <div className="flex flex-wrap gap-2">
                      {isZipFile(product.file_name) && (
                        <button
                          onClick={() => openPurchasedFiles(purchase.id)}
                          className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white transition hover:bg-violet-700"
                        >
                          Open Files
                        </button>
                      )}

                      <button
                        onClick={() =>
                          handleDownload(purchase.id, product.file_url, product.file_name)
                        }
                        disabled={downloadingId === purchase.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-70"
                      >
                        {downloadingId === purchase.id
                          ? "Preparing..."
                          : isZipFile(product.file_name)
                            ? "Download ZIP"
                            : "Download"}
                      </button>
                    </div>
                  ) : purchase.status === "pending" ? (
                    <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                      Please wait for approval
                    </div>
                  ) : (
                    <div className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
                      Payment rejected
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type PurchaseDetails = {
  id: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  buyer_email: string
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

type ZipEntry = {
  path: string
  name: string
  extension: string
  type: "image" | "pdf" | "document" | "spreadsheet" | "presentation" | "text" | "other"
}

function typeLabel(type: ZipEntry["type"]) {
  switch (type) {
    case "image":
      return "Image"
    case "pdf":
      return "PDF"
    case "document":
      return "Document"
    case "spreadsheet":
      return "Spreadsheet"
    case "presentation":
      return "Presentation"
    case "text":
      return "Text"
    default:
      return "File"
  }
}

export default function PurchaseFilesPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>
}) {
  const [purchaseId, setPurchaseId] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null)
  const [entries, setEntries] = useState<ZipEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyPath, setBusyPath] = useState("")

  useEffect(() => {
    params.then((resolved) => setPurchaseId(resolved.purchaseId))
  }, [params])

  useEffect(() => {
    const email = localStorage.getItem("angel-glez-buyer-email") || ""
    setBuyerEmail(email)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!purchaseId || !buyerEmail) return

      setLoading(true)
      setError("")

      const { data, error } = await supabase
        .from("purchases")
        .select(`
          id,
          status,
          created_at,
          buyer_email,
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
        .eq("id", purchaseId)
        .eq("buyer_email", buyerEmail)
        .single()

      if (error || !data) {
        setError("Could not load this purchase.")
        setLoading(false)
        return
      }

      const typedPurchase = data as unknown as PurchaseDetails
setPurchase(typedPurchase)

const product = typedPurchase.products
const productFileName = product?.file_name || ""

if (!productFileName.toLowerCase().endsWith(".zip")) {
  setLoading(false)
  return
}

      try {
        const res = await fetch(
          `/api/purchase-files?purchaseId=${encodeURIComponent(purchaseId)}&buyerEmail=${encodeURIComponent(
            buyerEmail
          )}`
        )
        const json = await res.json()

        if (!res.ok) {
          throw new Error(json?.error || "Failed to read ZIP contents")
        }

        setEntries(json.entries || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read ZIP contents")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [purchaseId, buyerEmail])

  const groupedEntries = useMemo(() => {
    const groups: Record<string, ZipEntry[]> = {
      "Lesson Files": [],
      "Images": [],
      "Guides and Text": [],
      "Other Files": [],
    }

    for (const entry of entries) {
      if (["document", "presentation", "spreadsheet"].includes(entry.type)) {
        groups["Lesson Files"].push(entry)
      } else if (entry.type === "image") {
        groups["Images"].push(entry)
      } else if (["pdf", "text"].includes(entry.type)) {
        groups["Guides and Text"].push(entry)
      } else {
        groups["Other Files"].push(entry)
      }
    }

    return groups
  }, [entries])

  const openEntry = async (entryPath: string, download = false) => {
    if (!purchaseId || !buyerEmail) return

    setBusyPath(entryPath)

    try {
      const res = await fetch(
        `/api/purchase-file?purchaseId=${encodeURIComponent(purchaseId)}&buyerEmail=${encodeURIComponent(
          buyerEmail
        )}&entryPath=${encodeURIComponent(entryPath)}&download=${download ? "1" : "0"}`
      )

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "Could not open file")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      if (download) {
        const link = document.createElement("a")
        link.href = url
        link.download = entryPath.split("/").pop() || "file"
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      } else {
        window.open(url, "_blank", "noopener,noreferrer")
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open file")
    } finally {
      setBusyPath("")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-8 shadow-lg">
          <p className="text-slate-500">Loading your approved files...</p>
        </div>
      </main>
    )
  }

  if (!purchase || !purchase.products) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-8 shadow-lg">
          <p className="text-red-600">{error || "Purchase not found."}</p>
          <a
            href="/purchases"
            className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 font-bold text-white"
          >
            Back to Purchases
          </a>
        </div>
      </main>
    )
  }

  const product = purchase.products
  const isZip = product.file_name.toLowerCase().endsWith(".zip")

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] bg-white p-8 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <img
                src={product.image_url}
                alt={product.title}
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
                  Approved Purchase
                </p>
                <h1 className="mt-2 text-3xl font-extrabold">{product.title}</h1>
                <p className="mt-2 text-slate-500">
                  {product.grade} • {product.quarter} • ₱{product.price}
                </p>
                <p className="mt-2 text-sm text-slate-500">Package: {product.file_name}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/purchases"
                className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700"
              >
                Back to Purchases
              </a>
            </div>
          </div>
        </section>

        {!isZip ? (
          <section className="rounded-[28px] bg-white p-8 shadow-lg">
            <p className="text-lg font-bold text-slate-900">This product is not a ZIP package.</p>
            <p className="mt-2 text-slate-500">
              This viewer works best for ZIP products. Use the normal download button from your Purchases page for this file.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[28px] bg-white p-8 shadow-lg">
            <p className="text-red-600">{error}</p>
          </section>
        ) : (
          <section className="rounded-[28px] bg-white p-8 shadow-lg">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
                  Included Teaching Files
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Open files without extracting the ZIP
                </h2>
              </div>
              <div className="rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                {entries.length} file{entries.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedEntries).map(([label, group]) =>
                group.length === 0 ? null : (
                  <div key={label}>
                    <h3 className="mb-3 text-lg font-extrabold text-slate-900">{label}</h3>
                    <div className="space-y-3">
                      {group.map((entry) => (
                        <div
                          key={entry.path}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{entry.name}</p>
                            <p className="text-sm text-slate-500">
                              {typeLabel(entry.type)}
                              {entry.extension ? ` • ${entry.extension.toUpperCase()}` : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openEntry(entry.path, false)}
                              disabled={busyPath === entry.path}
                              className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white disabled:opacity-70"
                            >
                              {busyPath === entry.path ? "Opening..." : "Open"}
                            </button>
                            <button
                              onClick={() => openEntry(entry.path, true)}
                              disabled={busyPath === entry.path}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 disabled:opacity-70"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

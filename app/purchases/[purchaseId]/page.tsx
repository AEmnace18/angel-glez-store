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

type ZipEntryType =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "text"
  | "other"

type ZipEntry = {
  path: string
  name: string
  extension: string
  type: ZipEntryType
}

function getFileType(name: string): ZipEntryType {
  const lower = name.toLowerCase()

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lower)) return "image"
  if (/\.pdf$/i.test(lower)) return "pdf"
  if (/\.(doc|docx)$/i.test(lower)) return "document"
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return "spreadsheet"
  if (/\.(ppt|pptx)$/i.test(lower)) return "presentation"
  if (/\.(txt|md|json|html|htm)$/i.test(lower)) return "text"

  return "other"
}

function fileEmoji(type: ZipEntryType) {
  switch (type) {
    case "image":
      return "🖼️"
    case "pdf":
      return "📕"
    case "document":
      return "📘"
    case "spreadsheet":
      return "📗"
    case "presentation":
      return "📙"
    case "text":
      return "📄"
    default:
      return "📁"
  }
}

function fileTypeLabel(type: ZipEntryType) {
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
  const [selectedEntry, setSelectedEntry] = useState<ZipEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyPath, setBusyPath] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | "unsupported" | "none">("none")

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

        const fetchedEntries: ZipEntry[] = (json.entries || []).map((entry: any) => ({
          ...entry,
          type: entry.type || getFileType(entry.name || ""),
        }))

        setEntries(fetchedEntries)
        if (fetchedEntries.length > 0) {
          setSelectedEntry(fetchedEntries[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read ZIP contents")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [purchaseId, buyerEmail])

  useEffect(() => {
    let revokedUrl = ""

    const loadPreview = async () => {
      if (!selectedEntry || !purchaseId || !buyerEmail) {
        setPreviewKind("none")
        setPreviewUrl("")
        setPreviewError("")
        return
      }

      if (selectedEntry.type !== "image" && selectedEntry.type !== "pdf") {
        setPreviewKind("unsupported")
        setPreviewUrl("")
        setPreviewError("")
        return
      }

      setPreviewLoading(true)
      setPreviewError("")

      try {
        const res = await fetch(
          `/api/purchase-file?purchaseId=${encodeURIComponent(
            purchaseId
          )}&buyerEmail=${encodeURIComponent(buyerEmail)}&entryPath=${encodeURIComponent(
            selectedEntry.path
          )}&download=0`
        )

        if (!res.ok) {
          const json = await res.json().catch(() => null)
          throw new Error(json?.error || "Could not load preview")
        }

        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        revokedUrl = objectUrl
        setPreviewUrl(objectUrl)
        setPreviewKind(selectedEntry.type === "pdf" ? "pdf" : "image")
      } catch (err) {
        setPreviewUrl("")
        setPreviewError(err instanceof Error ? err.message : "Could not load preview")
      } finally {
        setPreviewLoading(false)
      }
    }

    loadPreview()

    return () => {
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl)
      }
    }
  }, [selectedEntry, purchaseId, buyerEmail])

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

  const groupedEntries = useMemo(() => {
    const buckets = {
      folders: [] as ZipEntry[],
      docs: [] as ZipEntry[],
      images: [] as ZipEntry[],
      others: [] as ZipEntry[],
    }

    for (const entry of entries) {
      if (["document", "spreadsheet", "presentation", "pdf", "text"].includes(entry.type)) {
        buckets.docs.push(entry)
      } else if (entry.type === "image") {
        buckets.images.push(entry)
      } else {
        buckets.others.push(entry)
      }
    }

    return buckets
  }, [entries])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#eef2f7] px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-slate-500">Loading your approved files...</p>
        </div>
      </main>
    )
  }

  if (!purchase || !purchase.products) {
    return (
      <main className="min-h-screen bg-[#eef2f7] px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-red-600">{error || "Purchase not found."}</p>
          <a
            href="/purchases"
            className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
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
    <main className="min-h-screen bg-[#eef2f7] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <img
                src={product.image_url}
                alt={product.title}
                className="h-20 w-20 rounded-2xl border border-slate-200 object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
                  Approved Purchase
                </p>
                <h1 className="mt-1 line-clamp-2 text-3xl font-black text-slate-950">{product.title}</h1>
                <p className="mt-2 text-base text-slate-500">
                  {product.grade} • {product.quarter} • ₱{product.price}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">Package: {product.file_name}</p>
              </div>
            </div>

            <a
              href="/purchases"
              className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Purchases
            </a>
          </div>
        </section>

        {!isZip ? (
          <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-base font-semibold text-slate-900">This product is not a ZIP package.</p>
            <p className="mt-2 text-sm text-slate-500">
              This viewer is built for ZIP products. Use your normal purchase download for this file.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm text-red-600">{error}</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">
                  File Explorer
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Browse purchased ZIP contents</h2>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                {entries.length} item{entries.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="grid min-h-[760px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="border-r border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-5 py-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Select a file to preview on the right. Images and PDFs preview inside the page. DOCX, PPTX, XLSX, and other files can still open in a new tab or download.
                  </div>
                </div>

                <div className="px-5 py-5">
                  {entries.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      No files found inside this ZIP.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                      {entries.map((entry) => {
                        const isActive = selectedEntry?.path === entry.path
                        const canThumb = entry.type === "image"
                        const thumbUrl = canThumb
                          ? `/api/purchase-file?purchaseId=${encodeURIComponent(
                              purchaseId
                            )}&buyerEmail=${encodeURIComponent(buyerEmail)}&entryPath=${encodeURIComponent(
                              entry.path
                            )}&download=0`
                          : ""

                        return (
                          <button
                            key={entry.path}
                            type="button"
                            onClick={() => setSelectedEntry(entry)}
                            className={`group overflow-hidden rounded-[24px] border text-left transition ${
                              isActive
                                ? "border-violet-500 bg-violet-50 shadow-[0_12px_30px_rgba(139,92,246,0.18)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="relative flex aspect-[1.05/1] items-center justify-center overflow-hidden bg-slate-100">
                              {canThumb ? (
                                <img
                                  src={thumbUrl}
                                  alt={entry.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                  <span className="text-4xl">{fileEmoji(entry.type)}</span>
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    {entry.extension || fileTypeLabel(entry.type)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1 p-3.5">
                              <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                                {entry.name}
                              </p>
                              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                                {fileTypeLabel(entry.type)}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-slate-50/70">
                <div className="border-b border-slate-200 px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Preview Panel
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {selectedEntry ? selectedEntry.name : "Select a file"}
                  </h3>
                  {selectedEntry ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {fileTypeLabel(selectedEntry.type)}
                      {selectedEntry.extension ? ` • ${selectedEntry.extension.toUpperCase()}` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex min-h-[420px] items-center justify-center bg-slate-100">
                      {!selectedEntry ? (
                        <div className="px-6 text-center text-sm text-slate-500">
                          Choose a file from the left to preview it here.
                        </div>
                      ) : previewLoading ? (
                        <div className="px-6 text-center text-sm text-slate-500">Loading preview...</div>
                      ) : previewError ? (
                        <div className="px-6 text-center text-sm text-red-600">{previewError}</div>
                      ) : previewKind === "image" && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={selectedEntry.name}
                          className="h-full max-h-[560px] w-full object-contain"
                        />
                      ) : previewKind === "pdf" && previewUrl ? (
                        <iframe
                          src={previewUrl}
                          title={selectedEntry.name}
                          className="h-[560px] w-full"
                        />
                      ) : previewKind === "unsupported" ? (
                        <div className="max-w-md px-6 text-center">
                          <div className="mb-3 text-5xl">{fileEmoji(selectedEntry.type)}</div>
                          <p className="text-base font-semibold text-slate-900">
                            Inline preview is not available for this file type yet.
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            You can still open it in a new tab or download it below. This keeps DOCX, PPTX, XLSX, and similar files working reliably.
                          </p>
                        </div>
                      ) : (
                        <div className="px-6 text-center text-sm text-slate-500">Preview unavailable.</div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry ? (
                          <>
                            <button
                              onClick={() => openEntry(selectedEntry.path, false)}
                              disabled={busyPath === selectedEntry.path}
                              className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-70"
                            >
                              {busyPath === selectedEntry.path ? "Opening..." : "Open file"}
                            </button>

                            <button
                              onClick={() => openEntry(selectedEntry.path, true)}
                              disabled={busyPath === selectedEntry.path}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                            >
                              Download
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {selectedEntry ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        File details
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Name:</span> {selectedEntry.name}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Type:</span> {fileTypeLabel(selectedEntry.type)}
                        </p>
                        <p className="break-all">
                          <span className="font-semibold text-slate-900">Path:</span> {selectedEntry.path}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { HomepageThemeStyles, StoreHeader } from "@/components/homepage-theme"

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

type ZipEntryResponse = Partial<ZipEntry> & {
  path?: string
  name?: string
  type?: ZipEntryType
}

type PreviewKind = "image" | "pdf" | "docx" | "text" | "unsupported" | "none"

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeEntryName(entryPath: string) {
  const parts = entryPath.split("/").filter(Boolean)
  return parts[parts.length - 1] || entryPath
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
  const [previewText, setPreviewText] = useState("")
  const [previewKind, setPreviewKind] = useState<PreviewKind>("none")
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | ZipEntryType>("all")

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

      let typedPurchase: PurchaseDetails

      try {
        const { purchase } = await apiJson<{ purchase: PurchaseDetails }>(
          `/api/purchases/${encodeURIComponent(purchaseId)}?buyerEmail=${encodeURIComponent(buyerEmail)}`
        )
        typedPurchase = purchase
      } catch {
        setError("Could not load this purchase.")
        setLoading(false)
        return
      }

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
        const json = (await res.json()) as { entries?: ZipEntryResponse[]; error?: string }

        if (!res.ok) {
          throw new Error(json?.error || "Failed to read ZIP contents")
        }

        const fetchedEntries: ZipEntry[] = (json.entries || []).map((entry) => ({
          path: entry.path || "",
          extension: entry.extension || "",
          name: entry.name || normalizeEntryName(entry.path || ""),
          type: entry.type || getFileType(entry.name || entry.path || ""),
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
        setPreviewText("")
        setPreviewError("")
        return
      }

      setPreviewLoading(true)
      setPreviewError("")
      setPreviewUrl("")
      setPreviewText("")

      try {
        const encodedPurchaseId = encodeURIComponent(purchaseId)
        const encodedBuyerEmail = encodeURIComponent(buyerEmail)
        const encodedEntryPath = encodeURIComponent(selectedEntry.path)

        if (selectedEntry.type === "image" || selectedEntry.type === "pdf") {
          const res = await fetch(
            `/api/purchase-file?purchaseId=${encodedPurchaseId}&buyerEmail=${encodedBuyerEmail}&entryPath=${encodedEntryPath}&download=0`
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
          return
        }

        if (selectedEntry.type === "document" && /\.docx$/i.test(selectedEntry.name)) {
          const iframeUrl = `/api/purchase-file?purchaseId=${encodedPurchaseId}&buyerEmail=${encodedBuyerEmail}&entryPath=${encodedEntryPath}&preview=docx`
          setPreviewUrl(iframeUrl)
          setPreviewKind("docx")
          return
        }

        if (selectedEntry.type === "text") {
          const res = await fetch(
            `/api/purchase-file?purchaseId=${encodedPurchaseId}&buyerEmail=${encodedBuyerEmail}&entryPath=${encodedEntryPath}&download=0`
          )

          if (!res.ok) {
            const json = await res.json().catch(() => null)
            throw new Error(json?.error || "Could not load text preview")
          }

          const text = await res.text()
          setPreviewText(text)
          setPreviewKind("text")
          return
        }

        setPreviewKind("unsupported")
      } catch (err) {
        setPreviewUrl("")
        setPreviewText("")
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

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()

    return entries.filter((entry) => {
      const matchesFilter = activeFilter === "all" ? true : entry.type === activeFilter
      const matchesSearch =
        !query ||
        entry.name.toLowerCase().includes(query) ||
        entry.path.toLowerCase().includes(query) ||
        entry.extension.toLowerCase().includes(query)

      return matchesFilter && matchesSearch
    })
  }, [entries, search, activeFilter])

  const stats = useMemo(() => {
    return {
      all: entries.length,
      image: entries.filter((entry) => entry.type === "image").length,
      pdf: entries.filter((entry) => entry.type === "pdf").length,
      document: entries.filter((entry) => entry.type === "document").length,
      spreadsheet: entries.filter((entry) => entry.type === "spreadsheet").length,
      presentation: entries.filter((entry) => entry.type === "presentation").length,
      text: entries.filter((entry) => entry.type === "text").length,
      other: entries.filter((entry) => entry.type === "other").length,
    }
  }, [entries])

  useEffect(() => {
    if (!selectedEntry) return
    const stillExists = filteredEntries.some((entry) => entry.path === selectedEntry.path)
    if (!stillExists) {
      setSelectedEntry(filteredEntries[0] || null)
    }
  }, [filteredEntries, selectedEntry])

  if (loading) {
    return (
      <main className="agt-page min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900">
        <HomepageThemeStyles />
        <StoreHeader cartCount={0} likedCount={0} />
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-[0_28px_100px_rgba(15,23,42,0.10)]">
          <p className="text-sm font-medium text-slate-500">Loading your approved files...</p>
        </div>
      </main>
    )
  }

  if (!purchase || !purchase.products) {
    return (
      <main className="agt-page min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900">
        <HomepageThemeStyles />
        <StoreHeader cartCount={0} likedCount={0} />
        <div className="mx-auto max-w-7xl rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-[0_28px_100px_rgba(15,23,42,0.10)]">
          <p className="text-sm text-red-600">{error || "Purchase not found."}</p>
          <a
            href="/purchases"
            className="mt-4 inline-flex rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to Purchases
          </a>
        </div>
      </main>
    )
  }

  const product = purchase.products
  const isZip = product.file_name.toLowerCase().endsWith(".zip")
  const selectedExtension = selectedEntry?.extension?.toUpperCase() || "FILE"

  return (
    <main className="agt-page min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.10),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_18%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-4 py-8 text-slate-900">
        <HomepageThemeStyles />
        <StoreHeader cartCount={0} likedCount={0} />
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_28px_100px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(139,92,246,0.10),rgba(255,255,255,0.92),rgba(59,130,246,0.08))] px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-[24px] bg-violet-500/15 blur-xl" />
                  <img
                    src={getProductImageSrc(product.image_url)}
                    alt={product.title}
                    className="relative h-24 w-24 rounded-[24px] border border-white/80 object-cover shadow-lg"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-600">
                    Approved Purchase
                  </p>
                  <h1 className="mt-2 line-clamp-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {product.title}
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 sm:text-base">
                    {product.grade} • {product.quarter} • {formatMoney(product.price)}
                  </p>
                  <p className="mt-2 truncate text-sm text-slate-500">Package: {product.file_name}</p>
                </div>
              </div>

              <a
                href="/purchases"
                className="inline-flex rounded-2xl border border-slate-300 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Back to Purchases
              </a>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/60 bg-white/70 px-6 py-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Package Type</p>
              <p className="mt-2 text-lg font-bold text-slate-900">ZIP Explorer</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total Files</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{entries.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview Ready</p>
              <p className="mt-2 text-lg font-bold text-slate-900">Images, PDF, DOCX, Text</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current Selection</p>
              <p className="mt-2 truncate text-lg font-bold text-slate-900">{selectedEntry?.name || "None"}</p>
            </div>
          </div>
        </section>

        {!isZip ? (
          <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_100px_rgba(15,23,42,0.10)]">
            <p className="text-base font-semibold text-slate-900">This product is not a ZIP package.</p>
            <p className="mt-2 text-sm text-slate-500">
              This viewer is built for ZIP products. Use your normal purchase download for this file.
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_28px_100px_rgba(15,23,42,0.10)]">
            <p className="text-sm text-red-600">{error}</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/95 shadow-[0_28px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-600">
                  File Explorer
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  Premium purchase browser
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
                  {filteredEntries.length} visible
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700">
                  DOCX inline preview enabled
                </span>
              </div>
            </div>

            <div className="grid min-h-[820px] grid-cols-1 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="border-r border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                      Browse the files on the left. Images, PDF, DOCX, and text files preview inside the page.
                    </div>

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search files..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 lg:max-w-xs"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["all", `All (${stats.all})`],
                      ["image", `Images (${stats.image})`],
                      ["pdf", `PDF (${stats.pdf})`],
                      ["document", `Docs (${stats.document})`],
                      ["spreadsheet", `Sheets (${stats.spreadsheet})`],
                      ["presentation", `Slides (${stats.presentation})`],
                      ["text", `Text (${stats.text})`],
                    ].map(([key, label]) => {
                      const active = activeFilter === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveFilter(key as "all" | ZipEntryType)}
                          className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                            active
                              ? "border border-violet-200 bg-violet-50 text-violet-700 shadow-sm"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="px-5 py-5">
                  {filteredEntries.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                      No files matched your current search or filter.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-4">
                      {filteredEntries.map((entry) => {
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
                            className={`group overflow-hidden rounded-[26px] border text-left transition duration-200 ${
                              isActive
                                ? "border-violet-500 bg-[linear-gradient(180deg,rgba(245,243,255,1),rgba(255,255,255,1))] shadow-[0_16px_40px_rgba(139,92,246,0.20)]"
                                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                            }`}
                          >
                            <div className="relative flex aspect-[1.08/1] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                              {canThumb ? (
                                <img src={thumbUrl} alt={entry.name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-3 px-3 text-center">
                                  <span className="text-4xl drop-shadow-sm">{fileEmoji(entry.type)}</span>
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    {entry.extension || fileTypeLabel(entry.type)}
                                  </span>
                                </div>
                              )}
                              <div className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                                {fileTypeLabel(entry.type)}
                              </div>
                            </div>

                            <div className="space-y-1.5 p-3.5">
                              <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                                {entry.name}
                              </p>
                              <p className="truncate text-[11px] text-slate-500">{entry.path}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-[linear-gradient(180deg,rgba(248,250,252,0.7),rgba(255,255,255,0.95))]">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Preview Panel
                      </p>
                      <h3 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">
                        {selectedEntry ? selectedEntry.name : "Select a file"}
                      </h3>
                      {selectedEntry ? (
                        <p className="mt-1 text-sm text-slate-500">
                          {fileTypeLabel(selectedEntry.type)} • {selectedExtension}
                        </p>
                      ) : null}
                    </div>

                    {selectedEntry ? (
                      <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {selectedExtension}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-6">
                  <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <div className="flex min-h-[540px] items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
                      {!selectedEntry ? (
                        <div className="px-6 text-center text-sm text-slate-500">
                          Choose a file from the left to preview it here.
                        </div>
                      ) : previewLoading ? (
                        <div className="px-6 text-center text-sm text-slate-500">Loading preview...</div>
                      ) : previewError ? (
                        <div className="px-6 text-center text-sm text-red-600">{previewError}</div>
                      ) : previewKind === "image" && previewUrl ? (
                        <img src={previewUrl} alt={selectedEntry.name} className="h-full max-h-[640px] w-full object-contain" />
                      ) : previewKind === "pdf" && previewUrl ? (
                        <iframe src={previewUrl} title={selectedEntry.name} className="h-[640px] w-full" />
                      ) : previewKind === "docx" && previewUrl ? (
                        <iframe src={previewUrl} title={selectedEntry.name} className="h-[640px] w-full bg-white" />
                      ) : previewKind === "text" ? (
                        <pre className="h-[640px] w-full overflow-auto whitespace-pre-wrap p-6 text-left text-sm leading-7 text-slate-700">
                          {previewText}
                        </pre>
                      ) : previewKind === "unsupported" ? (
                        <div className="max-w-md px-6 text-center">
                          <div className="mb-3 text-5xl">{fileEmoji(selectedEntry.type)}</div>
                          <p className="text-base font-semibold text-slate-900">
                            Inline preview is not available for this file type yet.
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            You can still open it in a new tab or download it below. PPTX and XLSX are next candidates for upgrade.
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
                    <div className="mt-4 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        File details
                      </p>
                      <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Name</p>
                          <p className="mt-1 break-words font-semibold text-slate-900">{selectedEntry.name}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Type</p>
                          <p className="mt-1 font-semibold text-slate-900">{fileTypeLabel(selectedEntry.type)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Path</p>
                          <p className="mt-1 break-all font-medium text-slate-900">{selectedEntry.path}</p>
                        </div>
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

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import JSZip from "jszip"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"

type Product = {
  id: string | number
  title: string
  description?: string | null
  price: number
  quarter: string
  grade: string
  thumbnail_url: string | null
  image_url?: string | null
  file_name: string | null
  file_url: string | null
  created_at?: string | null
}

type UploadKind = "thumbnail" | "file"

type UploadingState = {
  thumbnail?: boolean
  file?: boolean
}

type UploadProgressState = {
  thumbnail: number
  file: number
}

type UploadedAsset = {
  objectKey: string
  publicUrl: string
  fileName: string
  size: number
  contentType: string
}

type ZipEntryDraft = {
  entry_path: string
  entry_name: string
  entry_extension: string
  entry_type: string
  sort_order: number
}

const gradeOptions = ["Kinder", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"]
const quarterOptions = ["Q1", "Q2", "Q3", "Q4"]

const toastStyle = {
  borderRadius: "16px",
  background: "#0f172a",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
}

function inferZipEntryType(fileName: string) {
  const lower = fileName.toLowerCase()

  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(lower)) return "image"
  if (/\.pdf$/i.test(lower)) return "pdf"
  if (/\.(doc|docx)$/i.test(lower)) return "document"
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return "spreadsheet"
  if (/\.(ppt|pptx)$/i.test(lower)) return "presentation"
  if (/\.(txt|md)$/i.test(lower)) return "text"
  return "other"
}

async function buildZipManifest(file: File): Promise<ZipEntryDraft[]> {
  const zip = await JSZip.loadAsync(file)

  return Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry, index) => {
      const entryName = entry.name.split("/").pop() || entry.name
      const entryExtension = entryName.includes(".") ? entryName.split(".").pop() || "" : ""

      return {
        entry_path: entry.name,
        entry_name: entryName,
        entry_extension: entryExtension,
        entry_type: inferZipEntryType(entryName),
        sort_order: index,
      }
    })
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return fallback
}

function getProductImage(product: Product) {
  return product.thumbnail_url || product.image_url || ""
}

function AdminAnimationStyles() {
  return (
    <style>{`
      @keyframes adminFadeUp {
        from {
          opacity: 0;
          transform: translateY(18px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes adminPop {
        0% {
          opacity: 0;
          transform: scale(0.96);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes adminPulseRing {
        0% {
          box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.42);
        }
        70% {
          box-shadow: 0 0 0 12px rgba(139, 92, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
        }
      }

      @keyframes adminShimmer {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(120%);
        }
      }

      @keyframes adminFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-10px);
        }
      }

      @keyframes adminSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes adminModalBackdrop {
        from {
          opacity: 0;
          backdrop-filter: blur(0);
        }
        to {
          opacity: 1;
          backdrop-filter: blur(14px);
        }
      }

      @keyframes adminModalPop {
        0% {
          opacity: 0;
          transform: translateY(18px) scale(0.94);
        }
        70% {
          opacity: 1;
          transform: translateY(-2px) scale(1.01);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .admin-fade-up {
        animation: adminFadeUp 420ms ease-out both;
      }

      .admin-pop {
        animation: adminPop 240ms ease-out both;
      }

      .admin-pulse-ring {
        animation: adminPulseRing 720ms ease-out;
      }

      .admin-float {
        animation: adminFloat 5s ease-in-out infinite;
      }

      .admin-spin {
        animation: adminSpin 800ms linear infinite;
      }

      .admin-modal-backdrop {
        animation: adminModalBackdrop 220ms ease-out both;
      }

      .admin-modal-pop {
        animation: adminModalPop 260ms cubic-bezier(.16,1,.3,1) both;
      }

      .admin-press {
        transition:
          transform 180ms ease,
          box-shadow 220ms ease,
          border-color 220ms ease,
          background-color 220ms ease,
          color 220ms ease,
          opacity 220ms ease;
      }

      .admin-press:hover {
        transform: translateY(-2px);
      }

      .admin-press:active {
        transform: translateY(0) scale(0.97);
      }

      .admin-card {
        transition:
          transform 260ms ease,
          box-shadow 260ms ease,
          border-color 260ms ease,
          background-color 260ms ease;
      }

      .admin-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 30px 90px rgba(15, 23, 42, 0.12);
      }

      .admin-shimmer {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .admin-shimmer::before {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-120%);
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent);
        animation: adminShimmer 1.85s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .admin-fade-up,
        .admin-pop,
        .admin-pulse-ring,
        .admin-float,
        .admin-spin,
        .admin-modal-backdrop,
        .admin-modal-pop,
        .admin-shimmer::before {
          animation: none !important;
        }

        .admin-press,
        .admin-card {
          transition: none !important;
        }

        .admin-press:hover,
        .admin-press:active,
        .admin-card:hover {
          transform: none !important;
        }
      }


      /* Compact skeuomorphic admin surfaces */
      .admin-homepage-surface {
        background:
          linear-gradient(90deg, rgba(83, 48, 17, 0.035) 1px, transparent 1px),
          linear-gradient(180deg, rgba(255,255,255,0.74), rgba(250,244,233,0.72)),
          radial-gradient(circle at 10% 6%, rgba(124,58,237,0.10), transparent 28%),
          radial-gradient(circle at 88% 12%, rgba(251,191,36,0.16), transparent 32%),
          linear-gradient(180deg, #fbf7ee 0%, #f2eadc 48%, #fbf8f0 100%);
        background-size: 28px 28px, auto, auto, auto, auto;
      }

      .admin-hero-panel,
      .admin-card,
      .admin-preview-panel {
        border-color: rgba(199, 177, 150, 0.62) !important;
        background:
          radial-gradient(circle at 10% 0%, rgba(255,255,255,0.92), transparent 30%),
          linear-gradient(180deg, rgba(255,253,248,0.96), rgba(246,238,224,0.92)) !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.98),
          inset 0 -10px 22px rgba(130,96,50,0.06),
          0 20px 48px rgba(82,62,38,0.12) !important;
        backdrop-filter: blur(14px);
      }

      .admin-hero-panel::before {
        content: "";
        position: absolute;
        inset: 7px 10px auto 10px;
        height: 44%;
        border-radius: 28px 28px 18px 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.62), rgba(255,255,255,0));
        pointer-events: none;
      }

      .admin-card:hover {
        transform: translateY(-2px);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.98),
          inset 0 -10px 22px rgba(130,96,50,0.06),
          0 24px 56px rgba(82,62,38,0.15) !important;
      }

      .admin-preview-panel {
        position: sticky;
        top: 112px;
        align-self: start;
        color: #0f172a !important;
      }

      .admin-preview-panel h2,
      .admin-preview-panel h3,
      .admin-preview-panel p,
      .admin-preview-panel span {
        text-shadow: none !important;
      }

      .admin-preview-panel > div > .absolute {
        opacity: 0.72;
      }

      .admin-preview-panel .rounded-\[30px\],
      .admin-preview-panel .rounded-\[28px\],
      .admin-preview-panel .rounded-\[24px\] {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.90),
          0 8px 18px rgba(88,64,38,0.08);
      }

      .admin-homepage-surface input,
      .admin-homepage-surface textarea,
      .admin-homepage-surface select {
        border-color: rgba(199,177,150,0.55) !important;
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,247,241,0.96)) !important;
        box-shadow:
          inset 0 2px 4px rgba(88,64,38,0.06),
          inset 0 1px 0 rgba(255,255,255,0.90),
          0 6px 14px rgba(88,64,38,0.06) !important;
      }

      .admin-homepage-surface input:focus,
      .admin-homepage-surface textarea:focus,
      .admin-homepage-surface select:focus {
        border-color: rgba(124,58,237,0.48) !important;
        box-shadow:
          inset 0 2px 4px rgba(88,64,38,0.05),
          0 0 0 4px rgba(124,58,237,0.12),
          0 10px 22px rgba(124,58,237,0.08) !important;
      }

      .admin-homepage-surface label,
      .admin-homepage-surface .tracking-\[0\.18em\],
      .admin-homepage-surface .tracking-\[0\.22em\] {
        color: rgb(100 116 139);
      }

      .admin-homepage-surface button,
      .admin-homepage-surface a {
        -webkit-tap-highlight-color: transparent;
      }

      .admin-homepage-surface .border-dashed {
        background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,247,232,0.64)) !important;
        border-color: rgba(199,177,150,0.48) !important;
      }

      .admin-homepage-surface .bg-slate-50,
      .admin-homepage-surface .bg-white\/90,
      .admin-homepage-surface .bg-white\/92 {
        background-color: rgba(255,255,255,0.74) !important;
      }


      .dark-live-preview {
        background:
          radial-gradient(circle at 16% 0%, rgba(255,255,255,0.13), transparent 27%),
          radial-gradient(circle at 86% 16%, rgba(168,85,247,0.22), transparent 34%),
          linear-gradient(180deg, #1d2554 0%, #121936 52%, #0b1024 100%) !important;
      }

      .dark-live-preview::before {
        content: "";
        position: absolute;
        inset: 8px;
        border-radius: 28px;
        border: 1px solid rgba(255,255,255,0.12);
        pointer-events: none;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.20),
          inset 0 -18px 28px rgba(0,0,0,0.20);
      }

      .dark-live-preview::after {
        content: "";
        position: absolute;
        left: 20px;
        right: 20px;
        top: 12px;
        height: 38%;
        border-radius: 28px 28px 18px 18px;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02));
      }

      .dark-live-preview > .relative {
        position: relative;
        z-index: 1;
      }

      .dark-live-preview .bg-amber-100 {
        background: rgba(253,230,138,0.18) !important;
        color: rgb(254 240 138) !important;
        border: 1px solid rgba(253,224,71,0.20);
      }

      .dark-live-preview .bg-emerald-100 {
        background: rgba(110,231,183,0.16) !important;
        color: rgb(167 243 208) !important;
        border: 1px solid rgba(110,231,183,0.22);
      }

      .dark-live-preview .text-amber-700 {
        color: rgb(254 240 138) !important;
      }

      .dark-live-preview .text-emerald-700 {
        color: rgb(167 243 208) !important;
      }

      .dark-live-preview img {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.14),
          0 10px 24px rgba(0,0,0,0.25);
      }




      /* Skeuomorphic compact upgrade: raised panels, recessed fields, shorter vertical rhythm */
      .skeuo-compact {
        background:
          linear-gradient(90deg, rgba(120, 87, 50, 0.045) 1px, transparent 1px),
          linear-gradient(180deg, rgba(255,255,255,0.74), rgba(244,234,216,0.84)),
          radial-gradient(circle at 9% 4%, rgba(124,58,237,0.12), transparent 24%),
          radial-gradient(circle at 92% 10%, rgba(251,191,36,0.17), transparent 28%),
          #f5ead7;
        background-size: 24px 24px, auto, auto, auto, auto;
      }

      .skeuo-compact .admin-hero-panel,
      .skeuo-compact .admin-card:not(.dark-live-preview) {
        border: 1px solid rgba(174, 137, 89, 0.52) !important;
        background:
          linear-gradient(145deg, rgba(255,253,247,0.98), rgba(240,226,201,0.92)) !important;
        box-shadow:
          inset 2px 2px 2px rgba(255,255,255,0.95),
          inset -8px -10px 22px rgba(112,74,36,0.12),
          inset 0 -1px 0 rgba(107,76,38,0.14),
          0 2px 0 rgba(255,255,255,0.80),
          0 18px 36px rgba(67,47,25,0.14) !important;
      }

      .skeuo-compact .admin-hero-panel {
        border-radius: 30px !important;
      }

      .skeuo-compact .admin-hero-panel::before {
        inset: 6px 9px auto 9px;
        height: 48%;
        border-radius: 25px 25px 16px 16px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.08));
      }

      .skeuo-compact .admin-card:not(.dark-live-preview):hover {
        transform: translateY(-2px);
        box-shadow:
          inset 2px 2px 2px rgba(255,255,255,0.95),
          inset -8px -10px 22px rgba(112,74,36,0.13),
          inset 0 -1px 0 rgba(107,76,38,0.14),
          0 2px 0 rgba(255,255,255,0.82),
          0 20px 42px rgba(67,47,25,0.17) !important;
      }

      .skeuo-compact .admin-press {
        border-color: rgba(178, 139, 88, 0.45) !important;
        box-shadow:
          inset 1px 1px 0 rgba(255,255,255,0.90),
          inset -3px -4px 8px rgba(104,72,37,0.10),
          0 8px 16px rgba(70,49,25,0.12),
          0 1px 0 rgba(255,255,255,0.80) !important;
      }

      .skeuo-compact .admin-press:hover {
        transform: translateY(-1px);
        filter: saturate(1.04);
      }

      .skeuo-compact .admin-press:active {
        transform: translateY(1px) scale(0.985);
        box-shadow:
          inset 3px 3px 9px rgba(80,56,28,0.18),
          inset -1px -1px 0 rgba(255,255,255,0.72),
          0 2px 6px rgba(70,49,25,0.08) !important;
      }

      .skeuo-compact input,
      .skeuo-compact textarea,
      .skeuo-compact select {
        min-height: 44px;
        padding: 0.74rem 1rem !important;
        border-radius: 20px !important;
        border-color: rgba(171,132,82,0.50) !important;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,239,225,0.96)) !important;
        box-shadow:
          inset 3px 3px 8px rgba(85,60,30,0.11),
          inset -2px -2px 4px rgba(255,255,255,0.96),
          0 1px 0 rgba(255,255,255,0.90) !important;
      }

      .skeuo-compact textarea {
        min-height: 92px;
      }

      .skeuo-compact input:focus,
      .skeuo-compact textarea:focus,
      .skeuo-compact select:focus {
        box-shadow:
          inset 2px 2px 6px rgba(85,60,30,0.10),
          inset -2px -2px 4px rgba(255,255,255,0.96),
          0 0 0 4px rgba(124,58,237,0.13),
          0 10px 20px rgba(124,58,237,0.08) !important;
      }

      .skeuo-compact .border-dashed {
        border-style: solid !important;
        background:
          linear-gradient(145deg, rgba(255,252,246,0.92), rgba(242,229,207,0.80)) !important;
        box-shadow:
          inset 2px 2px 5px rgba(255,255,255,0.85),
          inset -4px -5px 12px rgba(100,70,35,0.08),
          0 10px 22px rgba(76,53,26,0.08) !important;
      }

      .skeuo-compact .dark-live-preview {
        border-color: rgba(171, 161, 224, 0.35) !important;
        background:
          radial-gradient(circle at 13% 0%, rgba(255,255,255,0.17), transparent 25%),
          radial-gradient(circle at 88% 12%, rgba(168,85,247,0.26), transparent 30%),
          linear-gradient(145deg, #303969 0%, #171f49 48%, #090d24 100%) !important;
        box-shadow:
          inset 2px 2px 2px rgba(255,255,255,0.18),
          inset -10px -14px 32px rgba(0,0,0,0.34),
          inset 0 -1px 0 rgba(0,0,0,0.44),
          0 2px 0 rgba(255,255,255,0.10),
          0 22px 46px rgba(20,21,43,0.30) !important;
      }

      .skeuo-compact .dark-live-preview .bg-white\/9,
      .skeuo-compact .dark-live-preview .bg-white\/8,
      .skeuo-compact .dark-live-preview .bg-white\/10 {
        background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06)) !important;
        box-shadow:
          inset 1px 1px 0 rgba(255,255,255,0.16),
          inset -4px -6px 12px rgba(0,0,0,0.16),
          0 8px 18px rgba(0,0,0,0.13) !important;
      }

      .skeuo-compact h1,
      .skeuo-compact h2,
      .skeuo-compact h3 {
        text-shadow: 0 1px 0 rgba(255,255,255,0.72);
      }

      .skeuo-compact .dark-live-preview h2,
      .skeuo-compact .dark-live-preview h3 {
        text-shadow: 0 2px 12px rgba(0,0,0,0.32) !important;
      }

      .skeuo-compact .admin-preview-panel {
        top: 82px;
      }

      @media (max-width: 1279px) {
        .admin-preview-panel {
          position: relative;
          top: auto;
        }
      }
    `}</style>
  )
}

function ProgressBar({ value, tone = "violet" }: { value: number; tone?: "violet" | "emerald" }) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          tone === "emerald"
            ? "bg-gradient-to-r from-emerald-500 to-teal-400"
            : "bg-gradient-to-r from-violet-600 to-fuchsia-500"
        }`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: number | string
  helper: string
  tone: "violet" | "emerald" | "amber" | "slate"
}) {
  const toneClass = {
    violet: "from-violet-500/16 to-fuchsia-500/8 text-violet-700",
    emerald: "from-emerald-500/16 to-teal-500/8 text-emerald-700",
    amber: "from-amber-500/18 to-orange-500/8 text-amber-700",
    slate: "from-slate-900/8 to-slate-900/3 text-slate-700",
  }[tone]

  return (
    <div className={`admin-card rounded-[24px] border border-white/70 bg-gradient-to-br ${toneClass} bg-white/90 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur`}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
    </div>
  )
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<UploadingState>({})
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>({ thumbnail: 0, file: 0 })
  const [isAuthed, setIsAuthed] = useState(false)
  const [lastIssue, setLastIssue] = useState("")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [grade, setGrade] = useState("Grade 1")
  const [quarter, setQuarter] = useState("Q1")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [thumbnailPreview, setThumbnailPreview] = useState("")
  const [thumbnailFileName, setThumbnailFileName] = useState("")
  const [thumbnailSize, setThumbnailSize] = useState(0)
  const [fileName, setFileName] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [fileSize, setFileSize] = useState(0)
  const [uploadedProductFile, setUploadedProductFile] = useState<File | null>(null)
  const [cachingZipEntries, setCachingZipEntries] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [editingProductId, setEditingProductId] = useState<string | number | null>(null)
  const [search, setSearch] = useState("")
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<string | number | null>(null)

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { authenticated } = await apiJson<{ authenticated: boolean }>("/api/admin/session")

        if (!authenticated) {
          window.location.href = "/admin-login"
          return
        }

        setIsAuthed(true)
        await loadProducts()
      } catch {
        window.location.href = "/admin-login"
      } finally {
        setLoading(false)
      }
    }

    checkAdminSession()
  }, [])

  useEffect(() => {
    if (!productToDelete) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingProductId) {
        setProductToDelete(null)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [productToDelete, deletingProductId])

  async function loadProducts() {
    setLoading(true)

    try {
      const { products: loadedProducts } = await apiJson<{ products: Product[] }>("/api/admin/products")
      setProducts(loadedProducts || [])
      setLastIssue("")
    } catch (error) {
      const message = friendlyError(error, "Failed to load products.")
      setLastIssue(message)
      toast.error(message, { style: toastStyle })
    } finally {
      setLoading(false)
    }
  }

  async function uploadThroughServerWithProgress(file: File, folder: "thumbnails" | "products", type: UploadKind) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", folder)

    return await new Promise<UploadedAsset>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/admin/r2-upload")

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const percent = Math.min(90, Math.round((event.loaded / event.total) * 90))
        setUploadProgress((prev) => ({ ...prev, [type]: percent }))
      }

      xhr.onload = () => {
        let data: Partial<UploadedAsset> & { error?: string } = {}

        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : {}
        } catch {
          data = {}
        }

        if (xhr.status >= 200 && xhr.status < 300 && data.objectKey) {
          setUploadProgress((prev) => ({ ...prev, [type]: 100 }))
          resolve({
            objectKey: String(data.objectKey),
            publicUrl: String(data.publicUrl || ""),
            fileName: String(data.fileName || file.name),
            size: Number(data.size || file.size),
            contentType: String(data.contentType || file.type || "application/octet-stream"),
          })
          return
        }

        reject(new Error(data.error || `Upload failed with status ${xhr.status}`))
      }

      xhr.onerror = () => {
        reject(new Error("Upload failed. Local route unavailable."))
      }

      xhr.send(formData)
    })
  }

  async function handleAssetUpload(file: File, type: UploadKind) {
    setLastIssue("")
    setUploading((prev) => ({ ...prev, [type]: true }))
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }))
    setUploadMessage(
      type === "thumbnail"
        ? "Uploading thumbnail..."
        : "Uploading file..."
    )

    if (type === "thumbnail") {
      const localPreview = URL.createObjectURL(file)
      setThumbnailPreview(localPreview)
      setThumbnailFileName(file.name)
      setThumbnailSize(file.size)
    }

    if (type === "file") {
      setFileName(file.name)
      setFileSize(file.size)
    }

    try {
      const uploaded = await uploadThroughServerWithProgress(
        file,
        type === "thumbnail" ? "thumbnails" : "products",
        type
      )

      if (type === "thumbnail") {
        setThumbnailUrl(uploaded.publicUrl || uploaded.objectKey)
        setThumbnailFileName(uploaded.fileName)
        setThumbnailSize(uploaded.size)
        toast.success("Thumbnail uploaded.", { style: toastStyle })
      } else {
        setFileUrl(uploaded.objectKey)
        setFileName(uploaded.fileName)
        setFileSize(uploaded.size)
        setUploadedProductFile(file)
        toast.success("Product file uploaded.", { style: toastStyle })
      }
    } catch (error) {
      const message = friendlyError(
        error,
        type === "thumbnail" ? "Thumbnail upload failed." : "Product file upload failed."
      )
      setLastIssue(message)
      toast.error(message, { style: toastStyle })

      if (type === "thumbnail") {
        setThumbnailPreview("")
        setThumbnailUrl("")
        setThumbnailFileName("")
        setThumbnailSize(0)
      } else {
        setFileName("")
        setFileUrl("")
        setFileSize(0)
        setUploadedProductFile(null)
      }
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
      setTimeout(() => {
        setUploadProgress((prev) => ({ ...prev, [type]: 0 }))
        setUploadMessage("")
      }, 900)
    }
  }

  function startEditing(product: Product) {
    setEditingProductId(product.id)
    setTitle(product.title || "")
    setDescription(product.description || "")
    setPrice(String(product.price || ""))
    setGrade(product.grade || "Grade 1")
    setQuarter(product.quarter || "Q1")
    setThumbnailUrl(product.thumbnail_url || product.image_url || "")
    setThumbnailPreview(product.thumbnail_url || product.image_url || "")
    setThumbnailFileName(product.thumbnail_url ? "Existing thumbnail" : "")
    setThumbnailSize(0)
    setFileName(product.file_name || "")
    setFileUrl(product.file_url || "")
    setFileSize(0)
    setUploadedProductFile(null)
    setLastIssue("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function resetForm() {
    setEditingProductId(null)
    setTitle("")
    setDescription("")
    setPrice("")
    setGrade("Grade 1")
    setQuarter("Q1")
    setThumbnailUrl("")
    setThumbnailPreview("")
    setThumbnailFileName("")
    setThumbnailSize(0)
    setFileName("")
    setFileUrl("")
    setFileSize(0)
    setUploadedProductFile(null)
    setLastIssue("")
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSaveProduct() {
    if (!title.trim() || !description.trim() || !price.trim() || !grade || !quarter || !fileUrl || !fileName) {
      toast.error("Complete all required fields.", {
        style: toastStyle,
      })
      return
    }

    const parsedPrice = Number(price)

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a valid price.", { style: toastStyle })
      return
    }

    const isZipPackage = fileName.toLowerCase().endsWith(".zip")

    setSaving(true)
    setLastIssue("")

    try {
      let zipEntries: ZipEntryDraft[] | undefined

      if (isZipPackage && uploadedProductFile) {
        try {
          setCachingZipEntries(true)
          zipEntries = await buildZipManifest(uploadedProductFile)
        } catch {
          zipEntries = undefined
          toast.error("ZIP contents could not be cached. Product will still be saved.", {
            style: toastStyle,
          })
        } finally {
          setCachingZipEntries(false)
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        grade,
        quarter,
        thumbnail_url: thumbnailUrl || null,
        file_name: fileName,
        file_url: fileUrl,
        zip_entries: zipEntries,
      }

      if (editingProductId) {
        await apiJson<{ product: Product }>(`/api/admin/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
        toast.success("Product updated.", { style: toastStyle })
      } else {
        await apiJson<{ product: Product }>("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        })
        toast.success("Product added.", {
          style: toastStyle,
        })
      }

      resetForm()
      await loadProducts()
    } catch (error) {
      const message = friendlyError(error, "Failed to save product.")
      setLastIssue(message)
      toast.error(message, { style: toastStyle })
    } finally {
      setCachingZipEntries(false)
      setSaving(false)
    }
  }

  function openDeleteModal(product: Product) {
    setProductToDelete(product)
  }

  function closeDeleteModal() {
    if (deletingProductId) return
    setProductToDelete(null)
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return

    const id = productToDelete.id
    setDeletingProductId(id)

    try {
      await apiJson<{ deleted: boolean }>(`/api/admin/products/${id}`, {
        method: "DELETE",
      })
      toast.success("Product deleted.", { style: toastStyle })
      setProductToDelete(null)
      await loadProducts()
    } catch (error) {
      const message = friendlyError(error, "Failed to delete product.")
      setLastIssue(message)
      toast.error(message, { style: toastStyle })
    } finally {
      setDeletingProductId(null)
    }
  }

  const stats = useMemo(() => {
    const withFiles = products.filter((p) => p.file_url).length
    const withThumbnails = products.filter((p) => getProductImage(p)).length

    return {
      total: products.length,
      withFiles,
      withThumbnails,
      q4: products.filter((p) => p.quarter === "Q4").length,
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return products

    return products.filter((product) => {
      return (
        product.title?.toLowerCase().includes(keyword) ||
        product.description?.toLowerCase().includes(keyword) ||
        product.grade?.toLowerCase().includes(keyword) ||
        product.quarter?.toLowerCase().includes(keyword) ||
        product.file_name?.toLowerCase().includes(keyword)
      )
    })
  }, [products, search])

  const formChecklist = [
    { label: "Title", done: title.trim().length > 0 },
    { label: "Description", done: description.trim().length > 0 },
    { label: "Price", done: Number(price) > 0 },
    { label: "Grade", done: grade.trim().length > 0 },
    { label: "Quarter", done: quarter.trim().length > 0 },
    { label: "Thumbnail", done: !!thumbnailUrl },
    { label: "Product File", done: !!fileUrl && !!fileName },
  ]

  const completedChecklist = formChecklist.filter((item) => item.done).length
  const requiredReady =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    Number(price) > 0 &&
    grade.trim().length > 0 &&
    quarter.trim().length > 0 &&
    !!fileUrl &&
    !!fileName

  const busy = saving || cachingZipEntries || uploading.file || uploading.thumbnail
  const currentStatus = uploading.file || uploading.thumbnail
    ? "Uploading"
    : saving
      ? "Saving"
      : requiredReady
        ? "Ready"
        : "Draft"

  if (!isAuthed && !loading) return null

  return (
    <>
      <AdminAnimationStyles />

      <main className="admin-homepage-surface skeuo-compact min-h-screen overflow-hidden px-3 py-4 text-slate-900 md:px-6">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="admin-float absolute left-[6%] top-20 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="admin-float absolute right-[10%] top-56 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl [animation-delay:1.2s]" />
          <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-[1440px] space-y-5">
          <section className="admin-fade-up admin-hero-panel overflow-hidden rounded-[30px] border px-5 py-5 text-slate-950 md:px-7">
            <div className="relative">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute -bottom-28 left-12 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />

              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-violet-700 shadow-sm backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" />
                    Admin
                  </div>

                  <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl lg:text-5xl">
                    Product Manager
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                    Manage products, files, and previews.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={loadProducts}
                    className="admin-press rounded-2xl border border-amber-200 bg-white/80 px-4 py-2.5 text-sm font-black text-slate-800 shadow-sm backdrop-blur hover:bg-white"
                  >
                    Refresh
                  </button>

                  <a
                    href="/admin/payments"
                    className="admin-press rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-white/10 hover:bg-slate-100"
                  >
                    Payments
                  </a>

                  <a
                    href="/"
                    className="admin-press rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 shadow-sm backdrop-blur hover:bg-violet-100"
                  >
                    Storefront
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Products" value={stats.total} helper="Total" tone="slate" />
            <StatCard label="Files linked" value={stats.withFiles} helper="Linked files" tone="violet" />
            <StatCard label="Thumbnails" value={stats.withThumbnails} helper="With images" tone="emerald" />
            <StatCard label="Quarter 4" value={stats.q4} helper="Q4 items" tone="amber" />
          </section>

          {lastIssue && (
            <section className="admin-fade-up rounded-[28px] border border-rose-200 bg-rose-50/90 p-5 text-rose-800 shadow-[0_18px_55px_rgba(244,63,94,0.08)] backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-600">Issue</p>
                  <p className="mt-1 text-sm font-semibold">{lastIssue}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLastIssue("")}
                  className="admin-press rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-700 hover:bg-rose-100"
                >
                  Dismiss
                </button>
              </div>
            </section>
          )}

          <section className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="admin-card rounded-[30px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur md:p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-600">
                    {editingProductId ? "Edit mode" : "Create product"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    {editingProductId ? "Edit product" : "New product"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Add details, image, and file.
                  </p>
                </div>

                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="admin-press rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Product title"
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    rows={3}
                    className="resize-none rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold leading-6 outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Price</label>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="200"
                      type="number"
                      min="0"
                      className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Grade</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >
                      {gradeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Quarter</label>
                    <select
                      value={quarter}
                      onChange={(e) => setQuarter(e.target.value)}
                      className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    >
                      {quarterOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                  <div className={`relative overflow-hidden rounded-[30px] border-2 border-dashed p-4 transition-all duration-300 ${
                    thumbnailUrl
                      ? "border-emerald-200 bg-emerald-50/70"
                      : "border-slate-200 bg-slate-50/80 hover:border-violet-300 hover:bg-violet-50/60"
                  }`}>
                    {uploading.thumbnail && <span className="admin-shimmer opacity-80" />}

                    <div className="relative">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Thumbnail</p>
                        {thumbnailUrl && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-700">
                            Uploaded
                          </span>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                        {thumbnailPreview || thumbnailUrl ? (
                          <img
                            src={getProductImageSrc(thumbnailPreview || thumbnailUrl)}
                            alt="Thumbnail preview"
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
                            <span className="text-3xl">🖼️</span>
                            No image
                          </div>
                        )}
                      </div>

                      <label className="admin-press mt-3 block cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-black text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700">
                        Upload image
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleAssetUpload(file, "thumbnail")
                          }}
                          className="hidden"
                        />
                      </label>

                      <div className="mt-3 space-y-2">
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {thumbnailFileName || "JPG, PNG, WEBP"}
                        </p>
                        {thumbnailSize > 0 && (
                          <p className="text-xs font-bold text-slate-400">{formatFileSize(thumbnailSize)}</p>
                        )}

                        {uploading.thumbnail && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-slate-600">
                              <span>Uploading thumbnail</span>
                              <span>{uploadProgress.thumbnail}%</span>
                            </div>
                            <ProgressBar value={uploadProgress.thumbnail} tone="emerald" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`relative overflow-hidden rounded-[30px] border-2 border-dashed p-4 transition-all duration-300 ${
                    fileUrl
                      ? "border-violet-200 bg-violet-50/70"
                      : "border-slate-200 bg-slate-50/80 hover:border-violet-300 hover:bg-violet-50/60"
                  }`}>
                    {uploading.file && <span className="admin-shimmer opacity-80" />}

                    <div className="relative">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Product file</p>
                        {fileUrl && (
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black text-violet-700">
                            Uploaded
                          </span>
                        )}
                      </div>

                      <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-xl text-white shadow-lg">
                              📦
                            </div>

                            <p className="mt-4 line-clamp-2 text-lg font-black text-slate-950">
                              {fileName || "No file selected"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              ZIP, PPTX, DOCX, XLSX, PDF, or other resource.
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-left sm:text-right">
                            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Size</p>
                            <p className="mt-1 text-sm font-black text-slate-800">
                              {fileSize > 0 ? formatFileSize(fileSize) : "Waiting"}
                            </p>
                          </div>
                        </div>

                        {uploading.file && (
                          <div className="mt-5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-slate-600">
                              <span>Uploading product file</span>
                              <span>{uploadProgress.file}%</span>
                            </div>
                            <ProgressBar value={uploadProgress.file} />
                          </div>
                        )}

                        {!uploading.file && fileUrl && (
                          <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
                            Linked.
                          </div>
                        )}
                      </div>

                      <label className="admin-press mt-3 block cursor-pointer rounded-2xl bg-slate-950 px-4 py-2.5 text-center text-sm font-black text-white shadow-lg shadow-slate-200 hover:bg-slate-800">
                        Upload file
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleAssetUpload(file, "file")
                          }}
                          className="hidden"
                        />
                      </label>

                      {(uploading.thumbnail || uploading.file || uploadMessage) && (
                        <div className="mt-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">
                          {uploadMessage || "Uploading..."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={busy || !requiredReady}
                  className={`admin-press relative min-h-[50px] overflow-hidden rounded-[24px] px-5 py-3 text-base font-black text-white shadow-xl ${
                    requiredReady
                      ? "admin-pulse-ring bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 shadow-violet-200 hover:shadow-violet-300"
                      : "bg-slate-300 text-slate-500 shadow-none"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {requiredReady && <span className="admin-shimmer opacity-70" />}
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {busy && <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white admin-spin" />}
                    {saving || cachingZipEntries
                      ? cachingZipEntries
                        ? "Reading ZIP..."
                        : editingProductId
                          ? "Saving..."
                          : "Publishing..."
                      : editingProductId
                        ? "Save changes"
                        : "Publish"}
                  </span>
                </button>
              </div>
            </div>

            <aside className="admin-card admin-preview-panel dark-live-preview relative overflow-hidden rounded-[30px] border border-indigo-200/20 bg-[#101736] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-18px_48px_rgba(0,0,0,0.28),0_28px_80px_rgba(15,23,42,0.28)] md:p-5">
              <div className="relative">
                <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-400/24 blur-3xl" />

                <div className="relative mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Preview</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight">Card</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Review before saving.
                    </p>
                  </div>

                  <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${
                    requiredReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {currentStatus}
                  </span>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-white/15 bg-slate-950/38 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-16px_32px_rgba(0,0,0,0.18),0_16px_40px_rgba(0,0,0,0.22)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.22),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_44%)]" />

                  <div className="relative flex flex-col gap-3 sm:flex-row">
                    <div className="h-28 w-full shrink-0 overflow-hidden rounded-[20px] border border-white/18 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_12px_28px_rgba(0,0,0,0.22)] sm:w-28">
                      {thumbnailPreview || thumbnailUrl ? (
                        <img
                          src={getProductImageSrc(thumbnailPreview || thumbnailUrl)}
                          alt="Live thumbnail preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-xs text-slate-300">
                          <span className="text-2xl">🖼️</span>
                          No thumbnail
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-xl font-black leading-tight text-white">
                        {title.trim() || "Untitled product"}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-300">
                        {description.trim() || "Add description."}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-black text-slate-100">
                          {grade || "No grade"}
                        </span>
                        <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-black text-slate-100">
                          {quarter || "No quarter"}
                        </span>
                        <span className="rounded-full border border-violet-300/25 bg-violet-400/18 px-3 py-1 text-xs font-black text-violet-100">
                          ₱{price.trim() || "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/14 bg-white/9 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">Thumbnail</p>
                    <p className="mt-2 text-sm font-black text-white">
                      {thumbnailUrl ? "Uploaded" : "No image"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                      {thumbnailFileName || "JPG, PNG, WEBP"}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-white/14 bg-white/9 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">Product file</p>
                    <p className="mt-2 truncate text-sm font-black text-white">
                      {fileName || "No file selected"}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      {fileSize ? formatFileSize(fileSize) : fileUrl ? "Linked" : "Required"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-[22px] border border-white/14 bg-white/9 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">Checklist</p>
                    <span className="text-xs font-black text-indigo-200">
                      {completedChecklist}/{formChecklist.length} complete
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {formChecklist.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-slate-100">{item.label}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                            item.done
                              ? "bg-emerald-300/18 text-emerald-100 border border-emerald-200/20"
                              : "bg-white/10 text-slate-300 border border-white/10"
                          }`}
                        >
                          {item.done ? "Done" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="admin-card rounded-[30px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur md:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Library</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Uploaded products</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Search, edit, remove.
                </p>
              </div>

              <div className="w-full lg:max-w-md">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold outline-none transition-all duration-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-[30px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-violet-100 border-t-violet-600 admin-spin" />
                <p className="text-sm font-black text-slate-500">Loading...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-2xl shadow-sm">
                  📚
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-950">No products</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add a product or search again.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <article
                    key={String(product.id)}
                    className="admin-card admin-pop overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]"
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {getProductImage(product) ? (
                        <img
                          src={getProductImageSrc(getProductImage(product))}
                          alt={product.title}
                          className="h-full w-full object-cover transition duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
                          <span className="text-3xl">🖼️</span>
                          No thumbnail
                        </div>
                      )}

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-black text-slate-800 shadow-sm backdrop-blur">
                          {product.grade}
                        </span>
                        <span className="rounded-full bg-slate-950/90 px-3 py-1 text-[11px] font-black text-white shadow-sm backdrop-blur">
                          {product.quarter}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <h3 className="line-clamp-2 text-lg font-black leading-tight text-slate-950">
                          {product.title}
                        </h3>

                        {product.description ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {product.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <span className="text-xl font-black text-slate-950">₱{product.price}</span>
                        <span className="max-w-[58%] truncate text-xs font-bold text-slate-500">
                          {product.file_name || "No file"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditing(product)}
                          className="admin-press inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeleteModal(product)}
                          className="admin-press inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {productToDelete && (
          <div
            className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDeleteModal()
            }}
          >
            <div className="admin-modal-pop relative w-full max-w-lg overflow-hidden rounded-[34px] border border-white/70 bg-white p-5 shadow-[0_35px_110px_rgba(15,23,42,0.35)] md:p-6">
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-rose-300/35 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-violet-300/25 blur-3xl" />

              <div className="relative">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-2xl shadow-inner">
                      ⚠️
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
                        Confirm delete
                      </p>
                      <h2 id="delete-product-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                        Delete this product?
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        This cannot be undone.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={Boolean(deletingProductId)}
                    className="admin-press flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-lg font-black text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close delete modal"
                  >
                    ×
                  </button>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200">
                      {getProductImage(productToDelete) ? (
                        <img
                          src={getProductImageSrc(getProductImage(productToDelete))}
                          alt={productToDelete.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 py-1">
                      <h3 className="line-clamp-2 text-lg font-black leading-tight text-slate-950">
                        {productToDelete.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
                        {productToDelete.description || "No description"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm">
                          {productToDelete.grade}
                        </span>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white shadow-sm">
                          {productToDelete.quarter}
                        </span>
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black text-violet-700">
                          ₱{productToDelete.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
                  Remove this product from the admin library and storefront.
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={Boolean(deletingProductId)}
                    className="admin-press min-h-[50px] rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDeleteProduct}
                    disabled={Boolean(deletingProductId)}
                    className="admin-press relative min-h-[50px] overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-rose-100 hover:shadow-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="admin-shimmer opacity-50" />
                    <span className="relative inline-flex items-center justify-center gap-2">
                      {deletingProductId && (
                        <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white admin-spin" />
                      )}
                      {deletingProductId ? "Deleting..." : "Delete product"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

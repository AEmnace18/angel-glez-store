"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import JSZip from "jszip"
import { supabase } from "@/lib/supabase"

type Product = {
  id: string
  title: string
  description?: string | null
  price: number
  quarter: string
  grade: string
  thumbnail_url: string | null
  file_name: string | null
  file_url: string | null
}

type UploadingState = {
  thumbnail?: boolean
  file?: boolean
}

type UploadProgressState = {
  thumbnail: number
  file: number
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

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-violet-600 transition-all duration-200"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
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

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [grade, setGrade] = useState("Grade 1")
  const [quarter, setQuarter] = useState("Q1")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [thumbnailPreview, setThumbnailPreview] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [uploadedProductFile, setUploadedProductFile] = useState<File | null>(null)
  const [cachingZipEntries, setCachingZipEntries] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const adminAuth = localStorage.getItem("angel-glez-admin-auth")
    if (adminAuth === "true") {
      setIsAuthed(true)
      loadProducts()
    } else {
      setLoading(false)
      window.location.href = "/admin-login"
    }
  }, [])

  async function loadProducts() {
    setLoading(true)

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load products.")
      setLoading(false)
      return
    }

    setProducts((data || []) as Product[])
    setLoading(false)
  }

  async function uploadToR2WithProgress(
    file: File,
    folder: "thumbnails" | "products",
    type: "thumbnail" | "file"
  ) {
    const signedRes = await fetch("/api/admin/r2-upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        contentType: file.type || "application/octet-stream",
      }),
    })

    const signedJson = await signedRes.json()

    if (!signedRes.ok || !signedJson?.uploadUrl || !signedJson?.objectKey) {
      throw new Error(signedJson?.error || "Failed to create R2 upload URL")
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("PUT", signedJson.uploadUrl)

      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const percent = Math.round((event.loaded / event.total) * 100)
        setUploadProgress((prev) => ({ ...prev, [type]: percent }))
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress((prev) => ({ ...prev, [type]: 100 }))
          resolve()
        } else {
          reject(new Error("Failed to upload file to R2"))
        }
      }

      xhr.onerror = () => reject(new Error("Failed to upload file to R2"))
      xhr.send(file)
    })

    const publicBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || ""

    return {
      objectKey: signedJson.objectKey as string,
      publicUrl: publicBaseUrl
        ? `${publicBaseUrl.replace(/\/$/, "")}/${String(signedJson.objectKey).replace(/^\//, "")}`
        : "",
    }
  }

  async function handleAssetUpload(file: File, type: "thumbnail" | "file") {
    setUploading((prev) => ({ ...prev, [type]: true }))
    setUploadProgress((prev) => ({ ...prev, [type]: 0 }))
    setUploadMessage(
      type === "thumbnail"
        ? "Uploading thumbnail to Cloudflare R2..."
        : "Uploading product file to Cloudflare R2..."
    )

    if (type === "thumbnail") {
      const localPreview = URL.createObjectURL(file)
      setThumbnailPreview(localPreview)
    }

    try {
      const uploaded = await uploadToR2WithProgress(file, type === "thumbnail" ? "thumbnails" : "products", type)

      if (type === "thumbnail") {
        setThumbnailUrl(uploaded.publicUrl || uploaded.objectKey)
        toast.success("Thumbnail uploaded to Cloudflare R2.")
      } else {
        setFileUrl(uploaded.objectKey)
        setFileName(file.name)
        setUploadedProductFile(file)
        toast.success("File uploaded to Cloudflare R2.")
      }
    } catch (error) {
      console.error(error)
      toast.error(type === "thumbnail" ? "Thumbnail upload failed." : "File upload failed.")
      if (type === "thumbnail") {
        setThumbnailPreview("")
      }
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
      setTimeout(() => {
        setUploadProgress((prev) => ({ ...prev, [type]: 0 }))
        setUploadMessage("")
      }, 500)
    }
  }


  function startEditing(product: Product) {
    setEditingProductId(product.id)
    setTitle(product.title || "")
    setDescription(product.description || "")
    setPrice(String(product.price || ""))
    setGrade(product.grade || "Grade 1")
    setQuarter(product.quarter || "Q1")
    setThumbnailUrl(product.thumbnail_url || "")
    setThumbnailPreview(product.thumbnail_url || "")
    setFileName(product.file_name || "")
    setFileUrl(product.file_url || "")
    setUploadedProductFile(null)
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
    setFileName("")
    setFileUrl("")
    setUploadedProductFile(null)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleCreateProduct() {
    if (!title.trim() || !description.trim() || !price.trim() || !grade || !quarter || !fileUrl || !fileName) {
      toast.error("Please complete all required fields.")
      return
    }

    const parsedPrice = Number(price)

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a valid price.")
      return
    }

    const isZipPackage = fileName.toLowerCase().endsWith(".zip")

    if (isZipPackage && !uploadedProductFile && !editingProductId) {
      toast.error("Please re-upload the ZIP file before saving.")
      return
    }

    setSaving(true)

    if (editingProductId) {
      const { error } = await supabase
        .from("products")
        .update({
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          grade,
          quarter,
          thumbnail_url: thumbnailUrl || null,
          image_url: thumbnailUrl || null,
          file_name: fileName,
          file_url: fileUrl,
        })
        .eq("id", editingProductId)

      setSaving(false)

      if (error) {
        toast.error("Failed to update product.")
        return
      }

      toast.success("Product updated.")
      resetForm()
      loadProducts()
      return
    }

    const { data: insertedProduct, error } = await supabase
      .from("products")
      .insert({
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        grade,
        quarter,
        thumbnail_url: thumbnailUrl || null,
        image_url: thumbnailUrl || null,
        file_name: fileName,
        file_url: fileUrl,
      })
      .select("id")
      .single()

    if (error || !insertedProduct) {
      setSaving(false)
      toast.error("Failed to create product.")
      return
    }

    if (isZipPackage && uploadedProductFile) {
      try {
        setCachingZipEntries(true)
        const manifest = await buildZipManifest(uploadedProductFile)

        if (manifest.length > 0) {
          const { error: manifestError } = await supabase.from("product_zip_entries").insert(
            manifest.map((entry) => ({
              product_id: insertedProduct.id,
              ...entry,
            }))
          )

          if (manifestError) {
            throw manifestError
          }
        }
      } catch (error) {
        console.error(error)
        toast.error("Product saved, but ZIP contents were not cached.")
      } finally {
        setCachingZipEntries(false)
      }
    }

    setSaving(false)

    toast.success(isZipPackage ? "Product added and ZIP contents cached." : "Product added.")
    resetForm()
    loadProducts()
  }

  async function handleDeleteProduct(id: string) {
    const confirmed = window.confirm("Delete this product?")
    if (!confirmed) return

    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      toast.error("Failed to delete product.")
      return
    }

    toast.success("Product deleted.")
    loadProducts()
  }

  const stats = useMemo(() => {
    return {
      total: products.length,
      q1: products.filter((p) => p.quarter === "Q1").length,
      q2: products.filter((p) => p.quarter === "Q2").length,
      q3: products.filter((p) => p.quarter === "Q3").length,
      q4: products.filter((p) => p.quarter === "Q4").length,
    }
  }, [products])

  if (!isAuthed && !loading) return null

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f3ec_0%,#f2ede4_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-white/70 bg-white/85 px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur md:px-7 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Admin workspace
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight md:text-4xl">Product Manager</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Upload premium teaching files, add clearer details, and keep the storefront clean.
                </p>
              </div>
            </div>

            <a
              href="/admin/payments"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open payments
            </a>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Total products", value: stats.total },
            { label: "Quarter 1", value: stats.q1 },
            { label: "Quarter 2–3", value: stats.q2 + stats.q3 },
            { label: "Quarter 4", value: stats.q4 },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-white/70 bg-white/85 px-4 py-4 shadow-sm"
            >
              <p className="text-2xl font-black text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {editingProductId ? "Edit product" : "Add product"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload the thumbnail and teaching file to Cloudflare R2, then save the product.
                </p>
              </div>

              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: AP 6 Q4 W3 Pagkilos at Pagtugon"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description for teachers. Example: Includes editable PPT, worksheet, and visual materials."
                  rows={3}
                  className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Price</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="200"
                    type="number"
                    min="0"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                  >
                    {gradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400"
                  >
                    {quarterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Thumbnail preview</p>
                  <div className="mt-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                    {thumbnailPreview || thumbnailUrl ? (
                      <img
                        src={thumbnailPreview || thumbnailUrl}
                        alt="Thumbnail preview"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center text-sm text-slate-400">
                        No thumbnail yet
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2">
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAssetUpload(file, "thumbnail")
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
                    />

                    {uploading.thumbnail ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                          <span>Uploading thumbnail</span>
                          <span>{uploadProgress.thumbnail}%</span>
                        </div>
                        <ProgressBar value={uploadProgress.thumbnail} />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {thumbnailUrl ? "Thumbnail uploaded and ready." : "Recommended: clear cover image."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Product file</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAssetUpload(file, "file")
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
                    />
                  </div>

                  <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {fileName || "No file selected"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {uploadedProductFile ? formatFileSize(uploadedProductFile.size) : "ZIP, PPTX, DOCX, XLSX, PDF, and more"}
                        </p>
                      </div>
                      {fileName && (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                          Ready
                        </span>
                      )}
                    </div>

                    {uploading.file ? (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                          <span>Uploading to Cloudflare R2</span>
                          <span>{uploadProgress.file}%</span>
                        </div>
                        <ProgressBar value={uploadProgress.file} />
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">
                        ZIP files will also cache their contents for faster purchased-file loading.
                      </p>
                    )}
                  </div>

                  {(uploading.thumbnail || uploading.file || uploadMessage) && (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
                      {uploadMessage || "Uploading..."}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateProduct}
                disabled={saving || uploading.file || uploading.thumbnail || cachingZipEntries}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || cachingZipEntries
                  ? cachingZipEntries
                    ? "Caching ZIP contents..."
                    : editingProductId
                      ? "Saving changes..."
                      : "Saving product..."
                  : editingProductId
                    ? "Save changes"
                    : "Add product"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] md:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-black tracking-tight">Upload guidance</h2>
              <p className="mt-1 text-sm text-white/65">
                Keep the admin workflow cleaner and more premium.
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Use concise titles and a short description so teachers understand the product instantly.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Use a clean thumbnail with visible grade and quarter labels for stronger storefront previews.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                ZIP packages stay in Cloudflare R2 and can cache their contents for faster buyer access later.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">Uploaded products</h2>
              <p className="mt-1 text-sm text-slate-500">
                Compact product cards with cleaner spacing and smaller typography.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-500">
              No products yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[16/10] bg-slate-100">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No thumbnail
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <h3 className="line-clamp-2 text-base font-black leading-tight text-slate-900">
                        {product.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.grade} • {product.quarter}
                      </p>
                      {product.description ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                          {product.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        ₱{product.price}
                      </span>
                      <span className="max-w-[62%] truncate text-[11px] text-slate-500">
                        {product.file_name || "No file"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => startEditing(product)}
                        className="inline-flex min-h-[40px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="inline-flex min-h-[40px] w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
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
    </main>
  )
}

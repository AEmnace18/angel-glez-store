"use client"


import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import JSZip from "jszip"
import { supabase } from "@/lib/supabase"

type Product = {
  id: string
  title: string
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

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<UploadingState>({})
  const [isAuthed, setIsAuthed] = useState(false)

  const [title, setTitle] = useState("")
  const [price, setPrice] = useState("")
  const [grade, setGrade] = useState("Grade 1")
  const [quarter, setQuarter] = useState("Q1")
  const [thumbnailUrl, setThumbnailUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [uploadedProductFile, setUploadedProductFile] = useState<File | null>(null)
  const [cachingZipEntries, setCachingZipEntries] = useState(false)

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

  async function uploadToBlob(file: File, type: "thumbnail" | "file") {
    setUploading((prev) => ({ ...prev, [type]: true }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)

      const response = await fetch("/api/blob", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || "Upload failed")
      }

      if (type === "thumbnail") {
        setThumbnailUrl(result.url || "")
      } else {
        setFileUrl(result.url || "")
        setFileName(file.name)
        setUploadedProductFile(file)
      }

      toast.success(type === "thumbnail" ? "Thumbnail uploaded." : "File uploaded.")
    } catch (error) {
      console.error(error)
      toast.error(type === "thumbnail" ? "Thumbnail upload failed." : "File upload failed.")
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
    }
  }

  async function handleCreateProduct() {
    if (!title.trim() || !price.trim() || !grade || !quarter || !fileUrl || !fileName) {
      toast.error("Please complete all required fields.")
      return
    }

    const parsedPrice = Number(price)

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a valid price.")
      return
    }

    const isZipPackage = fileName.toLowerCase().endsWith(".zip")

    if (isZipPackage && !uploadedProductFile) {
      toast.error("Please re-upload the ZIP file before saving.")
      return
    }

    setSaving(true)

    const { data: insertedProduct, error } = await supabase
      .from("products")
      .insert({
        title: title.trim(),
        price: parsedPrice,
        grade,
        quarter,
        thumbnail_url: thumbnailUrl || null,
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
    setTitle("")
    setPrice("")
    setGrade("Grade 1")
    setQuarter("Q1")
    setThumbnailUrl("")
    setFileName("")
    setFileUrl("")
    setUploadedProductFile(null)
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = ""
    if (fileInputRef.current) fileInputRef.current.value = ""
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
    <main className="min-h-screen bg-[#f6f1e8] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Admin dashboard
              </span>
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">Manage your COT products</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
                  Upload new teaching files, organize the library, and keep the store clean and ready for buyers.
                </p>
              </div>
            </div>

            <a
              href="/admin/payments"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
            >
              Open payments
            </a>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-sm">
            <div className="text-3xl font-black">{stats.total}</div>
            <div className="mt-1 text-sm text-slate-500">Total products</div>
          </div>
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-sm">
            <div className="text-3xl font-black">{stats.q1}</div>
            <div className="mt-1 text-sm text-slate-500">Quarter 1</div>
          </div>
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-sm">
            <div className="text-3xl font-black">{stats.q2 + stats.q3}</div>
            <div className="mt-1 text-sm text-slate-500">Quarter 2–3</div>
          </div>
          <div className="rounded-[28px] border border-white/60 bg-white/85 p-5 shadow-sm">
            <div className="text-3xl font-black">{stats.q4}</div>
            <div className="mt-1 text-sm text-slate-500">Quarter 4</div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight">Add a new product</h2>
              <p className="mt-2 text-sm text-slate-500">
                Upload the teaching file, set the title, price, grade, and quarter.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: AP 6 Q4 W3 Pagkilos at Pagtugon"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Price</label>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="200"
                    type="number"
                    min="0"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  >
                    {gradeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Quarter</label>
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  >
                    {quarterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Thumbnail image</label>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadToBlob(file, "thumbnail")
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    {uploading.thumbnail ? "Uploading thumbnail..." : thumbnailUrl ? "Thumbnail ready." : "Optional"}
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Product file</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadToBlob(file, "file")
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    {uploading.file ? "Uploading file..." : fileName ? fileName : "Required"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateProduct}
                disabled={saving || uploading.file || uploading.thumbnail || cachingZipEntries}
                className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving || cachingZipEntries
                  ? cachingZipEntries
                    ? "Caching ZIP contents..."
                    : "Saving product..."
                  : "Add product"}
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/60 bg-slate-950 p-6 text-white shadow-[0_12px_40px_rgba(15,23,42,0.12)] md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-black tracking-tight">Quick admin notes</h2>
              <p className="mt-2 text-sm text-white/65">
                Keep uploads neat so buyers get a clean premium experience.
              </p>
            </div>

            <div className="space-y-4 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Use clear file titles so teachers know exactly what they are buying.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Prefer polished thumbnails with readable grade and quarter labels.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                ZIP uploads are supported, and new ZIP products cache their contents for faster buyer loading.
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/60 bg-white/85 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Uploaded products</h2>
              <p className="mt-2 text-sm text-slate-500">
                Review everything currently listed in the store.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-14 text-center text-sm text-slate-500">
              No products yet.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
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

                  <div className="space-y-4 p-5">
                    <div>
                      <h3 className="line-clamp-2 text-lg font-black leading-tight">{product.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {product.grade} • {product.quarter}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        ₱{product.price}
                      </span>
                      <span className="max-w-[60%] truncate text-xs text-slate-500">
                        {product.file_name || "No file"}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      Delete product
                    </button>
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

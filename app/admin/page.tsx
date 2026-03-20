"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const ADMIN_SESSION_KEY = "angel-glez-admin-auth"
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024

type ProductItem = {
  id: number
  title: string
  description: string
  price: number
  quarter: string
  grade: string
  fileName: string
  fileUrl: string
  imageUrl: string
  likes: number
  sold: number
}

export default function AdminPage() {
  const [checkedAuth, setCheckedAuth] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [editingProductId, setEditingProductId] = useState<number | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [grade, setGrade] = useState("")
  const [quarter, setQuarter] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [currentFileName, setCurrentFileName] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const showError = (message: string) => {
    toast.error(message, {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const showSuccess = (message: string) => {
    toast.success(message, {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const isAllowedFile = (selectedFile: File) => {
    const allowedExtensions = [".doc", ".docx", ".ppt", ".pptx", ".zip", ".rar"]
    const lowerName = selectedFile.name.toLowerCase()
    return allowedExtensions.some((ext) => lowerName.endsWith(ext))
  }

  const mapSupabaseProducts = (rows: any[]): ProductItem[] => {
    return rows.map((product) => ({
      id: Number(product.id),
      title: product.title || "",
      description: product.description || "",
      price: Number(product.price || 0),
      quarter: product.quarter || "",
      grade: product.grade || "",
      fileName: product.file_name || "",
      fileUrl: product.file_url || "",
      imageUrl: product.image_url || "",
      likes: Number(product.likes || 0),
      sold: Number(product.sold || 0),
    }))
  }

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.error("Failed to load products:", error)
      showError("Failed to load products")
      return
    }

    setProducts(mapSupabaseProducts(data || []))
  }

  useEffect(() => {
    const isAdmin = localStorage.getItem(ADMIN_SESSION_KEY)

    if (isAdmin !== "true") {
      window.location.href = "/admin-login"
      return
    }

    setCheckedAuth(true)
    void loadProducts()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY)
    window.location.href = "/admin-login"
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPrice("")
    setQuarter("")
    setGrade("")
    setFile(null)
    setImage(null)
    setImagePreview(null)
    setCurrentFileName("")
    setEditingProductId(null)
    setUploadProgress(0)

    if (fileInputRef.current) fileInputRef.current.value = ""
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const uploadThumbnailToSupabase = async (selectedFile: File) => {
    const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `product-thumbnails/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${cleanName}`

    const { error: uploadError } = await supabase.storage
      .from("product-thumbnails")
      .upload(filePath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || "image/jpeg",
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from("product-thumbnails").getPublicUrl(filePath)

    return {
      path: filePath,
      url: data.publicUrl,
    }
  }

  const uploadProductFileToR2 = async (selectedFile: File) => {
    setUploadProgress(10)

    const res = await fetch("/api/admin/r2-upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: selectedFile.name,
        contentType: selectedFile.type || "application/octet-stream",
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "Failed to get upload URL")
    }

    setUploadProgress(30)

    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": selectedFile.type || "application/octet-stream",
      },
      body: selectedFile,
    })

    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      throw new Error(text || "Upload to R2 failed")
    }

    setUploadProgress(100)

    return {
      key: data.objectKey as string,
      url: data.objectKey as string,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !description || !price || !quarter || !grade) {
      showError("Please complete all fields")
      return
    }

    if (!editingProductId && (!file || !image)) {
      showError("Please upload both file and image")
      return
    }

    if (file && !isAllowedFile(file)) {
      showError("Only Word, PowerPoint, ZIP, or RAR files are allowed")
      return
    }

    if (image && image.size > MAX_THUMBNAIL_SIZE) {
      showError("Thumbnail image must be 10 MB or below")
      return
    }

    try {
      setLoading(true)
      setUploadProgress(0)

      if (editingProductId) {
        const existingProduct = products.find((p) => p.id === editingProductId)

        if (!existingProduct) {
          showError("Product not found")
          return
        }

        let updatedFileUrl = existingProduct.fileUrl
        let updatedFileName = existingProduct.fileName
        let updatedImageUrl = existingProduct.imageUrl

        if (file) {
          const uploadedProductFile = await uploadProductFileToR2(file)
          updatedFileUrl = uploadedProductFile.key
          updatedFileName = file.name
        }

        if (image) {
          const uploadedThumbnail = await uploadThumbnailToSupabase(image)
          updatedImageUrl = uploadedThumbnail.url
        }

        const { error } = await supabase
          .from("products")
          .update({
            title,
            description,
            price: Number(price),
            quarter,
            grade,
            file_name: updatedFileName,
            file_url: updatedFileUrl,
            image_url: updatedImageUrl,
          })
          .eq("id", editingProductId)

        if (error) {
          console.error("Update failed:", error)
          showError("Update failed")
          return
        }

        await loadProducts()
        showSuccess("Product updated successfully!")
        resetForm()
        return
      }

      const uploadedThumbnail = await uploadThumbnailToSupabase(image as File)
      const uploadedProductFile = await uploadProductFileToR2(file as File)

      const { error } = await supabase.from("products").insert({
        title,
        description,
        price: Number(price),
        quarter,
        grade,
        file_name: (file as File).name,
        file_url: uploadedProductFile.key,
        image_url: uploadedThumbnail.url,
        likes: 0,
        sold: 0,
      })

      if (error) {
        console.error("Insert failed:", error)
        showError("Upload failed")
        return
      }

      await loadProducts()
      showSuccess("Product uploaded successfully!")
      resetForm()
    } catch (error) {
      console.error(error)
      const message =
        error instanceof Error
          ? error.message
          : editingProductId
            ? "Update failed"
            : "Upload failed"
      showError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditProduct = (product: ProductItem) => {
    setEditingProductId(product.id)
    setTitle(product.title)
    setDescription(product.description)
    setPrice(String(product.price))
    setQuarter(product.quarter)
    setGrade(product.grade)
    setImagePreview(product.imageUrl)
    setCurrentFileName(product.fileName)
    setFile(null)
    setImage(null)
    setUploadProgress(0)

    if (fileInputRef.current) fileInputRef.current.value = ""
    if (imageInputRef.current) imageInputRef.current.value = ""

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const deleteProduct = async (id: number) => {
    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      console.error("Delete failed:", error)
      showError("Delete failed")
      return
    }

    await loadProducts()

    if (editingProductId === id) {
      resetForm()
    }

    showSuccess("Product deleted")
  }

  const adminStats = useMemo(() => {
    const totalProducts = products.length
    const totalSales = products.reduce((sum, product) => sum + (product.sold || 0), 0)
    const totalLikes = products.reduce((sum, product) => sum + (product.likes || 0), 0)
    const estimatedValue = products.reduce((sum, product) => sum + Number(product.price || 0), 0)

    return {
      totalProducts,
      totalSales,
      totalLikes,
      estimatedValue,
    }
  }, [products])

  if (!checkedAuth) return null

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.10),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] md:px-8 md:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(216,180,254,0.16),transparent_30%)]" />
          <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-violet-200">
                Angel Glez Admin Studio
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                {editingProductId ? "Edit Product" : "Upload New Product"}
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
                {editingProductId
                  ? "Refine your product details, swap files, and update the store preview before saving changes."
                  : "Manage your teaching materials, upload polished thumbnails, and prepare premium product cards for your store."}
              </p>
            </div>

            <div className="relative flex flex-wrap gap-3">
              <a
                href="/admin/payments"
                className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur-xl transition hover:bg-white/15"
              >
                Payment Tracker
              </a>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Total Products
              </p>
              <p className="mt-3 text-3xl font-black text-white">{adminStats.totalProducts}</p>
              <p className="mt-1 text-sm text-slate-300">Published in your store</p>
            </div>

            <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Total Sales
              </p>
              <p className="mt-3 text-3xl font-black text-white">{adminStats.totalSales}</p>
              <p className="mt-1 text-sm text-slate-300">Combined sold count</p>
            </div>

            <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Total Likes
              </p>
              <p className="mt-3 text-3xl font-black text-white">{adminStats.totalLikes}</p>
              <p className="mt-1 text-sm text-slate-300">Engagement from visitors</p>
            </div>

            <div className="rounded-[26px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                Catalog Value
              </p>
              <p className="mt-3 text-3xl font-black text-white">₱{adminStats.estimatedValue}</p>
              <p className="mt-1 text-sm text-slate-300">Sum of product prices</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                  Product setup
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Product Details
                </h2>
                <p className="mt-2 max-w-2xl text-slate-500">
                  {editingProductId
                    ? "You are editing an existing product. Update the details below, then save when everything looks correct."
                    : "Fill in the product information, upload the file and thumbnail, then publish it to your storefront."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel Edit
                  </button>
                )}

                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">
                  {loading ? "Processing..." : "Ready to save"}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-slate-900">Basic Information</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add the visible details that shoppers will see on your product card.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Product Title
                    </label>
                    <input
                      placeholder="Example: Grade 5 Quarter 2 COT in Math"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Description
                    </label>
                    <textarea
                      placeholder="Write a short but clear description for this product..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-slate-900">Pricing and Category</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Set the product price, quarter, and grade placement.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Price
                    </label>
                    <input
                      placeholder="149"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Quarter
                    </label>
                    <select
                      value={quarter}
                      onChange={(e) => setQuarter(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                    >
                      <option value="">Select Quarter</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Grade Level
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                  >
                    <option value="">Select Grade</option>
                    <option value="Kinder">Kinder</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                    <option value="Grade 5">Grade 5</option>
                    <option value="Grade 6">Grade 6</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="mb-4">
                  <h3 className="text-lg font-black text-slate-900">Files and Thumbnail</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload the teaching file and the product thumbnail that will appear in the marketplace.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {editingProductId ? "Replace Product File (Optional)" : "Upload Product File"}
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".doc,.docx,.ppt,.pptx,.zip,.rar"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-dashed border-slate-300 bg-white px-5 py-5 text-left transition hover:border-violet-400 hover:bg-violet-50"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {file
                            ? file.name
                            : currentFileName || "Choose Word, PowerPoint, ZIP, or RAR file"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {editingProductId
                            ? "Leave this unchanged if you want to keep the current file."
                            : "Large files upload to Cloudflare R2 for better delivery."}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
                        Choose File
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      {editingProductId ? "Replace Thumbnail Image (Optional)" : "Upload Thumbnail Image"}
                    </label>

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null
                        setImage(selected)

                        if (selected) {
                          const url = URL.createObjectURL(selected)
                          setImagePreview(url)
                        } else {
                          setImagePreview(editingProductId ? imagePreview : null)
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex w-full items-center justify-between gap-4 rounded-[26px] border border-dashed border-slate-300 bg-white px-5 py-5 text-left transition hover:border-violet-400 hover:bg-violet-50"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {image ? image.name : "Choose thumbnail image"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {editingProductId
                            ? "Leave this unchanged if you want to keep the current thumbnail."
                            : "Recommended for your product card cover."}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
                        Choose Image
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {loading && uploadProgress > 0 && (
                <div className="rounded-[24px] border border-violet-100 bg-violet-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-violet-700">
                    <span>{editingProductId ? "Updating product" : "Uploading product"}</span>
                    <span>{uploadProgress}%</span>
                  </div>

                  <div className="overflow-hidden rounded-full bg-white">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading
                    ? editingProductId
                      ? "Updating..."
                      : "Uploading..."
                    : editingProductId
                      ? "Update Product"
                      : "Publish Product"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Reset Form
                </button>
              </div>
            </form>
          </section>

          <aside className="h-fit rounded-[34px] border border-slate-800/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:sticky md:top-6 md:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
                Live Preview
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
                Product Card Preview
              </h2>
              <p className="mt-2 text-slate-300">
                Review how your product card will look before saving it to the storefront.
              </p>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white text-slate-900 shadow-2xl">
              <div className="aspect-[4/3] w-full bg-slate-200">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-6 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-500">No thumbnail yet</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Upload an image to preview it here
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                    {grade || "Grade Level"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {quarter || "Quarter"}
                  </span>
                </div>

                <h3 className="line-clamp-2 text-xl font-extrabold">
                  {title || "Your product title will appear here"}
                </h3>

                <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                  {description || "Your product description will appear here."}
                </p>

                <p className="mt-3 line-clamp-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
                  {file ? file.name : currentFileName || "No product file selected yet"}
                </p>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Price</p>
                    <p className="text-3xl font-black">{price ? `₱${price}` : "₱0"}</p>
                  </div>

                  <button
                    type="button"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                  >
                    Preview Only
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  File Status
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {file || currentFileName ? "Ready" : "Missing"}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Image Status
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {imagePreview ? "Ready" : "Missing"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Publishing Tip
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Use a clear title, a readable thumbnail, and the exact quarter and grade so shoppers can find the right file faster.
              </p>
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                Catalog Manager
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Uploaded Products
              </h2>
              <p className="mt-2 text-slate-500">
                Manage the products currently saved in your store.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              No uploaded products yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-violet-200 hover:shadow-[0_20px_40px_rgba(139,92,246,0.14)]"
                >
                  <div className="relative h-44 bg-slate-100">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/20 to-transparent" />
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                        {product.grade}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                        {product.quarter}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-base font-extrabold text-slate-900">
                      {product.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                      {product.description}
                    </p>

                    <p className="mt-3 line-clamp-1 rounded-full bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
                      {product.fileName}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xl font-black text-slate-900">₱{product.price}</p>
                        <p className="text-xs font-semibold text-slate-400">
                          {product.sold} sold • {product.likes} likes
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}  
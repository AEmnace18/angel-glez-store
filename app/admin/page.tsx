"use client"

import { useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { uploadToBlob } from "@/lib/blob-upload"
import { supabase } from "@/lib/supabase"

const ADMIN_SESSION_KEY = "angel-glez-admin-auth"

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

    if (fileInputRef.current) fileInputRef.current.value = ""
    if (imageInputRef.current) imageInputRef.current.value = ""
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

    try {
      setLoading(true)

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
          const uploadedProductFile = await uploadToBlob(file, "products")
          updatedFileUrl = uploadedProductFile.url
          updatedFileName = file.name
        }

        if (image) {
          const uploadedThumbnail = await uploadToBlob(image, "thumbnails")
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

      const uploadedThumbnail = await uploadToBlob(image as File, "thumbnails")
      const uploadedProductFile = await uploadToBlob(file as File, "products")

      const { error } = await supabase.from("products").insert({
        title,
        description,
        price: Number(price),
        quarter,
        grade,
        file_name: (file as File).name,
        file_url: uploadedProductFile.url,
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
      showError(editingProductId ? "Update failed" : "Upload failed")
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

  if (!checkedAuth) return null

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[32px] bg-white px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
              Angel Glez Admin
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              {editingProductId ? "Edit Product" : "Upload New Product"}
            </h1>
            <p className="mt-2 text-slate-500">
              {editingProductId
                ? "Update your product details, file, or thumbnail."
                : "Add your COT files, thumbnails, grade, quarter, and selling price."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin/payments"
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Payment Tracker
            </a>

            <button
              onClick={handleLogout}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold">Product Details</h2>
                <p className="mt-1 text-slate-500">
                  {editingProductId
                    ? "You are editing an existing product."
                    : "Fill in the product information before uploading."}
                </p>
              </div>

              {editingProductId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Product Title
                </label>
                <input
                  placeholder="Example: Grade 5 Quarter 2 COT in Math"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
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
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Price
                  </label>
                  <input
                    placeholder="₱149"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quarter
                  </label>
                  <select
  value={quarter}
  onChange={(e) => setQuarter(e.target.value)}
  className="w-full rounded-xl border p-3"
>
  <option value="">Select Quarter</option>
  <option value="Q1">Q1</option>
  <option value="Q2">Q2</option>
  <option value="Q3">Q3</option>
  <option value="Q4">Q4</option>
</select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Grade Level
                </label>
                <select
  value={grade}
  onChange={(e) => setGrade(e.target.value)}
  className="w-full rounded-xl border p-3"
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
                  className="flex w-full items-center justify-between rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-left transition hover:border-violet-400 hover:bg-violet-50"
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
                        : "Upload a Word, PowerPoint, ZIP, or RAR file for your product."}
                    </p>
                  </div>

                  <span className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
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
                  className="flex w-full items-center justify-between rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-left transition hover:border-violet-400 hover:bg-violet-50"
                >
                  <div>
                    <p className="font-bold text-slate-800">
                      {image ? image.name : "Choose thumbnail image"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {editingProductId
                        ? "Leave this unchanged if you want to keep the current thumbnail."
                        : "Use a clear preview image for the product card."}
                    </p>
                  </div>

                  <span className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">
                    Choose Image
                  </span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-violet-200 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? editingProductId
                    ? "Updating..."
                    : "Uploading..."
                  : editingProductId
                    ? "Update Product"
                    : "Upload Product"}
              </button>
            </form>
          </section>

          <aside className="rounded-[32px] bg-slate-900 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.14)] md:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
                Live Preview
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">Product Card Preview</h2>
              <p className="mt-2 text-slate-300">
                This is how your product setup looks before saving.
              </p>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-2xl">
              <div className="aspect-[4/3] w-full bg-slate-200">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-center">
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

                <p className="mt-3 text-sm text-slate-500">
                  {file ? file.name : currentFileName || "No product file selected yet"}
                </p>

                <div className="mt-5 flex items-end justify-between">
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

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  File Status
                </p>
                <p className="mt-2 font-bold text-white">
                  {file || currentFileName ? "Ready" : "Missing"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Image Status
                </p>
                <p className="mt-2 font-bold text-white">
                  {imagePreview ? "Ready" : "Missing"}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold">Uploaded Products</h2>
              <p className="mt-1 text-slate-500">
                Manage the products currently saved in your store.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              No uploaded products yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-36 bg-slate-100">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                        {product.grade}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700">
                        {product.quarter}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">
                      {product.title}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {product.description}
                    </p>

                    <p className="mt-2 line-clamp-1 text-[11px] text-slate-400">
                      {product.fileName}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-base font-black text-slate-900">
                        ₱{product.price}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-xl bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
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
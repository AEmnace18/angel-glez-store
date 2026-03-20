
"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const PURCHASES_KEY = "angel-glez-purchases"
const CART_KEY = "angel-glez-cart"
const LIKES_KEY = "angel-glez-likes"

const quarters = [
  { code: "Q1", label: "Q1", name: "Quarter 1" },
  { code: "Q2", label: "Q2", name: "Quarter 2" },
  { code: "Q3", label: "Q3", name: "Quarter 3" },
  { code: "Q4", label: "Q4", name: "Quarter 4" },
]

const grades = [
  "Kinder",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
]

type Product = {
  id: number
  title: string
  description: string
  price: number
  quarter: string
  grade: string
  fileName: string
  fileUrl: string
  imageUrl: string
  likes?: number
  sold?: number
}

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

const getQuarterPreviewProducts = (products: Product[], quarterLabel: string) =>
  products.filter((p) => p.quarter === quarterLabel).slice(0, 2)

const getGradePreviewProducts = (
  products: Product[],
  quarterLabel: string,
  gradeLabel: string
) => products.filter((p) => p.quarter === quarterLabel && p.grade === gradeLabel).slice(0, 1)

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  )
}

function HeartIcon({
  className = "h-5 w-5",
  filled = false,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 21s-6.7-4.3-9.2-8.1C.9 9.9 2 5.5 6.1 4.5c2.3-.6 4.2.5 5.1 2.1.9-1.6 2.8-2.7 5.1-2.1 4.1 1 5.2 5.4 3.3 8.4C18.7 16.7 12 21 12 21z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Home() {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<number[]>([])
  const [cart, setCart] = useState<number[]>([])
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [animatingHeart, setAnimatingHeart] = useState<number | null>(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    const savedPurchases = localStorage.getItem(PURCHASES_KEY)
    const savedCart = localStorage.getItem(CART_KEY)
    const savedLikes = localStorage.getItem(LIKES_KEY)

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true)
      setLoadError(null)

      const { data, error } = await supabase.from("products").select("*").order("id", { ascending: false })

      if (error) {
        setLoadError(error.message || "Failed to load products.")
        setLoadingProducts(false)
        return
      }

      const mappedProducts: Product[] = (data || []).map((item: any) => ({
        id: Number(item.id),
        title: item.title || "Untitled Product",
        description: item.description || "",
        price: Number(item.price || 0),
        quarter: String(item.quarter || "").trim().toUpperCase(),
        grade: String(item.grade || "")
          .trim()
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        fileName: item.file_name || "",
        fileUrl: item.file_url || "",
        imageUrl: item.image_url || "",
        likes: Number(item.likes || 0),
        sold: Number(item.sold || 0),
      }))

      setProducts(mappedProducts)
      setLoadingProducts(false)
    }

    loadProducts()
  }, [])

  const featuredProducts = products.slice(0, 6)

  useEffect(() => {
    if (featuredProducts.length <= 1) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1))
    }, 3400)

    return () => clearInterval(interval)
  }, [featuredProducts.length])

  useEffect(() => {
    if (!selectedProduct) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProduct(null)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedProduct])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchQuarter = selectedQuarter ? product.quarter === selectedQuarter : true
      const matchGrade = selectedGrade ? product.grade === selectedGrade : true
      return matchQuarter && matchGrade
    })
  }, [products, selectedQuarter, selectedGrade])

  const currentFeatured =
    featuredProducts.length > 0 ? featuredProducts[featuredIndex % featuredProducts.length] : null

  const hasPurchased = (id: number) => purchases.includes(id)
  const isInCart = (id: number) => cart.includes(id)
  const hasLiked = (id: number) => likedIds.includes(id)
  const isBestSeller = (product: Product) => (product.sold || 0) >= 5

  const getQuarterCount = (quarterLabel: string) =>
    products.filter((p) => p.quarter === quarterLabel).length

  const getGradeCount = (quarterLabel: string, gradeLabel: string) =>
    products.filter((p) => p.quarter === quarterLabel && p.grade === gradeLabel).length

  const addToCart = (product: Product) => {
    if (cart.includes(product.id)) {
      toast("Already in cart", { style: toastStyle })
      return
    }

    const updatedCart = [...cart, product.id]
    setCart(updatedCart)
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart))
    toast.success("Added to cart", { style: toastStyle })
  }

  const toggleLike = (productId: number) => {
    const alreadyLiked = likedIds.includes(productId)

    const updatedLikedIds = alreadyLiked
      ? likedIds.filter((id) => id !== productId)
      : [...likedIds, productId]

    setLikedIds(updatedLikedIds)
    localStorage.setItem(LIKES_KEY, JSON.stringify(updatedLikedIds))

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product
        const currentLikes = product.likes || 0
        return {
          ...product,
          likes: alreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        }
      })
    )

    setAnimatingHeart(productId)
    setTimeout(() => setAnimatingHeart(null), 360)
  }

  const buyNow = (product: Product) => {
    window.location.href = `/checkout?productId=${product.id}`
  }

  const downloadProduct = async (product: Product) => {
    if (!hasPurchased(product.id)) {
      toast.error("Buy this product first to unlock download.", { style: toastStyle })
      return
    }

    if (!product.fileUrl) {
      toast.error("Download link is not connected yet.", { style: toastStyle })
      return
    }

    try {
      setDownloadingId(product.id)

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileKey: product.fileUrl,
          fileName: product.fileName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Download failed")
      }

      window.open(data.downloadUrl, "_blank")
      toast.success("Download ready.", { style: toastStyle })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Download failed", {
        style: toastStyle,
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <>
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_22%,#f9fbff_48%,#f5f7ff_100%)] text-slate-900">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(124,58,237,0.18),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(236,72,153,0.14),transparent_26%),radial-gradient(circle_at_78%_72%,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,255,0.92))]" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
          <div className="absolute right-[-80px] top-8 h-80 w-80 rounded-full bg-fuchsia-400/15 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="rounded-[30px] border border-white/70 bg-white/75 px-3 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group flex min-w-0 items-center gap-3 rounded-[24px] border border-slate-200/70 bg-white/90 px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                    >
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-violet-300/20 blur-md transition group-hover:bg-violet-300/30" />
                        <img
                          src="/logo.png"
                          alt="Angel Glez COT Logo"
                          className="relative h-12 w-12 rounded-2xl border border-white object-cover shadow-lg transition duration-300 group-hover:rotate-3 md:h-14 md:w-14"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight text-slate-900 md:text-[1.7rem]">
                          ANGEL GLEZ&apos;s COT
                        </p>
                        <p className="truncate text-[11px] font-medium text-slate-500 md:text-xs">
                          Premium Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/90 p-2 md:flex">
                      <a
                        href="#quarters"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Admin
                      </a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a
                        href="/cart"
                        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-slate-50"
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>Cart {cart.length}</span>
                      </a>

                      <div className="flex items-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-5 py-3 text-sm font-bold text-pink-700">
                        <HeartIcon className="h-4 w-4" filled />
                        <span>{likedIds.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                      <a
                        href="/cart"
                        className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>{cart.length}</span>
                      </a>
                      <div className="flex items-center gap-1 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-bold text-pink-700">
                        <HeartIcon className="h-4 w-4" filled />
                        <span>{likedIds.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 md:hidden">
                    <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-slate-200 bg-white/90 p-2">
                      <a
                        href="#quarters"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Files
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-20 pt-12 md:px-6 md:pb-20 md:pt-16">
              <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Angel Glez COT Logo"
                      className="h-14 w-14 rounded-2xl border border-white object-cover shadow-lg md:h-16 md:w-16"
                    />
                    <div className="inline-flex rounded-full border border-violet-200 bg-white/90 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                      Organized folders, secure delivery, classroom-ready files
                    </div>
                  </div>

                  <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-900 md:text-7xl">
                    Premium COT files
                    <br />
                    <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-transparent">
                      organized by quarter
                    </span>
                    <br />
                    <span className="text-4xl text-slate-500 md:text-5xl">
                      then sorted by grade level
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                    Keep the folder flow simple. Open a quarter folder first, reveal Kinder to Grade 6 folders next,
                    then browse the products inside that grade.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <a
                      href="#quarters"
                      className="rounded-2xl px-6 py-3 font-bold text-white transition hover:scale-[1.03]"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                        boxShadow: "0 18px 40px rgba(124,58,237,0.26)",
                      }}
                    >
                      Open Folder Library
                    </a>
                    <a
                      href="#marketplace"
                      className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-slate-50"
                    >
                      View Collection
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                      Sticky premium top panel
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                      Folder-to-folder browsing
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                      Heart pops on like
                    </span>
                  </div>

                  <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
                    <div className="rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{products.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Products</p>
                    </div>
                    <div className="rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{cart.length}</p>
                      <p className="mt-1 text-sm text-slate-500">In Cart</p>
                    </div>
                    <div className="rounded-[28px] border border-white bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Likes</p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="rounded-[34px] border border-white bg-white/75 p-5 shadow-[0_26px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition duration-300 hover:-translate-y-2">
                    <div className="rounded-[30px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.12)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured Preview</p>
                          <h3 className="text-2xl font-black text-slate-900">Teacher Marketplace</h3>
                        </div>
                        <div className="rounded-full bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700">
                          Live
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="rounded-[28px] bg-slate-50 p-4">
                          <div
                            key={currentFeatured.id}
                            className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
                            style={{ animation: "cardFloatIn 0.7s ease" }}
                          >
                            <div className="relative overflow-hidden">
                              {currentFeatured.imageUrl ? (
                                <img
                                  src={currentFeatured.imageUrl}
                                  alt={currentFeatured.title}
                                  className="h-64 w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-slate-400">
                                  No image
                                </div>
                              )}

                              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/30 to-transparent" />

                              <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                                <div className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white shadow">
                                  {currentFeatured.grade || "No grade"}
                                </div>

                                {isBestSeller(currentFeatured) && (
                                  <div className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow">
                                    Best Seller
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-5">
                              <div className="mb-3 flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-xl font-black text-slate-900">{currentFeatured.title}</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {currentFeatured.quarter || "No quarter"} • {currentFeatured.grade || "No grade"}
                                  </p>
                                </div>
                                <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                                  ₱{currentFeatured.price}
                                </div>
                              </div>

                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                  {currentFeatured.likes || 0} likes
                                </span>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                  {currentFeatured.sold || 0} sold
                                </span>
                              </div>

                              <p className="line-clamp-2 text-sm text-slate-500">
                                {currentFeatured.description || "Clean and ready-to-use classroom material."}
                              </p>
                            </div>
                          </div>

                          {featuredProducts.length > 1 && (
                            <div className="mt-4 flex justify-center gap-2">
                              {featuredProducts.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setFeaturedIndex(index)}
                                  className={`h-2.5 rounded-full transition-all ${
                                    featuredIndex === index ? "w-8 bg-violet-600" : "w-2.5 bg-slate-300"
                                  }`}
                                  aria-label={`Show featured product ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-[28px] bg-slate-50 p-10 text-center text-slate-500">
                          {loadingProducts ? "Loading products..." : "Upload products to show live previews here."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="quarters" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-500">
                Organized Library
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                Quarter Folders
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              Keep your quarter folders. Hover to open the folder lid, then click to reveal the grade folders inside.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {quarters.map((quarter) => {
              const previewItems = getQuarterPreviewProducts(products, quarter.label)
              const quarterCount = getQuarterCount(quarter.label)
              const isActive = selectedQuarter === quarter.label

              return (
                <button
                  key={quarter.code}
                  onClick={() => {
                    setSelectedQuarter(quarter.label)
                    setSelectedGrade(null)
                  }}
                  className="group text-left"
                >
                  <div className={`relative rounded-[34px] border p-5 transition-all duration-500 ${
                    isActive
                      ? "border-violet-300 bg-white shadow-[0_28px_80px_rgba(124,58,237,0.16)]"
                      : "border-white bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
                  }`}>
                    <div
                      className={`absolute left-6 right-6 top-[-12px] h-10 rounded-t-[22px] border border-b-0 border-[#d8b062] bg-gradient-to-b from-[#ffd87a] to-[#f4ba39] shadow-[0_10px_25px_rgba(245,158,11,0.18)] transition-all duration-500 ${
                        isActive ? "translate-y-[-2px]" : "group-hover:translate-y-[-12px]"
                      }`}
                    />
                    <div className="relative rounded-[28px] border border-[#e6bc68] bg-gradient-to-b from-[#ffd867] to-[#f7bf3c] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-900/70">
                            {quarter.code}
                          </p>
                          <h3 className="mt-1 text-3xl font-black text-amber-950">{quarter.name}</h3>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="rounded-[24px] bg-white/30 p-3 backdrop-blur-sm">
                        <div className="grid grid-cols-2 gap-3">
                          {previewItems.length > 0 ? (
                            previewItems.map((item) => (
                              <div key={item.id} className="overflow-hidden rounded-[18px] border border-white/40 bg-white/55 shadow-sm">
                                <img src={item.imageUrl} alt={item.title} className="h-28 w-full object-cover" />
                              </div>
                            ))
                          ) : (
                            <>
                              <div className="flex h-28 items-center justify-center rounded-[18px] border border-dashed border-amber-900/10 bg-white/35 text-sm font-semibold text-amber-950/50">
                                No preview
                              </div>
                              <div className="flex h-28 items-center justify-center rounded-[18px] border border-dashed border-amber-900/10 bg-white/35 text-sm font-semibold text-amber-950/50">
                                No preview
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-amber-950 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50">
                          {quarterCount} {quarterCount === 1 ? "Product" : "Products"}
                        </span>
                        <span className="font-bold text-amber-950">Open folder →</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedQuarter && (
          <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
            <div className="rounded-[32px] border border-white bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      Open folder
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {selectedQuarter}
                    </span>
                  </div>

                  <h3 className="text-3xl font-black text-slate-900">Grade Folders</h3>
                  <p className="mt-2 text-slate-600">
                    Pick a grade folder to show the products inside {selectedQuarter}.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedQuarter(null)
                    setSelectedGrade(null)
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Quarters
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {grades.map((grade) => {
                  const gradeCount = getGradeCount(selectedQuarter, grade)
                  const preview = getGradePreviewProducts(products, selectedQuarter, grade)[0]
                  const active = selectedGrade === grade

                  return (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className="group text-left"
                    >
                      <div className={`relative rounded-[28px] border p-4 transition-all duration-300 ${
                        active
                          ? "border-violet-300 bg-violet-50 shadow-[0_20px_60px_rgba(124,58,237,0.14)]"
                          : "border-slate-200 bg-white hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                      }`}>
                        <div className="absolute left-5 top-[-8px] h-7 w-14 rounded-t-[14px] bg-violet-200" />
                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-xl font-black text-slate-900">{grade}</h4>
                            {active && (
                              <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                Open
                              </span>
                            )}
                          </div>

                          <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                            {preview?.imageUrl ? (
                              <img src={preview.imageUrl} alt={grade} className="h-24 w-full object-cover" />
                            ) : (
                              <div className="flex h-24 items-center justify-center text-sm font-semibold text-slate-400">
                                No preview yet
                              </div>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between text-sm">
                            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                              {gradeCount} {gradeCount === 1 ? "item" : "items"}
                            </span>
                            <span className="font-bold text-slate-500">Open →</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <section id="marketplace" className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="rounded-[32px] border border-white bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-500">
                  Storefront
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                  Product Collection
                </h2>
                <p className="mt-2 text-slate-600">
                  Quarter folder first. Grade folder next. Then choose your file.
                </p>
              </div>

              <a
                href="/cart"
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-white transition hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                  boxShadow: "0 18px 36px rgba(124,58,237,0.22)",
                }}
              >
                <CartIcon className="h-5 w-5" />
                <span>View Cart ({cart.length})</span>
              </a>
            </div>

            {loadingProducts ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                Loading products...
              </div>
            ) : loadError ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 p-12 text-center text-red-600">
                Failed to load products: {loadError}
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-2xl font-black text-slate-900">
                    {selectedQuarter ? selectedQuarter : "All Quarters"}{" "}
                    <span className="text-slate-300">/</span>{" "}
                    {selectedGrade ? selectedGrade : "All Grades"}
                  </h3>
                  <p className="mt-1 text-slate-500">
                    {selectedQuarter || selectedGrade
                      ? "Products inside the open folder"
                      : "Showing all available products"}
                  </p>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                    No products found.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
                      >
                        <button onClick={() => setSelectedProduct(product)} className="block w-full text-left">
                          <div className="relative overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-60 w-full items-center justify-center bg-slate-100 text-slate-400">
                                No image
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/40 to-transparent" />

                            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                              <div className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow">
                                {product.grade || "No grade"}
                              </div>

                              {isBestSeller(product) && (
                                <div className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                                  Best Seller
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h4 className="text-2xl font-black leading-tight text-slate-900">
                                {product.title}
                              </h4>
                            </div>

                            {product.description && (
                              <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-500">
                                {product.description}
                              </p>
                            )}

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                {product.likes || 0} likes
                              </span>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {product.sold || 0} sold
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                {product.quarter || "No quarter"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-black text-slate-900">₱{product.price}</span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                View Details
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="border-t border-slate-200 px-5 pb-5 pt-4">
                          <div className="mb-5 flex items-center gap-3">
                            <button
                              onClick={() => toggleLike(product.id)}
                              className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 ${
                                hasLiked(product.id)
                                  ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.75),0_8px_16px_rgba(236,72,153,0.18)]"
                                  : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.85),0_8px_16px_rgba(15,23,42,0.08)]"
                              } ${animatingHeart === product.id ? "heart-pop" : ""}`}
                              aria-label="Like product"
                            >
                              <HeartIcon className="h-5 w-5" filled={hasLiked(product.id)} />
                            </button>

                            <span className="text-sm font-semibold text-slate-500">{product.likes || 0}</span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {!hasPurchased(product.id) && (
                              <button
                                onClick={() => addToCart(product)}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-bold text-white transition ${
                                  isInCart(product.id)
                                    ? "bg-slate-500"
                                    : "bg-amber-500 hover:bg-amber-600"
                                }`}
                              >
                                <CartIcon className="h-4 w-4" />
                                <span>{isInCart(product.id) ? "In Cart" : "Add to Cart"}</span>
                              </button>
                            )}

                            {hasPurchased(product.id) ? (
                              <button
                                onClick={() => downloadProduct(product)}
                                disabled={downloadingId === product.id}
                                className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
                              >
                                {downloadingId === product.id ? "Preparing..." : "Download"}
                              </button>
                            ) : (
                              <button
                                onClick={() => buyNow(product)}
                                className="rounded-2xl bg-slate-900 px-4 py-2 font-bold text-white transition hover:bg-slate-800"
                              >
                                Buy Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.22s ease-out" }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]"
            style={{ animation: "modalScaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      className="h-[260px] w-full object-cover md:h-[420px]"
                    />
                  ) : (
                    <div className="flex h-[260px] w-full items-center justify-center bg-slate-100 text-slate-400 md:h-[420px]">
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                    {selectedProduct.quarter || "No quarter"}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    {selectedProduct.grade || "No grade"}
                  </span>
                </div>

                {isBestSeller(selectedProduct) && (
                  <div className="mb-5">
                    <span className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-950 shadow-lg">
                      Best Seller
                    </span>
                  </div>
                )}

                <h2 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">
                  {selectedProduct.title}
                </h2>

                <p className="mt-5 text-base leading-8 text-slate-600">
                  {selectedProduct.description || "No description available for this product yet."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleLike(selectedProduct.id)}
                    className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 ${
                      hasLiked(selectedProduct.id)
                        ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.75),0_8px_16px_rgba(236,72,153,0.18)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.85),0_8px_16px_rgba(15,23,42,0.08)]"
                    } ${animatingHeart === selectedProduct.id ? "heart-pop" : ""}`}
                    aria-label="Like product"
                  >
                    <HeartIcon className="h-5 w-5" filled={hasLiked(selectedProduct.id)} />
                  </button>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                    {selectedProduct.likes || 0} likes
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    {selectedProduct.sold || 0} sold
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Price</p>
                      <p className="text-4xl font-black text-slate-900">₱{selectedProduct.price}</p>
                    </div>

                    {hasPurchased(selectedProduct.id) ? (
                      <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                        Purchased
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                        Ready to buy
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {!hasPurchased(selectedProduct.id) && (
                      <button
                        onClick={() => addToCart(selectedProduct)}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-white transition ${
                          isInCart(selectedProduct.id)
                            ? "bg-slate-500"
                            : "bg-amber-500 hover:bg-amber-600"
                        }`}
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>{isInCart(selectedProduct.id) ? "Already in Cart" : "Add to Cart"}</span>
                      </button>
                    )}

                    {hasPurchased(selectedProduct.id) ? (
                      <button
                        onClick={() => downloadProduct(selectedProduct)}
                        disabled={downloadingId === selectedProduct.id}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {downloadingId === selectedProduct.id ? "Preparing..." : "Download File"}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyNow(selectedProduct)}
                        className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                      >
                        Buy Now
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                  Payment continues on the checkout page, then approved purchases unlock secure downloads.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cardFloatIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes heartPop {
          0% { transform: scale(1); }
          35% { transform: scale(1.28) translateY(-2px); }
          60% { transform: scale(0.94); }
          100% { transform: scale(1); }
        }

        .heart-pop {
          animation: heartPop 0.35s ease;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  )
}

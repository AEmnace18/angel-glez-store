"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const PURCHASES_KEY = "angel-glez-purchases"
const CART_KEY = "angel-glez-cart"
const LIKES_KEY = "angel-glez-likes"

const quarters = [
  { code: "Q1", label: "Quarter 1" },
  { code: "Q2", label: "Quarter 2" },
  { code: "Q3", label: "Quarter 3" },
  { code: "Q4", label: "Quarter 4" },
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

const getQuarterPreviewProducts = (products: Product[], quarterCode: string) => {
  return products.filter((p) => p.quarter === quarterCode).slice(0, 2)
}

export default function Home() {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "popular">(
    "featured"
  )
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

  useEffect(() => {
    const featuredProducts = products.slice(0, 5)
    if (featuredProducts.length <= 1) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1))
    }, 3400)

    return () => clearInterval(interval)
  }, [products])

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

  const featuredProducts = useMemo(() => products.slice(0, 5), [products])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = products.filter((product) => {
      const matchQuarter = selectedQuarter ? product.quarter === selectedQuarter : true
      const matchGrade = selectedGrade ? product.grade === selectedGrade : true
      const matchSearch = normalizedSearch
        ? [product.title, product.description, product.grade, product.quarter]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        : true

      return matchQuarter && matchGrade && matchSearch
    })

    switch (sortBy) {
      case "price-low":
        return [...filtered].sort((a, b) => a.price - b.price)
      case "price-high":
        return [...filtered].sort((a, b) => b.price - a.price)
      case "popular":
        return [...filtered].sort((a, b) => (b.sold || 0) - (a.sold || 0))
      default:
        return filtered
    }
  }, [products, searchTerm, selectedQuarter, selectedGrade, sortBy])

  const currentFeatured =
    featuredProducts.length > 0
      ? featuredProducts[featuredIndex % featuredProducts.length]
      : null

  const totalSold = useMemo(
    () => products.reduce((sum, product) => sum + (product.sold || 0), 0),
    [products]
  )

  const totalLikes = useMemo(
    () => products.reduce((sum, product) => sum + (product.likes || 0), 0),
    [products]
  )

  const hasPurchased = (id: number) => purchases.includes(id)
  const isInCart = (id: number) => cart.includes(id)
  const hasLiked = (id: number) => likedIds.includes(id)
  const isBestSeller = (product: Product) => (product.sold || 0) >= 5
  const isNewArrival = (product: Product) => product.id >= Math.max(...products.map((p) => p.id), 0) - 3

  const getQuarterCount = (quarterCode: string) =>
    products.filter((p) => p.quarter === quarterCode).length

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
    setTimeout(() => setAnimatingHeart(null), 260)
  }

  const buyNow = (product: Product) => {
    window.location.href = `/checkout?productId=${product.id}`
  }

  const downloadProduct = async (product: Product) => {
    if (!hasPurchased(product.id)) {
      toast.error("Buy this product first to unlock download.", {
        style: toastStyle,
      })
      return
    }

    if (!product.fileUrl) {
      toast.error("Download link is not connected yet.", {
        style: toastStyle,
      })
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
          fileName: product.fileName || `${product.title}.file`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Download failed")
      }

      window.open(data.downloadUrl, "_blank")

      toast.success("Download ready.", {
        style: toastStyle,
      })
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
      <main className="min-h-screen bg-[#020617] text-white">
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 bg-[#020617]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(99,102,241,0.28),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(217,70,239,0.24),transparent_24%),radial-gradient(circle_at_75%_80%,rgba(45,212,191,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
          <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-[-100px] top-0 h-96 w-96 rounded-full bg-fuchsia-500/18 blur-3xl" />
          <div className="absolute bottom-[-120px] left-1/3 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="rounded-[30px] border border-white/10 bg-white/[0.06] px-3 py-3 shadow-[0_25px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group flex min-w-0 items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.07] px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.11]"
                    >
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-white/15 blur-md transition group-hover:bg-white/20" />
                        <img
                          src="/logo.png"
                          alt="Angel Glez COT Logo"
                          className="relative h-12 w-12 rounded-2xl border border-white/20 object-cover shadow-lg transition duration-300 group-hover:rotate-3 md:h-14 md:w-14"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight text-white md:text-[1.7rem]">
                          ANGEL GLEZ&apos;s COT
                        </p>
                        <p className="truncate text-[11px] font-medium text-white/55 md:text-xs">
                          Premium Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-2 md:flex">
                      <a href="#quarters" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Quarters</a>
                      <a href="#marketplace" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Shop</a>
                      <a href="/purchases" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Purchases</a>
                      <a href="/admin-login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Admin</a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a href="/cart" className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.12]">
                        Cart {cart.length}
                      </a>
                      <div className="rounded-2xl border border-pink-300/10 bg-pink-400/10 px-5 py-3 text-sm font-bold text-pink-100/90">
                        Likes {likedIds.length}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                      <a href="/cart" className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-xs font-bold text-white">
                        Cart {cart.length}
                      </a>
                      <div className="rounded-2xl border border-pink-300/10 bg-pink-400/10 px-3 py-2 text-xs font-bold text-pink-100/90">
                        {likedIds.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 md:hidden">
                    <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl">
                      <a href="#quarters" className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Quarters</a>
                      <a href="#marketplace" className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Shop</a>
                      <a href="/purchases" className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Files</a>
                      <a href="/admin-login" className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white">Admin</a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
              <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
                <div>
                  <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Ready-to-use classroom files for busy teachers
                  </div>

                  <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
                    <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
                      Make your lessons
                    </span>
                    <br />
                    <span className="text-white">look premium,</span>
                    <br />
                    <span className="text-4xl text-white/70 md:text-5xl">
                      organized, and ready to teach.
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                    Explore polished COT materials for Kinder to Grade 6. Filter by quarter,
                    grade, and topic, then checkout in minutes with instant secure delivery.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <a
                      href="#marketplace"
                      className="rounded-2xl px-6 py-3 font-bold text-white transition hover:scale-[1.03]"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                        boxShadow: "0 18px 40px rgba(124,58,237,0.35)",
                      }}
                    >
                      Shop Collection
                    </a>
                    <a
                      href="#quarters"
                      className="rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 font-bold text-white transition hover:bg-white/[0.10]"
                    >
                      Browse by Quarter
                    </a>
                  </div>

                  <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{products.length}</p>
                      <p className="mt-1 text-sm text-white/55">Curated products</p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{totalSold}</p>
                      <p className="mt-1 text-sm text-white/55">Completed sales</p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{totalLikes}</p>
                      <p className="mt-1 text-sm text-white/55">Store likes</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
                    {[
                      "Secure digital delivery",
                      "Structured by grade and quarter",
                      "Premium previews and checkout",
                    ].map((item) => (
                      <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                    <div className="rounded-[30px] border border-white/10 bg-gradient-to-b from-white to-slate-100 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.18)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured spotlight</p>
                          <h3 className="text-2xl font-black text-slate-900">Premium Classroom Picks</h3>
                        </div>
                        <div className="rounded-full bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700">
                          Live
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                          <div className="relative overflow-hidden">
                            {currentFeatured.imageUrl ? (
                              <img src={currentFeatured.imageUrl} alt={currentFeatured.title} className="h-72 w-full object-cover" />
                            ) : (
                              <div className="flex h-72 items-center justify-center bg-slate-100 text-slate-400">No image</div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/35 to-transparent" />
                            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                {currentFeatured.quarter}
                              </span>
                              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                                {currentFeatured.grade}
                              </span>
                              {isBestSeller(currentFeatured) && (
                                <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">
                                  Best Seller
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="mb-3 flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xl font-black text-slate-900">{currentFeatured.title}</p>
                                <p className="mt-1 text-sm text-slate-500">{currentFeatured.description || "Clean and ready-to-use classroom material."}</p>
                              </div>
                              <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                                ₱{currentFeatured.price}
                              </div>
                            </div>

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {currentFeatured.likes || 0} likes
                              </span>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {currentFeatured.sold || 0} sold
                              </span>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-3">
                              {featuredProducts.map((item, index) => (
                                <button
                                  key={item.id}
                                  onClick={() => setFeaturedIndex(index)}
                                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                                    index === featuredIndex
                                      ? "border-violet-300 bg-violet-50"
                                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                                  }`}
                                >
                                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">₱{item.price}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[28px] bg-slate-50 p-10 text-center text-slate-500">
                          {loadingProducts ? "Loading products..." : "Upload products to show featured previews here."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 rounded-[30px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl md:grid-cols-3 md:p-5">
                {[
                  { title: "Secure files", text: "Protected downloads powered by signed links." },
                  { title: "Fast checkout", text: "Simple buying flow for busy teachers and teams." },
                  { title: "Premium previews", text: "Polished cards, thumbnails, and classroom-ready packaging." },
                ].map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-200">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-white/60">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="quarters" className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">Organized library</p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Browse by Quarter</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              Start from a quarter folder, then narrow the collection by grade level and search.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {quarters.map((quarter) => {
              const previewItems = getQuarterPreviewProducts(products, quarter.code)
              const quarterCount = getQuarterCount(quarter.code)
              const isActive = selectedQuarter === quarter.code

              return (
                <button
                  key={quarter.code}
                  onClick={() => {
                    setSelectedQuarter(quarter.code)
                    setSelectedGrade(null)
                  }}
                  className={`group overflow-hidden rounded-[30px] border p-5 text-left transition duration-300 ${
                    isActive
                      ? "border-violet-300/40 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 shadow-[0_20px_50px_rgba(124,58,237,0.18)]"
                      : "border-white/10 bg-white/[0.05] hover:-translate-y-1 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-200">{quarter.code}</p>
                      <h3 className="mt-2 text-2xl font-black text-white">{quarter.label}</h3>
                    </div>
                    {isActive && (
                      <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-100">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {previewItems.length > 0 ? (
                      previewItems.map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-[22px] border border-white/10 bg-white/5">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 items-center justify-center bg-white/5 text-xs text-white/40">Preview</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 flex h-28 items-center justify-center rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-white/40">
                        No preview yet
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                      {quarterCount} {quarterCount === 1 ? "product" : "products"}
                    </span>
                    <span className="text-sm font-semibold text-white/55">Open folder →</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section id="marketplace" className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">Storefront</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-white">Premium Product Collection</h2>
                <p className="mt-2 text-white/55">Clean, classroom-ready files with polished previews and secure delivery.</p>
              </div>

              <a href="/cart" className="inline-flex rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 font-bold text-white transition hover:bg-white/[0.10]">
                View Cart ({cart.length})
              </a>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr]">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-3">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search title, grade, quarter, or description"
                  className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder:text-white/35 outline-none"
                />
              </div>

              <select
                value={selectedQuarter || ""}
                onChange={(e) => {
                  setSelectedQuarter(e.target.value || null)
                  setSelectedGrade(null)
                }}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white outline-none"
              >
                <option value="" className="text-slate-900">All quarters</option>
                {quarters.map((quarter) => (
                  <option key={quarter.code} value={quarter.code} className="text-slate-900">
                    {quarter.code}
                  </option>
                ))}
              </select>

              <select
                value={selectedGrade || ""}
                onChange={(e) => setSelectedGrade(e.target.value || null)}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white outline-none"
              >
                <option value="" className="text-slate-900">All grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade} className="text-slate-900">
                    {grade}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white outline-none"
              >
                <option value="featured" className="text-slate-900">Featured</option>
                <option value="popular" className="text-slate-900">Most Popular</option>
                <option value="price-low" className="text-slate-900">Lowest Price</option>
                <option value="price-high" className="text-slate-900">Highest Price</option>
              </select>
            </div>

            <div className="mb-8 flex flex-wrap gap-3">
              {selectedQuarter && (
                <button
                  onClick={() => setSelectedQuarter(null)}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/80"
                >
                  Quarter: {selectedQuarter} ✕
                </button>
              )}
              {selectedGrade && (
                <button
                  onClick={() => setSelectedGrade(null)}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/80"
                >
                  Grade: {selectedGrade} ✕
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/80"
                >
                  Search: {searchTerm} ✕
                </button>
              )}
              {(selectedQuarter || selectedGrade || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedQuarter(null)
                    setSelectedGrade(null)
                    setSearchTerm("")
                  }}
                  className="rounded-full border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-100"
                >
                  Clear all
                </button>
              )}
            </div>

            {loadingProducts ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-white/60">
                Loading products...
              </div>
            ) : loadError ? (
              <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 px-6 py-16 text-center text-red-100">
                {loadError}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-16 text-center text-white/60">
                No products matched your filters.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <button onClick={() => setSelectedProduct(product)} className="block w-full text-left">
                      <div className="relative overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.title} className="h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="flex h-64 items-center justify-center bg-white/[0.05] text-white/40">No image</div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">{product.grade || "No grade"}</span>
                          <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">{product.quarter || "No quarter"}</span>
                          {isBestSeller(product) && (
                            <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">Best Seller</span>
                          )}
                          {!isBestSeller(product) && isNewArrival(product) && (
                            <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-950">New</span>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                          <div>
                            <p className="line-clamp-2 text-2xl font-black leading-tight text-white">{product.title}</p>
                            <p className="mt-1 text-sm text-white/70">{product.fileName || "Digital file"}</p>
                          </div>
                          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg">₱{product.price}</div>
                        </div>
                      </div>
                    </button>

                    <div className="p-5">
                      <p className="line-clamp-3 text-sm leading-7 text-white/60">
                        {product.description || "Classroom-ready digital material with organized content and clean formatting."}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/70">
                            {product.likes || 0} likes
                          </span>
                          <span className="rounded-full border border-emerald-300/10 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
                            {product.sold || 0} sold
                          </span>
                        </div>

                        <button
                          onClick={() => toggleLike(product.id)}
                          className="group/heart inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:scale-110 hover:bg-white/[0.08]"
                          aria-label="Like product"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className={`h-5 w-5 transition-all duration-200 ${
                              hasLiked(product.id)
                                ? "fill-pink-500 stroke-pink-500"
                                : "fill-transparent stroke-white/55 group-hover/heart:stroke-pink-500"
                            } ${animatingHeart === product.id ? "scale-125" : ""}`}
                            strokeWidth="2"
                          >
                            <path d="M12 21s-6.716-4.35-9.193-8.154C.873 9.87 2.01 5.5 6.09 4.5c2.327-.57 4.172.53 5.11 2.09.938-1.56 2.783-2.66 5.11-2.09 4.08 1 5.217 5.37 3.283 8.346C18.716 16.65 12 21 12 21z" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {!hasPurchased(product.id) && (
                          <button
                            onClick={() => addToCart(product)}
                            className={`rounded-2xl px-4 py-3 font-bold text-white transition ${
                              isInCart(product.id)
                                ? "bg-slate-500"
                                : "bg-amber-500 hover:bg-amber-600"
                            }`}
                          >
                            {isInCart(product.id) ? "In Cart" : "Add to Cart"}
                          </button>
                        )}

                        {hasPurchased(product.id) ? (
                          <button
                            onClick={() => downloadProduct(product)}
                            disabled={downloadingId === product.id}
                            className="rounded-2xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                          >
                            {downloadingId === product.id ? "Preparing..." : "Download"}
                          </button>
                        ) : (
                          <button
                            onClick={() => buyNow(product)}
                            className="rounded-2xl bg-white px-4 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
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
          </div>
        </section>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/78 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.22s ease-out" }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            style={{ animation: "modalScaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/[0.04] to-white/[0.02]" />
            <div className="absolute -top-20 right-0 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl" />

            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white transition hover:bg-white/15"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="relative grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/8 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.title} className="h-[260px] w-full object-cover md:h-[420px]" />
                  ) : (
                    <div className="flex h-[260px] w-full items-center justify-center bg-slate-800 text-slate-400 md:h-[420px]">No image</div>
                  )}
                </div>
              </div>

              <div className="relative flex flex-col p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                    {selectedProduct.quarter || "No quarter"}
                  </span>
                  <span className="rounded-full border border-emerald-300/10 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                    {selectedProduct.grade || "No grade"}
                  </span>
                  {isBestSeller(selectedProduct) && (
                    <span className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-950 shadow-lg">
                      Best Seller
                    </span>
                  )}
                </div>

                <h2 className="text-3xl font-black leading-tight text-white md:text-4xl">
                  {selectedProduct.title}
                </h2>

                <p className="mt-5 text-base leading-8 text-white/70">
                  {selectedProduct.description || "No description available for this product yet."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleLike(selectedProduct.id)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/8 transition hover:scale-110 hover:bg-white/12"
                    aria-label="Like product"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-6 w-6 transition-all duration-200 ${
                        hasLiked(selectedProduct.id)
                          ? "fill-pink-500 stroke-pink-500"
                          : "fill-transparent stroke-white/70"
                      } ${animatingHeart === selectedProduct.id ? "scale-125" : ""}`}
                      strokeWidth="2"
                    >
                      <path d="M12 21s-6.716-4.35-9.193-8.154C.873 9.87 2.01 5.5 6.09 4.5c2.327-.57 4.172.53 5.11 2.09.938-1.56 2.783-2.66 5.11-2.09 4.08 1 5.217 5.37 3.283 8.346C18.716 16.65 12 21 12 21z" />
                    </svg>
                  </button>

                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white/75">
                    {selectedProduct.likes || 0} likes
                  </div>

                  <div className="rounded-full border border-emerald-300/10 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                    {selectedProduct.sold || 0} sold
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white/55">Price</p>
                      <p className="text-4xl font-black text-white">₱{selectedProduct.price}</p>
                    </div>

                    {hasPurchased(selectedProduct.id) ? (
                      <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-100">Purchased</span>
                    ) : (
                      <span className="rounded-full bg-amber-400/20 px-4 py-2 text-sm font-bold text-amber-100">Ready to buy</span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {!hasPurchased(selectedProduct.id) && (
                      <button
                        onClick={() => addToCart(selectedProduct)}
                        className={`rounded-2xl px-5 py-3 font-bold text-white transition ${
                          isInCart(selectedProduct.id)
                            ? "bg-slate-500"
                            : "bg-amber-500 hover:bg-amber-600"
                        }`}
                      >
                        {isInCart(selectedProduct.id) ? "Already in Cart" : "Add to Cart"}
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
                        className="rounded-2xl bg-white px-5 py-3 font-bold text-slate-900 transition hover:bg-slate-100"
                      >
                        Buy Now
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-white/60">
                  Secure checkout continues on the checkout page, and approved purchases unlock signed downloads.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  )
}

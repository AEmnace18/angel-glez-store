"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const PURCHASES_KEY = "angel-glez-purchases"
const CART_KEY = "angel-glez-cart"
const LIKES_KEY = "angel-glez-likes"

const quarters = [
  { code: "Q1", label: "Q1" },
  { code: "Q2", label: "Q2" },
  { code: "Q3", label: "Q3" },
  { code: "Q4", label: "Q4" },
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

const getQuarterPreviewProducts = (products: Product[], quarterLabel: string) => {
  return products.filter((p) => p.quarter === quarterLabel).slice(0, 1)
}

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
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

      const { data, error } = await supabase.from("products").select("*")

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

  const featuredProducts = products.slice(0, 5)

  useEffect(() => {
    if (featuredProducts.length <= 1) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) =>
        prev === featuredProducts.length - 1 ? 0 : prev + 1
      )
    }, 3200)

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
    featuredProducts.length > 0
      ? featuredProducts[featuredIndex % featuredProducts.length]
      : null

  const hasPurchased = (id: number) => purchases.includes(id)
  const isInCart = (id: number) => cart.includes(id)
  const hasLiked = (id: number) => likedIds.includes(id)
  const isBestSeller = (product: Product) => (product.sold || 0) >= 5

  const getQuarterCount = (quarterLabel: string) =>
    products.filter((p) => p.quarter === quarterLabel).length

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

    const updatedProducts = products.map((product) => {
      if (product.id !== productId) return product
      const currentLikes = product.likes || 0
      return {
        ...product,
        likes: alreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
      }
    })

    setProducts(updatedProducts)
    setAnimatingHeart(productId)
    setTimeout(() => setAnimatingHeart(null), 260)
  }

  const buyNow = (product: Product) => {
    window.location.href = `/checkout?productId=${product.id}`
  }

  const downloadProduct = (product: Product) => {
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

    const link = document.createElement("a")
    link.href = product.fileUrl
    link.download = product.fileName || `${product.title}.file`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Download started.", {
      style: toastStyle,
    })
  }

  return (
    <>
      <main className="min-h-screen bg-[#020617] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[#020617]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(99,102,241,0.34),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.28),transparent_26%),radial-gradient(circle_at_78%_72%,rgba(236,72,153,0.25),transparent_30%),radial-gradient(circle_at_30%_88%,rgba(56,189,248,0.18),transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute right-[-80px] top-8 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute bottom-[-100px] left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="rounded-[30px] border border-white/10 bg-white/5 px-3 py-3 shadow-[0_25px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group flex min-w-0 items-center gap-3 rounded-[24px] border border-white/10 bg-white/8 px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white/12"
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
                          Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/6 p-2 backdrop-blur-xl md:flex">
                      <a
                        href="#quarters"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Admin
                      </a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a
                        href="/cart"
                        className="rounded-2xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:bg-white/12"
                      >
                        Cart {cart.length}
                      </a>

                      <div className="rounded-2xl border border-pink-300/10 bg-pink-400/10 px-5 py-3 text-sm font-bold text-pink-100/90">
                        Likes {likedIds.length}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                      <a
                        href="/cart"
                        className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-white"
                      >
                        Cart {cart.length}
                      </a>
                      <div className="rounded-2xl border border-pink-300/10 bg-pink-400/10 px-3 py-2 text-xs font-bold text-pink-100/90">
                        {likedIds.length}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 md:hidden">
                    <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl">
                      <a
                        href="#quarters"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Files
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-20">
              <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
                <div>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Angel Glez COT Logo"
                      className="h-14 w-14 rounded-2xl border border-white/15 object-cover shadow-lg md:h-16 md:w-16"
                    />
                    <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur">
                      Ready-to-use files for teachers
                    </div>
                  </div>

                  <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
                    <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
                      Premium COT
                    </span>
                    <br />
                    <span className="text-white">learning materials</span>
                    <br />
                    <span className="text-4xl text-white/70 md:text-5xl">
                      for Kinder to Grade 6
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                    Organized by quarter and grade level. Clean files, clear thumbnails,
                    simple checkout, and instant digital delivery for your teaching needs.
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
                      Explore Products
                    </a>
                    <a
                      href="#quarters"
                      className="rounded-2xl border border-white/15 bg-white/6 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                    >
                      Browse Folders
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/60">
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                      Instant download
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                      Trusted by teachers
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                      Organized by grade and quarter
                    </span>
                  </div>

                  <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{products.length}</p>
                      <p className="mt-1 text-sm text-white/55">Products</p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{cart.length}</p>
                      <p className="mt-1 text-sm text-white/55">In Cart</p>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                      <p className="text-3xl font-black text-white">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-white/55">Likes</p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="rounded-[34px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
                    <div className="rounded-[30px] border border-white/10 bg-gradient-to-b from-white to-slate-100 p-5 shadow-[0_16px_60px_rgba(15,23,42,0.18)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">
                            Featured Preview
                          </p>
                          <h3 className="text-2xl font-black text-slate-900">
                            Teacher Marketplace
                          </h3>
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
                            style={{
                              animation: "cardFloatIn 0.7s ease",
                            }}
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
                                  <p className="text-xl font-black text-slate-900">
                                    {currentFeatured.title}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {currentFeatured.quarter || "No quarter"} •{" "}
                                    {currentFeatured.grade || "No grade"}
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
                                    featuredIndex === index
                                      ? "w-8 bg-violet-600"
                                      : "w-2.5 bg-slate-300"
                                  }`}
                                  aria-label={`Show featured product ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-[28px] bg-slate-50 p-10 text-center text-slate-500">
                          {loadingProducts
                            ? "Loading products..."
                            : "Upload products to show live previews here."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="quarters"
          className="relative mx-auto max-w-7xl px-4 py-16 md:px-6"
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
                Organized folders
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
                Browse by Quarter
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-white/55">
              Choose a quarter to reveal the matching grade folders and products.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {quarters.map((quarter, index) => {
              const previewItems = getQuarterPreviewProducts(products, quarter.label)
              const previewImage = previewItems[0]?.imageUrl
              const quarterCount = getQuarterCount(quarter.label)
              const isActive = selectedQuarter === quarter.label

              return (
                <button
                  key={quarter.code}
                  onClick={() => {
                    setSelectedQuarter(quarter.label)
                    setSelectedGrade(null)
                  }}
                  className="group text-center"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="relative mx-auto h-[255px] w-full max-w-[300px]">
                    <div
                      className={`absolute bottom-3 left-1/2 h-[158px] w-[272px] -translate-x-1/2 rounded-[30px] bg-amber-700/80 blur-[1px] transition-all duration-500 ${
                        isActive
                          ? "translate-y-1 scale-[1.02] opacity-100"
                          : "opacity-80 group-hover:translate-y-1 group-hover:scale-[1.02]"
                      }`}
                    />

                    <div
                      className={`absolute left-1/2 top-3 z-10 h-[128px] w-[182px] -translate-x-1/2 overflow-hidden rounded-[22px] border-[5px] border-white bg-white shadow-[0_20px_40px_rgba(15,23,42,0.20)] transition-all duration-500 ease-out ${
                        isActive
                          ? "-translate-y-4 rotate-[1.5deg] scale-[1.04]"
                          : "group-hover:-translate-y-4 group-hover:rotate-[1.5deg] group-hover:scale-[1.04]"
                      }`}
                    >
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={`${quarter.label} preview`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-bold text-slate-400">
                          Preview
                        </div>
                      )}
                    </div>

                    <div
                      className={`absolute bottom-0 left-1/2 z-20 h-[172px] w-[282px] -translate-x-1/2 rounded-[32px] border-[5px] border-yellow-300 bg-yellow-400 shadow-[0_18px_40px_rgba(251,191,36,0.24)] transition-all duration-500 ${
                        isActive
                          ? "-translate-y-2 scale-[1.03] shadow-[0_24px_55px_rgba(245,158,11,0.32)]"
                          : "group-hover:-translate-y-2 group-hover:scale-[1.03] group-hover:shadow-[0_24px_55px_rgba(245,158,11,0.28)]"
                      }`}
                    >
                      <div className="absolute left-5 top-0 h-9 w-16 rounded-t-[18px] bg-amber-700" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[26px] bg-white/10" />

                      <div className="flex h-full flex-col items-center justify-center px-4">
                        <span className="text-5xl font-black text-amber-900">
                          {quarter.code}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[180px] w-[292px] -translate-x-1/2 rounded-[34px] bg-yellow-300/30 blur-2xl" />
                    )}
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="text-2xl font-extrabold text-white">{quarter.label}</p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/75">
                        {quarterCount} {quarterCount === 1 ? "Product" : "Products"}
                      </span>

                      {isActive && (
                        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-violet-100">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {selectedQuarter && (
          <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.20)] backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100">
                      Selected quarter
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/75">
                      {getQuarterCount(selectedQuarter)} products
                    </span>
                  </div>

                  <h3 className="mt-2 text-3xl font-black text-white">{selectedQuarter}</h3>
                  <p className="mt-2 text-white/55">
                    Choose a grade folder to see all matching materials.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedQuarter(null)
                    setSelectedGrade(null)
                  }}
                  className="rounded-2xl border border-white/10 bg-white/8 px-5 py-3 font-bold text-white/85 transition hover:bg-white/12"
                >
                  Back to all quarters
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`rounded-[24px] border px-4 py-5 text-center font-bold transition-all duration-300 ${
                      selectedGrade === grade
                        ? "scale-[1.02] border-emerald-500 bg-emerald-500 text-white shadow-[0_12px_40px_rgba(16,185,129,0.32)]"
                        : "border-white/10 bg-white/6 text-white/80 hover:-translate-y-1 hover:bg-white/10"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="marketplace" className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
                  Storefront
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
                  Featured Products
                </h2>
                <p className="mt-2 text-white/55">
                  Clean, ready-to-use teaching files for Kinder to Grade 6.
                </p>
              </div>

              <a
                href="/cart"
                className="rounded-2xl px-5 py-3 font-bold text-white transition hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                  boxShadow: "0 18px 36px rgba(124,58,237,0.25)",
                }}
              >
                Go to Cart
              </a>
            </div>

            {loadingProducts ? (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.04] p-12 text-center text-white/60 backdrop-blur">
                Loading products...
              </div>
            ) : loadError ? (
              <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-12 text-center text-red-200">
                Failed to load products: {loadError}
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <h3 className="text-2xl font-black text-white">
                    {selectedQuarter ? selectedQuarter : "All Quarters"}{" "}
                    <span className="text-white/35">/</span>{" "}
                    {selectedGrade ? selectedGrade : "All Grades"}
                  </h3>
                  <p className="mt-1 text-white/55">
                    {selectedQuarter || selectedGrade
                      ? "Products inside the selected folder"
                      : "Showing all available products"}
                  </p>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.04] p-12 text-center text-white/60 backdrop-blur">
                    No products found.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-3 hover:scale-[1.02] hover:border-violet-300/20 hover:shadow-[0_30px_80px_rgba(139,92,246,0.28)]"
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                          <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-violet-400/10 via-fuchsia-300/5 to-cyan-300/10" />
                        </div>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="relative block w-full text-left"
                        >
                          <div className="relative overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-60 w-full items-center justify-center bg-slate-800 text-slate-400">
                                No image
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />

                            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow">
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
                              <h4 className="text-2xl font-black leading-tight text-white">
                                {product.title}
                              </h4>
                            </div>

                            {product.description && (
                              <p className="mb-4 line-clamp-2 text-sm leading-6 text-white/55">
                                {product.description}
                              </p>
                            )}

                            <div className="mb-4 flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/70">
                                {product.likes || 0} likes
                              </span>
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-100">
                                {product.sold || 0} sold
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/70">
                                {product.quarter || "No quarter"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-black text-white">
                                ₱{product.price}
                              </span>
                              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-white/70">
                                View Details
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="relative border-t border-white/10 px-5 pb-5 pt-4">
                          <div className="mb-5 flex items-center gap-3">
                            <button
                              onClick={() => toggleLike(product.id)}
                              className="group/heart flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 transition-all duration-200 hover:scale-110 hover:bg-white/12 active:scale-95"
                              aria-label="Like product"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className={`h-6 w-6 transition-all duration-200 ${
                                  hasLiked(product.id)
                                    ? "fill-pink-500 stroke-pink-500"
                                    : "fill-transparent stroke-white/55 group-hover/heart:stroke-pink-500"
                                } ${animatingHeart === product.id ? "scale-125" : ""}`}
                                strokeWidth="2"
                              >
                                <path d="M12 21s-6.716-4.35-9.193-8.154C.873 9.87 2.01 5.5 6.09 4.5c2.327-.57 4.172.53 5.11 2.09.938-1.56 2.783-2.66 5.11-2.09 4.08 1 5.217 5.37 3.283 8.346C18.716 16.65 12 21 12 21z" />
                              </svg>
                            </button>

                            <span className="text-sm font-semibold text-white/55">
                              {product.likes || 0}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {!hasPurchased(product.id) && (
                              <button
                                onClick={() => addToCart(product)}
                                className={`rounded-2xl px-4 py-2 font-bold text-white transition ${
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
                                className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
                              >
                                Download
                              </button>
                            ) : (
                              <button
                                onClick={() => buyNow(product)}
                                className="rounded-2xl bg-white px-4 py-2 font-bold text-slate-900 transition hover:bg-slate-100"
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
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      className="h-[260px] w-full object-cover md:h-[420px]"
                    />
                  ) : (
                    <div className="flex h-[260px] w-full items-center justify-center bg-slate-800 text-slate-400 md:h-[420px]">
                      No image
                    </div>
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
                </div>

                {isBestSeller(selectedProduct) && (
                  <div className="mb-5">
                    <span className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-950 shadow-lg">
                      Best Seller
                    </span>
                  </div>
                )}

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
                      <p className="text-4xl font-black text-white">
                        ₱{selectedProduct.price}
                      </p>
                    </div>

                    {hasPurchased(selectedProduct.id) ? (
                      <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-100">
                        Purchased
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-400/20 px-4 py-2 text-sm font-bold text-amber-100">
                        Ready to buy
                      </span>
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
                        className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
                      >
                        Download File
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
                  Payment will continue on the checkout page.
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

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  )
}

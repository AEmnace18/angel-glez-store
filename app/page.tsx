"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

const STORAGE_KEY = "angel-glez-products"
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
  fileDataUrl: string
  imageUrl: string
  likes?: number
  sold?: number
}

const getQuarterPreviewProducts = (products: Product[], quarterLabel: string) => {
  return products.filter((p) => p.quarter === quarterLabel).slice(0, 1)
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

  useEffect(() => {
    const savedProducts = localStorage.getItem(STORAGE_KEY)
    const savedPurchases = localStorage.getItem(PURCHASES_KEY)
    const savedCart = localStorage.getItem(CART_KEY)
    const savedLikes = localStorage.getItem(LIKES_KEY)

    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))
  }, [])

  const featuredProducts = products.slice(0, 5)

  useEffect(() => {
    if (featuredProducts.length <= 1) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) =>
        prev === featuredProducts.length - 1 ? 0 : prev + 1
      )
    }, 2500)

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
    if (!selectedQuarter || !selectedGrade) return []
    return products.filter(
      (product) =>
        product.quarter === selectedQuarter && product.grade === selectedGrade
    )
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

  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts))
  }

  const addToCart = (product: Product) => {
    if (cart.includes(product.id)) {
      toast("Already in cart", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    const updatedCart = [...cart, product.id]
    setCart(updatedCart)
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart))

    toast.success("Added to cart", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
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

    saveProducts(updatedProducts)
    setAnimatingHeart(productId)
    setTimeout(() => setAnimatingHeart(null), 260)
  }

  const buyNow = (product: Product) => {
    const existing = localStorage.getItem(PURCHASES_KEY)
    const purchaseIds = existing ? JSON.parse(existing) : []

    const alreadyPurchased = purchaseIds.includes(product.id)

    if (!alreadyPurchased) {
      const updatedPurchases = [...purchaseIds, product.id]
      localStorage.setItem(PURCHASES_KEY, JSON.stringify(updatedPurchases))
      setPurchases(updatedPurchases)

      const updatedProducts = products.map((item) => {
        if (item.id !== product.id) return item
        return {
          ...item,
          sold: (item.sold || 0) + 1,
        }
      })

      saveProducts(updatedProducts)
    }

    const updatedCart = cart.filter((id) => id !== product.id)
    setCart(updatedCart)
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart))

    toast.success("Payment successful! Download unlocked.", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  const downloadProduct = (product: Product) => {
    if (!hasPurchased(product.id)) {
      toast.error("Buy this product first to unlock download.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    const link = document.createElement("a")
    link.href = product.fileDataUrl
    link.download = product.fileName || `${product.title}.file`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Download started.", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  return (
    <>
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
          <div className="absolute -left-24 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
              <div className="mx-auto max-w-7xl">
                <div className="relative overflow-hidden rounded-[30px] border border-violet-200/30 bg-gradient-to-r from-indigo-950/90 via-violet-900/85 to-fuchsia-900/80 px-3 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl md:rounded-[34px] md:px-5 md:py-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.10),transparent_28%)]" />
                  <div className="absolute -left-8 top-2 h-24 w-24 rounded-full bg-cyan-300/10 blur-2xl" />
                  <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-fuchsia-300/10 blur-2xl" />

                  <div className="relative flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group brand-pill flex min-w-0 items-center gap-3 rounded-[24px] border border-white/15 bg-white/10 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/15"
                    >
                      <div className="relative shrink-0">
                        <div className="brand-logo-glow absolute inset-0 rounded-2xl bg-white/20 blur-md transition group-hover:bg-white/30" />
                        <img
                          src="/logo.png"
                          alt="Angel Glez COT Logo"
                          className="brand-logo relative h-12 w-12 rounded-2xl border border-white/30 object-cover shadow-md transition duration-300 group-hover:rotate-3 md:h-14 md:w-14"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="brand-title truncate text-base font-black tracking-tight text-white md:text-[1.7rem]">
                          ANGEL GLEZ&apos;s COT
                        </p>
                        <p className="truncate text-[11px] font-medium text-white/70 md:text-xs">
                          Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl md:flex">
                      <a
                        href="#quarters"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Admin
                      </a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a
                        href="/cart"
                        className="rounded-2xl border border-white/15 bg-white/12 px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)] backdrop-blur-xl transition hover:bg-white/18"
                      >
                        Cart {cart.length}
                      </a>

                      <div className="rounded-2xl border border-pink-300/20 bg-pink-400/10 px-5 py-3 text-sm font-bold text-pink-100 shadow-[0_10px_24px_rgba(236,72,153,0.10)] backdrop-blur-xl">
                        Likes {likedIds.length}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                      <a
                        href="/cart"
                        className="rounded-2xl border border-white/15 bg-white/12 px-3 py-2 text-xs font-bold text-white backdrop-blur-xl"
                      >
                        Cart {cart.length}
                      </a>

                      <div className="rounded-2xl border border-pink-300/20 bg-pink-400/10 px-3 py-2 text-xs font-bold text-pink-100 backdrop-blur-xl">
                        {likedIds.length}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-3 md:hidden">
                    <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-white/15 bg-white/8 p-2 backdrop-blur-xl">
                      <a
                        href="#quarters"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Quarters
                      </a>
                      <a
                        href="#marketplace"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Files
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
                      >
                        Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-24">
              <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Angel Glez COT Logo"
                      className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-lg"
                    />

                    <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/95 backdrop-blur">
                      Ready-to-use files for teachers
                    </div>
                  </div>

                  <h1 className="max-w-3xl text-5xl font-black leading-tight text-white md:text-6xl">
                    Premium COT learning materials for Kinder to Grade 6
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">
                    Organized by quarter and grade level. Clean files, clear thumbnails,
                    simple checkout, and instant digital delivery for your teaching needs.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <a
                      href="#marketplace"
                      className="rounded-2xl bg-white px-6 py-3 font-bold text-violet-700 shadow-xl hover:bg-slate-100"
                    >
                      Explore Products
                    </a>
                    <a
                      href="#quarters"
                      className="rounded-2xl border border-white/35 px-6 py-3 font-bold text-white hover:bg-white/10"
                    >
                      Browse Folders
                    </a>
                  </div>

                  <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                      <p className="text-2xl font-black text-white">{products.length}</p>
                      <p className="text-sm text-white/80">Products</p>
                    </div>
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                      <p className="text-2xl font-black text-white">{cart.length}</p>
                      <p className="text-sm text-white/80">In Cart</p>
                    </div>
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                      <p className="text-2xl font-black text-white">{likedIds.length}</p>
                      <p className="text-sm text-white/80">Likes</p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="rounded-[32px] border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
                    <div className="rounded-[28px] bg-white p-5 shadow-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured Preview</p>
                          <h3 className="text-2xl font-black text-slate-900">Teacher Marketplace</h3>
                        </div>
                        <div className="rounded-2xl bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700">
                          Live
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-slate-50 p-4">
                          <div
                            key={currentFeatured.id}
                            className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                            style={{
                              transformStyle: "preserve-3d",
                              animation: "cardFlipIn 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
                            }}
                          >
                            <div className="mb-4 overflow-hidden rounded-[22px]">
                              <img
                                src={currentFeatured.imageUrl}
                                alt={currentFeatured.title}
                                className="h-52 w-full object-cover"
                              />
                            </div>

                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-lg font-black leading-tight text-slate-900">
                                  {currentFeatured.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {currentFeatured.grade} • {currentFeatured.quarter}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-violet-600 px-3 py-2 text-sm font-bold text-white">
                                ₱{currentFeatured.price}
                              </div>
                            </div>

                            {isBestSeller(currentFeatured) && (
                              <div className="mb-3">
                                <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950">
                                  Best Seller
                                </span>
                              </div>
                            )}

                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {currentFeatured.likes || 0} likes
                              </span>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {currentFeatured.sold || 0} sold
                              </span>
                            </div>

                            {currentFeatured.description && (
                              <p className="line-clamp-2 text-sm text-slate-500">
                                {currentFeatured.description}
                              </p>
                            )}
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
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-[28px] bg-slate-50 p-8 text-center text-slate-500">
                          Upload products to show live previews here.
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
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                Organized folders
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight">Browse by Quarter</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              Hover each folder to preview what is inside. Click any quarter to reveal the matching grade folders and products.
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
                  className="quarter-folder group text-center"
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
                    <p className="text-2xl font-extrabold text-slate-900">{quarter.label}</p>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
                        {quarterCount} {quarterCount === 1 ? "Product" : "Products"}
                      </span>

                      {isActive && (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-violet-700">
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
            <div className="rounded-[32px] border border-slate-200 bg-white/75 p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-800">
                      Selected quarter
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
                      {getQuarterCount(selectedQuarter)} products
                    </span>
                  </div>

                  <h3 className="mt-2 text-3xl font-black">{selectedQuarter}</h3>
                  <p className="mt-2 text-slate-500">
                    Choose a grade folder to see all matching materials.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedQuarter(null)
                    setSelectedGrade(null)
                  }}
                  className="rounded-2xl border border-slate-300 bg-white/80 px-5 py-3 font-bold text-slate-700 backdrop-blur transition hover:bg-white hover:shadow-md"
                >
                  Back to all quarters
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {grades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`rounded-[24px] border px-4 py-5 text-center font-bold shadow-sm transition-all duration-300 ${
                      selectedGrade === grade
                        ? "scale-[1.02] border-emerald-600 bg-emerald-600 text-white shadow-lg"
                        : "border-slate-200 bg-white/70 text-slate-700 hover:-translate-y-1 hover:border-emerald-300 hover:bg-white hover:shadow-md"
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
          <div className="rounded-[32px] border border-white/40 bg-white/60 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                  Storefront
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight">Featured Products</h2>
                <p className="mt-2 text-slate-500">
                  Clean, ready-to-use teaching files for Kinder to Grade 6.
                </p>
              </div>

              <a
                href="/cart"
                className="rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
              >
                Go to Cart
              </a>
            </div>

            {selectedQuarter && selectedGrade ? (
              <>
                <div className="mb-6 rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur-xl">
                  <h3 className="text-2xl font-black">
                    {selectedQuarter} / {selectedGrade}
                  </h3>
                  <p className="mt-1 text-slate-500">
                    Products inside the selected folder
                  </p>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-500 backdrop-blur">
                    No products yet for this folder.
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="group relative overflow-hidden rounded-[30px] border border-white/60 bg-white/80 shadow-[0_16px_40px_rgba(15,23,42,0.07)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-violet-200/80 hover:shadow-[0_24px_70px_rgba(139,92,246,0.22)]"
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                          <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-violet-400/10 via-fuchsia-300/5 to-cyan-300/10" />
                        </div>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="relative block w-full text-left"
                        >
                          <div className="relative overflow-hidden">
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/25 to-transparent" />

                            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                              <div className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white shadow">
                                {product.grade}
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
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {product.likes || 0} likes
                              </span>
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {product.sold || 0} sold
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-black text-slate-900">
                                ₱{product.price}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                                View Details
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="relative border-t border-slate-100 px-5 pb-5 pt-4">
                          <div className="mb-5 flex items-center gap-3">
                            <button
                              onClick={() => toggleLike(product.id)}
                              className="group/heart flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95"
                              aria-label="Like product"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className={`h-6 w-6 transition-all duration-200 ${
                                  hasLiked(product.id)
                                    ? "fill-pink-500 stroke-pink-500"
                                    : "fill-transparent stroke-slate-400 group-hover/heart:stroke-pink-500"
                                } ${animatingHeart === product.id ? "scale-125" : ""}`}
                                strokeWidth="2"
                              >
                                <path d="M12 21s-6.716-4.35-9.193-8.154C.873 9.87 2.01 5.5 6.09 4.5c2.327-.57 4.172.53 5.11 2.09.938-1.56 2.783-2.66 5.11-2.09 4.08 1 5.217 5.37 3.283 8.346C18.716 16.65 12 21 12 21z" />
                              </svg>
                            </button>

                            <span className="text-sm font-semibold text-slate-500">
                              {product.likes || 0}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            {!hasPurchased(product.id) && (
                              <button
                                onClick={() => addToCart(product)}
                                className={`rounded-2xl px-4 py-2 font-bold text-white transition ${
                                  isInCart(product.id)
                                    ? "bg-slate-400"
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
                                className="rounded-2xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800"
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
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-500 backdrop-blur">
                Select a quarter folder and a grade folder to view products.
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.22s ease-out" }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/15 bg-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
            style={{ animation: "modalScaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5" />
            <div className="absolute -top-20 right-0 h-60 w-60 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="absolute -bottom-20 left-0 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl" />

            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Close modal"
            >
              ✕
            </button>

            <div className="relative grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    className="h-[260px] w-full object-cover md:h-[380px]"
                  />
                </div>
              </div>

              <div className="relative flex flex-col p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                    {selectedProduct.quarter}
                  </span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                    {selectedProduct.grade}
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

                <p className="mt-5 text-base leading-8 text-white/80">
                  {selectedProduct.description || "No description available for this product yet."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleLike(selectedProduct.id)}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur transition hover:scale-110 hover:bg-white/15"
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

                  <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80">
                    {selectedProduct.likes || 0} likes
                  </div>

                  <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                    {selectedProduct.sold || 0} sold
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white/60">Price</p>
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
                            ? "bg-slate-400"
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

                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-4 text-sm leading-7 text-white/65">
                  Instant access after purchase. Your file will be unlocked for download right away.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
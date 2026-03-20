"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const PURCHASES_KEY = "angel-glez-purchases"
const CART_KEY = "angel-glez-cart"
const LIKES_KEY = "angel-glez-likes"

const quarters = ["All", "Q1", "Q2", "Q3", "Q4"]
const grades = [
  "All",
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

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<number[]>([])
  const [cart, setCart] = useState<number[]>([])
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [animatingHeart, setAnimatingHeart] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [quarterFilter, setQuarterFilter] = useState("All")
  const [gradeFilter, setGradeFilter] = useState("All")
  const [sortBy, setSortBy] = useState("newest")

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

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false })

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProduct(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = selectedProduct ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedProduct])

  const displayedProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    let filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.grade.toLowerCase().includes(query) ||
        product.quarter.toLowerCase().includes(query)

      const matchesQuarter =
        quarterFilter === "All" ? true : product.quarter === quarterFilter

      const matchesGrade =
        gradeFilter === "All" ? true : product.grade === gradeFilter

      return matchesSearch && matchesQuarter && matchesGrade
    })

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price
      if (sortBy === "price-high") return b.price - a.price
      if (sortBy === "likes") return (b.likes || 0) - (a.likes || 0)
      if (sortBy === "sold") return (b.sold || 0) - (a.sold || 0)
      return b.id - a.id
    })

    return filtered
  }, [products, search, quarterFilter, gradeFilter, sortBy])

  const hasPurchased = (id: number) => purchases.includes(id)
  const isInCart = (id: number) => cart.includes(id)
  const hasLiked = (id: number) => likedIds.includes(id)
  const isBestSeller = (product: Product) => (product.sold || 0) >= 5

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
      <main className="min-h-screen bg-[linear-gradient(180deg,#ebe3d7_0%,#ddd2c3_16%,#d8d2e2_48%,#e4e8f0_100%)] text-slate-900">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(217,119,6,0.16),transparent_22%),radial-gradient(circle_at_78%_70%,rgba(100,116,139,0.18),transparent_28%),linear-gradient(180deg,rgba(236,230,220,0.98),rgba(219,210,197,0.97))]" />
          <div className="absolute inset-0 opacity-[0.32]" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)", backgroundSize: "46px 46px", maskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)" }} />
          <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="pointer-events-none absolute right-[-80px] top-8 h-96 w-96 rounded-full bg-amber-400/16 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="rounded-[28px] border border-white/70 bg-[rgba(255,252,248,0.82)] px-3 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-stone-200/80 bg-white/90 px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                    >
                      <img
                        src="/logo.png"
                        alt="Angel Glez COT Logo"
                        className="h-12 w-12 rounded-2xl border border-white object-cover shadow-lg md:h-14 md:w-14"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight text-slate-900 md:text-[1.7rem]">
                          ANGEL GLEZ&apos;s COT
                        </p>
                        <p className="truncate text-[11px] font-medium text-slate-500 md:text-xs">
                          Premium Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="hidden items-center gap-2 rounded-[22px] border border-stone-200/80 bg-white/88 p-2 md:flex">
                      <a href="/" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900">
                        Home
                      </a>
                      <a href="/shop" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                        Shop
                      </a>
                      <a href="/purchases" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900">
                        Purchases
                      </a>
                      <a href="/admin-login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900">
                        Admin
                      </a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a
                        href="/cart"
                        className="flex items-center gap-2 rounded-[18px] border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:bg-stone-50"
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>Cart {cart.length}</span>
                      </a>

                      <div className="flex items-center gap-2 rounded-[18px] border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-700">
                        <HeartIcon className="h-4 w-4" filled />
                        <span>{likedIds.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pb-20 md:pt-12">
              <div className="rounded-[34px] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                  <div>
                    <div className="inline-flex rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                      Premium teaching marketplace
                    </div>

                    <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
                      Browse all teaching files
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                      Save time with organized, classroom-ready teaching materials made for Kinder to Grade 6 teachers.
                    </p>

                    <div className="mt-8 grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title, grade, quarter..."
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      />

                      <select
                        value={quarterFilter}
                        onChange={(e) => setQuarterFilter(e.target.value)}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      >
                        {quarters.map((quarter) => (
                          <option key={quarter} value={quarter}>
                            {quarter === "All" ? "All Quarters" : quarter}
                          </option>
                        ))}
                      </select>

                      <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      >
                        {grades.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade === "All" ? "All Grades" : grade}
                          </option>
                        ))}
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="newest">Newest</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="likes">Most Liked</option>
                        <option value="sold">Best Selling</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{products.length}</p>
                      <p className="mt-1 text-sm text-slate-500">All Products</p>
                    </div>
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{cart.length}</p>
                      <p className="mt-1 text-sm text-slate-500">In Cart</p>
                    </div>
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Liked</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
          {loadError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-700">
              {loadError}
            </div>
          ) : loadingProducts ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[30px] border border-white/60 bg-white/70 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] animate-pulse">
                  <div className="h-64 rounded-[24px] bg-slate-200" />
                  <div className="mt-4 h-7 w-3/4 rounded bg-slate-200" />
                  <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
                  <div className="mt-6 h-12 rounded-2xl bg-slate-200" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/60 p-12 text-center text-slate-600">
              No products matched your filters.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,240,0.92))] shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_rgba(15,23,42,0.14)]"
                  style={{ animation: `cardReveal 0.55s cubic-bezier(.22,1,.36,1) ${index * 0.04}s both` }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.10),transparent_42%)]" />

                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="block w-full text-left"
                  >
                    <div className="relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/45 to-transparent" />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow">
                          {product.quarter || "No quarter"}
                        </span>
                        <span className="rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow">
                          {product.grade || "No grade"}
                        </span>
                      </div>

                      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                        {isBestSeller(product) && (
                          <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                            Best Seller
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 translate-y-3">
                        <span className="rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-slate-900 shadow">
                          View details
                        </span>
                        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white shadow">
                          ₱{product.price}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black leading-tight text-slate-900">
                            {product.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {product.description || "Clean and ready-to-use classroom material."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {product.likes || 0} likes
                        </span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {product.sold || 0} sold
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-stone-200/80 px-5 pb-5 pt-4">
                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={() => toggleLike(product.id)}
                        className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                          hasLiked(product.id)
                            ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[0_8px_16px_rgba(236,72,153,0.18)]"
                            : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[0_8px_16px_rgba(15,23,42,0.08)]"
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
                            isInCart(product.id) ? "bg-slate-500" : "bg-amber-500 hover:bg-amber-600"
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
                          className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
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
        </section>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.22s ease-out" }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]"
            style={{ animation: "modalScaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-4 top-4 z-20 flex items-center gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

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
                    className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                      hasLiked(selectedProduct.id)
                        ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[0_8px_16px_rgba(236,72,153,0.18)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[0_8px_16px_rgba(15,23,42,0.08)]"
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
                          isInCart(selectedProduct.id) ? "bg-slate-500" : "bg-amber-500 hover:bg-amber-600"
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

        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes heartPop {
          0% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(244,63,94,0)); }
          20% { transform: scale(1.18) translateY(-2px) rotate(-6deg); }
          45% { transform: scale(1.34) translateY(-4px) rotate(6deg); filter: drop-shadow(0 12px 22px rgba(244,63,94,0.28)); }
          70% { transform: scale(0.95) translateY(0) rotate(-2deg); }
          100% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 6px 12px rgba(244,63,94,0.14)); }
        }

        .heart-pop {
          animation: heartPop 0.5s cubic-bezier(.2,.9,.2,1);
        }

        .heart-press {
          transform-style: preserve-3d;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  )
}

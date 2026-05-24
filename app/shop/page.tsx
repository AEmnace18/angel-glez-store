"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { normalizeProductRows, type Product, type ProductRow } from "@/lib/product-row"

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

type PurchaseLookup = {
  id: string
  status: "pending" | "approved" | "rejected"
  products: {
    id: number
  } | null
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
  const [purchases, setPurchases] = useState<Record<number, string>>({})
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
    const savedCart = localStorage.getItem(CART_KEY)
    const savedLikes = localStorage.getItem(LIKES_KEY)
    const savedEmail = localStorage.getItem("angel-glez-buyer-email") || ""

    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))

    if (savedEmail) {
      apiJson<{ purchases: PurchaseLookup[] }>(
        `/api/purchases?buyerEmail=${encodeURIComponent(savedEmail)}`
      )
        .then(({ purchases: loadedPurchases }) => {
          const approvedPurchases = (loadedPurchases || []).reduce<Record<number, string>>((acc, purchase) => {
            if (purchase.status === "approved" && purchase.products?.id) {
              acc[Number(purchase.products.id)] = purchase.id
            }
            return acc
          }, {})

          setPurchases(approvedPurchases)
        })
        .catch(() => null)
    }
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true)
      setLoadError(null)

      try {
        const { products: productRows } = await apiJson<{ products: ProductRow[] }>("/api/products")
        setProducts(normalizeProductRows(productRows))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load products.")
      } finally {
        setLoadingProducts(false)
      }
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

  const hasPurchased = (id: number) => Boolean(purchases[id])
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

    const buyerEmail = localStorage.getItem("angel-glez-buyer-email") || ""
    const purchaseId = purchases[product.id]

    if (!buyerEmail || !purchaseId) {
      toast.error("Open your Purchases page to unlock this download.", { style: toastStyle })
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
          purchaseId,
          buyerEmail,
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
      <main className="shop-skeuo-page min-h-screen bg-[linear-gradient(180deg,#f2ecdf_0%,#e7dac8_30%,#ddd2e7_66%,#eef0f5_100%)] text-slate-900">
        <section className="shop-hero-section relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(217,119,6,0.16),transparent_22%),radial-gradient(circle_at_78%_70%,rgba(100,116,139,0.18),transparent_28%),linear-gradient(180deg,rgba(236,230,220,0.98),rgba(219,210,197,0.97))]" />
          <div className="absolute inset-0 opacity-[0.32]" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)", backgroundSize: "46px 46px", maskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)" }} />
          <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="pointer-events-none absolute right-[-80px] top-8 h-96 w-96 rounded-full bg-amber-400/16 blur-3xl" />

          <div className="relative">
            <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="skeuo-toolbar rounded-[28px] px-3 py-3 md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="skeuo-engraved-plaque group flex min-w-0 items-center gap-3 rounded-[22px] px-3 py-2.5 transition duration-300 hover:-translate-y-0.5"
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

                    <nav className="skeuo-nav-tray hidden items-center gap-2 rounded-[22px] p-2 md:flex">
                      <a
                        href="/#quarters"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="/#find-my-cot"
                        className="nav-pill rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                      >
                        Find My COT
                      </a>
                      <a
                        href="/shop"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
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
                    <div className="grid grid-cols-5 gap-2 rounded-[24px] border border-slate-200 bg-white/90 p-2">
                      <a
                        href="/#quarters"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Qtrs
                      </a>
                      <a
                        href="/#find-my-cot"
                        className="nav-pill rounded-2xl px-2 py-2 text-center text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                      >
                        Finder
                      </a>
                      <a
                        href="/shop"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Files
                      </a>
                      <a
                        href="/admin-login"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pb-20 md:pt-12">
              <div className="shop-hero-cabinet rounded-[34px] border border-white/60 bg-white/35 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                  <div>
                    <div className="shop-label-pill inline-flex rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                      Premium teaching marketplace
                    </div>

                    <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
                      Browse all teaching files
                    </h1>

                    <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                      Save time with organized, classroom-ready teaching materials made for Kinder to Grade 6 teachers.
                    </p>

                    <div className="shop-filter-shelf mt-8 grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title, grade, quarter..."
                        className="shop-control rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      />

                      <select
                        value={quarterFilter}
                        onChange={(e) => setQuarterFilter(e.target.value)}
                        className="shop-control rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
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
                        className="shop-control rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
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
                        className="shop-control rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                      >
                        <option value="newest">Newest</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="likes">Most Liked</option>
                        <option value="sold">Best Selling</option>
                      </select>
                    </div>
                  </div>

                  <div className="shop-stat-row grid grid-cols-3 gap-3">
                    <div className="shop-stat-card rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{products.length}</p>
                      <p className="mt-1 text-sm text-slate-500">All Products</p>
                    </div>
                    <div className="shop-stat-card rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{cart.length}</p>
                      <p className="mt-1 text-sm text-slate-500">In Cart</p>
                    </div>
                    <div className="shop-stat-card rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
                      <p className="text-3xl font-black text-slate-900">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Liked</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="shop-products-section mx-auto max-w-7xl px-4 pb-20 md:px-6">
          <div className="mb-5 flex items-center justify-between gap-4 rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,252,245,.92),rgba(236,223,201,.86))] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.92),0_14px_34px_rgba(87,64,39,.11)]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-violet-600">Product drawer</p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Teaching files ready to open</h2>
            </div>
            <span className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-black text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_8px_18px_rgba(74,54,34,.09)]">{displayedProducts.length} shown</span>
          </div>
          {loadError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 text-red-700">
              {loadError}
            </div>
          ) : loadingProducts ? (
            <div className="shop-product-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="shop-product-grid grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {displayedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="shop-product-card group relative overflow-hidden rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,245,240,0.92))] shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_80px_rgba(15,23,42,0.14)]"
                  style={{ animation: `cardReveal 0.55s cubic-bezier(.22,1,.36,1) ${index * 0.04}s both` }}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.10),transparent_42%)]" />

                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="block w-full text-left"
                  >
                    <div className="shop-image-frame relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={getProductImageSrc(product.imageUrl)}
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
                        <span className="shop-sticker rounded-full bg-white/92 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow">
                          {product.quarter || "No quarter"}
                        </span>
                        <span className="shop-sticker shop-sticker-purple rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow">
                          {product.grade || "No grade"}
                        </span>
                      </div>

                      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                        {isBestSeller(product) && (
                          <span className="shop-sticker shop-sticker-gold rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                            Best Seller
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 translate-y-3">
                        <span className="shop-view-pill rounded-full bg-white/90 px-3 py-2 text-xs font-bold text-slate-900 shadow">
                          View details
                        </span>
                        <span className="shop-price-pill rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white shadow">
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
                        <span className="shop-metric-pill rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {product.likes || 0} likes
                        </span>
                        <span className="shop-metric-pill shop-metric-green rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          {product.sold || 0} sold
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="shop-card-actions border-t border-stone-200/80 px-5 pb-5 pt-4">
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
                          className={`shop-add-button inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-bold text-white transition ${
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
                          className="shop-download-button rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                        >
                          {downloadingId === product.id ? "Preparing..." : "Download"}
                        </button>
                      ) : (
                        <button
                          onClick={() => buyNow(product)}
                          className="shop-buy-button rounded-2xl bg-slate-900 px-4 py-2 font-bold text-white transition hover:bg-slate-800"
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
            className="shop-modal-card relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]"
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
                <div className="shop-modal-image overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={getProductImageSrc(selectedProduct.imageUrl)}
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

                <div className="shop-price-box mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
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
                        className={`shop-add-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold text-white transition ${
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
                        className="shop-download-button rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {downloadingId === selectedProduct.id ? "Preparing..." : "Download File"}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyNow(selectedProduct)}
                        className="shop-buy-button rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
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


        /* Shop page skeuomorphism layer */
        .shop-skeuo-page {
          position: relative;
          background:
            radial-gradient(circle at 12% 8%, rgba(139,92,246,.16), transparent 24%),
            radial-gradient(circle at 88% 8%, rgba(245,158,11,.18), transparent 25%),
            linear-gradient(180deg, #f4eee3 0%, #e7dccd 38%, #ded8e8 68%, #eef0f5 100%) !important;
        }

        .shop-skeuo-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .22;
          background-image:
            linear-gradient(rgba(86, 65, 42, .10) 1px, transparent 1px),
            linear-gradient(90deg, rgba(86, 65, 42, .10) 1px, transparent 1px),
            radial-gradient(rgba(96, 70, 43, .18) .7px, transparent .7px);
          background-size: 44px 44px, 44px 44px, 8px 8px;
          mix-blend-mode: multiply;
        }

        .shop-nav-panel {
          background:
            linear-gradient(180deg, rgba(255,253,248,.96) 0%, rgba(248,241,230,.94) 56%, rgba(232,218,196,.92) 100%) !important;
          border-color: rgba(194,173,146,.62) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.98),
            inset 0 -8px 18px rgba(130,96,50,.09),
            0 2px 0 rgba(255,255,255,.70),
            0 18px 34px rgba(82,62,38,.16) !important;
        }

        .shop-brand-plaque,
        .shop-nav-tray,
        .shop-mini-button {
          background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(247,242,234,.94)) !important;
          border-color: rgba(205,190,169,.75) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.98),
            inset 0 -5px 12px rgba(80,60,40,.055),
            0 10px 22px rgba(69,52,33,.10) !important;
        }

        .shop-nav-tray {
          box-shadow:
            inset 0 2px 6px rgba(88,64,41,.10),
            inset 0 -1px 0 rgba(255,255,255,.90),
            0 10px 20px rgba(66,49,32,.08) !important;
        }

        .shop-nav-active {
          background: linear-gradient(180deg,#1c2942,#0b1324) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.18),
            inset 0 -7px 10px rgba(0,0,0,.22),
            0 8px 14px rgba(15,23,42,.18) !important;
        }

        .shop-heart-pill {
          background: linear-gradient(145deg,#fff7fb,#f1e6ff) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            inset 0 -8px 14px rgba(168,85,247,.10),
            0 10px 22px rgba(109,40,217,.11) !important;
        }

        .shop-hero-cabinet {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 80% 18%, rgba(255,255,255,.76), transparent 24%),
            linear-gradient(135deg, rgba(255,252,244,.94), rgba(229,215,192,.84)) !important;
          border: 1px solid rgba(211,193,165,.78) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.92),
            inset 0 -22px 36px rgba(112,81,45,.10),
            0 24px 58px rgba(80,59,38,.16) !important;
        }

        .shop-hero-cabinet::before {
          content: "";
          position: absolute;
          left: 28px;
          top: 0;
          width: 220px;
          height: 34px;
          border-radius: 0 0 22px 22px;
          background: linear-gradient(180deg,#fbd873,#ecc158);
          box-shadow: inset 0 -8px 14px rgba(146,94,24,.12), 0 10px 18px rgba(120,76,29,.12);
        }

        .shop-hero-cabinet::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .16;
          background-image: radial-gradient(rgba(91,64,35,.35) .8px, transparent .8px);
          background-size: 9px 9px;
        }

        .shop-label-pill,
        .shop-view-pill,
        .shop-metric-pill,
        .shop-sticker {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.9),
            inset 0 -3px 8px rgba(93,67,40,.07),
            0 8px 16px rgba(83,59,36,.10) !important;
        }

        .shop-filter-shelf {
          position: relative;
          border-radius: 26px;
          padding: 12px;
          background: linear-gradient(180deg,rgba(255,255,255,.34),rgba(223,207,180,.30));
          box-shadow:
            inset 0 2px 6px rgba(88,64,41,.09),
            inset 0 -1px 0 rgba(255,255,255,.76);
        }

        .shop-control {
          min-height: 52px;
          background: linear-gradient(180deg,#fffefd,#f2eee8) !important;
          border-color: rgba(200,183,158,.82) !important;
          box-shadow:
            inset 0 2px 6px rgba(93,66,38,.11),
            inset 0 -1px 0 rgba(255,255,255,.86),
            0 8px 16px rgba(76,55,34,.08) !important;
        }

        .shop-stat-card {
          background: linear-gradient(180deg,#fffdf9,#f1e8dc) !important;
          border-color: rgba(205,188,163,.72) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            inset 0 -10px 18px rgba(112,81,45,.075),
            0 18px 32px rgba(79,57,34,.13) !important;
        }

        .shop-products-section {
          position: relative;
          margin-top: -6px;
        }

        .shop-product-card {
          background:
            linear-gradient(180deg,rgba(255,252,246,.98),rgba(239,225,202,.96)) !important;
          border-color: rgba(201,181,151,.76) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.92),
            inset 0 -20px 30px rgba(121,83,39,.07),
            0 20px 38px rgba(77,55,34,.14) !important;
          transform-style: preserve-3d;
        }

        .shop-product-card::before {
          content: "";
          position: absolute;
          left: 20px;
          top: 0;
          width: 120px;
          height: 18px;
          border-radius: 0 0 16px 16px;
          background: linear-gradient(180deg,#ffe195,#e9bd57);
          box-shadow: inset 0 -5px 10px rgba(113,72,24,.12);
          z-index: 2;
        }

        .shop-product-card::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(115deg, rgba(255,255,255,.35), transparent 32%, rgba(116,78,33,.05));
          opacity: .65;
        }

        .shop-image-frame {
          margin: 16px 16px 0;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,.86);
          box-shadow:
            0 1px 0 rgba(255,255,255,.90),
            0 14px 26px rgba(53,39,25,.16),
            inset 0 0 0 8px rgba(255,255,255,.10);
        }

        .shop-image-frame img,
        .shop-image-frame > div:first-child {
          border-radius: 22px;
        }

        .shop-sticker-purple {
          background: linear-gradient(180deg,#9b5cff,#6d28d9) !important;
          color: #fff !important;
        }

        .shop-sticker-gold {
          background: linear-gradient(180deg,#fde68a,#f59e0b) !important;
        }

        .shop-price-pill,
        .shop-buy-button {
          background: linear-gradient(180deg,#1f2937,#091225) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.18),
            inset 0 -7px 12px rgba(0,0,0,.25),
            0 10px 18px rgba(15,23,42,.18) !important;
        }

        .shop-add-button {
          background: linear-gradient(180deg,#f8c153,#d97706) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.36),
            inset 0 -8px 12px rgba(120,53,15,.22),
            0 10px 18px rgba(146,64,14,.18) !important;
        }

        .shop-download-button {
          background: linear-gradient(180deg,#34d399,#059669) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.32),
            inset 0 -8px 12px rgba(6,95,70,.22),
            0 10px 18px rgba(4,120,87,.16) !important;
        }

        .shop-card-actions {
          background: linear-gradient(180deg,rgba(255,255,255,.42),rgba(230,213,186,.32));
          border-color: rgba(202,184,154,.62) !important;
        }

        .shop-modal-card {
          background: linear-gradient(180deg,#fffdf8,#f4eadc) !important;
          border-color: rgba(214,194,164,.82) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.95),
            inset 0 -16px 28px rgba(113,83,45,.08),
            0 34px 90px rgba(15,23,42,.30) !important;
        }

        .shop-modal-image,
        .shop-price-box {
          background: linear-gradient(180deg,#fffdf9,#efe5d6) !important;
          border-color: rgba(204,184,154,.72) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.92),
            inset 0 -12px 22px rgba(90,65,38,.08),
            0 16px 36px rgba(69,50,30,.14) !important;
        }

        @media (max-width: 768px) {
          .shop-hero-cabinet::before { width: 150px; }
          .shop-filter-shelf { padding: 8px; }
          .shop-stat-row { grid-template-columns: 1fr; }
        }

        /* Exact homepage navbar styling reused on the Shop page */
        header .skeuo-toolbar {
          overflow: hidden !important;
          border: 1px solid rgba(194, 173, 146, 0.62) !important;
          border-radius: 30px !important;
          background:
            linear-gradient(180deg, rgba(255,253,248,0.96) 0%, rgba(248,241,230,0.94) 56%, rgba(232,218,196,0.92) 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -8px 18px rgba(130,96,50,0.09),
            0 2px 0 rgba(255,255,255,0.70),
            0 18px 34px rgba(82,62,38,0.16) !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        header .skeuo-toolbar::before,
        header .skeuo-toolbar::after,
        header .skeuo-engraved-plaque::before,
        header .skeuo-engraved-plaque::after,
        header .skeuo-nav-tray::before,
        header .skeuo-nav-tray::after {
          content: none !important;
          display: none !important;
        }

        header .skeuo-toolbar > div:first-child {
          position: relative !important;
          z-index: 2 !important;
        }

        header .skeuo-engraved-plaque {
          border: 1px solid rgba(206,190,168,0.74) !important;
          border-radius: 22px !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,242,234,0.94)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -5px 12px rgba(80,60,40,0.055),
            0 10px 22px rgba(69,52,33,0.10) !important;
        }

        header .skeuo-engraved-plaque img {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.70),
            0 1px 0 rgba(255,255,255,0.92),
            0 8px 16px rgba(48,36,26,0.20) !important;
        }

        header .skeuo-nav-tray {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(199,177,150,0.62) !important;
          background:
            linear-gradient(180deg, rgba(238,226,208,0.76), rgba(255,251,244,0.78) 40%, rgba(255,255,255,0.70)) !important;
          -webkit-backdrop-filter: blur(12px) saturate(1.08) !important;
          backdrop-filter: blur(12px) saturate(1.08) !important;
          box-shadow:
            inset 0 3px 7px rgba(92,69,44,0.11),
            inset 0 -1px 0 rgba(255,255,255,0.82),
            0 1px 0 rgba(255,255,255,0.82),
            0 10px 22px rgba(71,50,29,0.08) !important;
        }

        header .skeuo-nav-tray .nav-link,
        header .skeuo-nav-tray .nav-pill {
          position: relative !important;
          z-index: 1 !important;
        }

        header .skeuo-nav-tray .nav-link {
          border: 1px solid transparent !important;
          background: transparent !important;
          color: rgb(51 65 85) !important;
          text-shadow: 0 1px 0 rgba(255,255,255,0.82) !important;
        }

        header .skeuo-nav-tray .nav-link:hover {
          color: rgb(15 23 42) !important;
          border-color: rgba(209,188,160,0.62) !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(242,235,224,0.76)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(151,114,66,0.08),
            0 7px 13px rgba(86,64,39,0.10) !important;
        }

        header .skeuo-nav-tray .nav-pill {
          border: 1px solid rgba(192,150,255,0.72) !important;
          background:
            radial-gradient(circle at 28% 8%, rgba(255,255,255,0.64), transparent 34%),
            linear-gradient(180deg, #a855f7 0%, #7c3aed 56%, #5b21b6 100%) !important;
          color: white !important;
          text-shadow: 0 1px 0 rgba(52,16,105,0.56) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.58),
            inset 0 -3px 0 rgba(54,17,99,0.24),
            0 2px 0 rgba(88,28,135,0.36),
            0 10px 22px rgba(124,58,237,0.26),
            0 0 28px rgba(168,85,247,0.18) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > a,
        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(214,196,170,0.72) !important;
          background:
            radial-gradient(circle at 28% 4%, rgba(255,255,255,0.95), transparent 38%),
            linear-gradient(180deg, rgba(255,255,255,0.88), rgba(240,232,219,0.80)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -2px 0 rgba(143,109,69,0.08),
            0 10px 18px rgba(78,56,35,0.12),
            0 1px 0 rgba(255,255,255,0.82) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          color: rgb(109 40 217) !important;
          background:
            radial-gradient(circle at 30% 6%, rgba(255,255,255,0.96), transparent 38%),
            radial-gradient(circle at 92% 92%, rgba(236,72,153,0.20), transparent 46%),
            linear-gradient(180deg, rgba(252,249,255,0.90), rgba(239,232,255,0.76)) !important;
        }

`}</style>
    </>
  )
}

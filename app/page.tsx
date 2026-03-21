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

type ReviewDraft = {
  rating: number
  count: number
}

type ReviewEntry = {
  id: string
  rating: number
  text: string
  author: string
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

function FolderShell({
  children,
  active = false,
  color = "amber",
  className = "",
}: {
  children: React.ReactNode
  active?: boolean
  color?: "amber" | "violet"
  className?: string
}) {
  const [style, setStyle] = useState({
    rotateX: 0,
    rotateY: 0,
    translateY: 0,
    glareX: 50,
    glareY: 50,
  })

  const palette =
    color === "amber"
      ? {
          shell:
            "border-[#e4bb69] bg-gradient-to-b from-[#ffd86b] via-[#f8c650] to-[#f1b63b]",
          tab:
            "border-[#deb15d] bg-gradient-to-b from-[#ffe188] to-[#f5c24a]",
          inner:
            "border-white/45 bg-white/28",
          shadow:
            "shadow-[0_18px_50px_rgba(245,158,11,0.16)]",
        }
      : {
          shell:
            "border-violet-200 bg-gradient-to-b from-violet-100 via-fuchsia-50 to-white",
          tab:
            "border-violet-200 bg-gradient-to-b from-violet-200 to-fuchsia-100",
          inner:
            "border-violet-100 bg-white/80",
          shadow:
            "shadow-[0_18px_50px_rgba(124,58,237,0.12)]",
        }

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = x / rect.width
    const py = y / rect.height

    setStyle({
      rotateX: (0.5 - py) * 10,
      rotateY: (px - 0.5) * 14,
      translateY: -8,
      glareX: px * 100,
      glareY: py * 100,
    })
  }

  const reset = () => {
    setStyle({
      rotateX: 0,
      rotateY: 0,
      translateY: 0,
      glareX: 50,
      glareY: 50,
    })
  }

  return (
    <div
      className={`group relative [perspective:1600px] ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-3 h-10 rounded-full bg-slate-900/10 blur-2xl transition duration-300 group-hover:scale-105"
        style={{ transform: `translateY(${active ? 10 : 16}px)` }}
      />
      <div
        className={`relative transition-transform duration-300 will-change-transform ${palette.shadow}`}
        style={{
          transform: `rotateX(${style.rotateX}deg) rotateY(${style.rotateY}deg) translateY(${style.translateY}px)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={`pointer-events-none absolute left-5 right-10 top-[-14px] h-11 rounded-t-[22px] border border-b-0 ${palette.tab} transition duration-300`}
          style={{
            transform: `translateZ(26px) rotateX(${active ? 18 : 30}deg) translateY(${active ? -7 : -3}px)`,
            transformOrigin: "bottom center",
          }}
        />
        <div
          className={`relative overflow-hidden rounded-[30px] border p-4 md:p-5 ${palette.shell}`}
          style={{ transform: "translateZ(0px)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background: `radial-gradient(circle at ${style.glareX}% ${style.glareY}%, rgba(255,255,255,0.55), transparent 34%)`,
            }}
          />
          <div className={`relative rounded-[24px] border p-4 md:p-5 ${palette.inner}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
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
  const [modalQuarter, setModalQuarter] = useState<string | null>(null)
  const [modalGrade, setModalGrade] = useState<string | null>(null)
  const [folderPulse, setFolderPulse] = useState<string | null>(null)
  const [folderWhoosh, setFolderWhoosh] = useState(false)
  const [productRatings, setProductRatings] = useState<Record<number, ReviewDraft>>({})
  const [productReviews, setProductReviews] = useState<Record<number, ReviewEntry[]>>({})
  const [reviewingProductId, setReviewingProductId] = useState<number | null>(null)
  const [hoveredStars, setHoveredStars] = useState(0)
  const [selectedStars, setSelectedStars] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [finderGrade, setFinderGrade] = useState("All Grades")
  const [finderQuarter, setFinderQuarter] = useState("All Quarters")
  const [finderSearch, setFinderSearch] = useState("")

  const triggerFolderFeel = (key: string) => {
    setFolderPulse(key)
    setFolderWhoosh(true)

    window.setTimeout(() => {
      setFolderPulse(null)
    }, 360)

    window.setTimeout(() => {
      setFolderWhoosh(false)
    }, 260)
  }

  const openQuarterFolder = (quarterLabel: string) => {
    triggerFolderFeel(`quarter-${quarterLabel}`)
    setSelectedQuarter(quarterLabel)
    setSelectedGrade(null)
    setModalQuarter(quarterLabel)
    setModalGrade(null)
  }

  const openGradeFolder = (gradeLabel: string) => {
    if (modalQuarter) {
      triggerFolderFeel(`grade-${modalQuarter}-${gradeLabel}`)
    }
    setSelectedGrade(gradeLabel)
    setModalGrade(gradeLabel)
  }

  useEffect(() => {
    const savedPurchases = localStorage.getItem(PURCHASES_KEY)
    const savedCart = localStorage.getItem(CART_KEY)
    const savedLikes = localStorage.getItem(LIKES_KEY)

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))
  }, [])

  useEffect(() => {
    const savedRatings = localStorage.getItem("angel-glez-ratings")
    if (savedRatings) {
      try {
        setProductRatings(JSON.parse(savedRatings))
      } catch {}
    }
  }, [])

  useEffect(() => {
    const savedReviews = localStorage.getItem("angel-glez-written-reviews")
    if (savedReviews) {
      try {
        setProductReviews(JSON.parse(savedReviews))
      } catch {}
    }
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedProduct) {
          setSelectedProduct(null)
          return
        }

        if (modalQuarter) {
          setModalQuarter(null)
          setModalGrade(null)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = selectedProduct || modalQuarter ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedProduct, modalQuarter])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchQuarter = selectedQuarter ? product.quarter === selectedQuarter : true
      const matchGrade = selectedGrade ? product.grade === selectedGrade : true
      return matchQuarter && matchGrade
    })
  }, [products, selectedQuarter, selectedGrade])

  const smartFinderResults = useMemo(() => {
    const keyword = finderSearch.trim().toLowerCase()

    return products
      .filter((product) => {
        const matchesGrade = finderGrade === "All Grades" ? true : product.grade === finderGrade
        const matchesQuarter =
          finderQuarter === "All Quarters" ? true : product.quarter === finderQuarter
        const matchesKeyword =
          keyword.length === 0
            ? true
            : [product.title, product.description, product.fileName, product.grade, product.quarter]
                .join(" ")
                .toLowerCase()
                .includes(keyword)

        return matchesGrade && matchesQuarter && matchesKeyword
      })
      .slice(0, 6)
  }, [products, finderGrade, finderQuarter, finderSearch])

  const openFinderProduct = (product: Product) => {
    setSelectedQuarter(product.quarter)
    setSelectedGrade(product.grade)
    setSelectedProduct(product)
  }

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

  const getRatingMeta = (productId: number) => {
    const saved = productRatings[productId]
    if (saved) return saved

    const baseRating = 4.5 + ((productId % 5) * 0.1)
    return {
      rating: Number(Math.min(5, baseRating).toFixed(1)),
      count: 8 + (productId % 11),
    }
  }

  const getRecentReviews = (productId: number) => {
    return productReviews[productId] || []
  }

  const submitReview = (productId: number) => {
    if (!selectedStars) {
      toast.error("Pick a star rating first.", { style: toastStyle })
      return
    }

    if (!reviewText.trim()) {
      toast.error("Write a short review first.", { style: toastStyle })
      return
    }

    const current = getRatingMeta(productId)
    const totalScore = current.rating * current.count + selectedStars
    const nextCount = current.count + 1
    const nextRating = Number((totalScore / nextCount).toFixed(1))

    const updatedRatings = {
      ...productRatings,
      [productId]: {
        rating: nextRating,
        count: nextCount,
      },
    }

    const nextReview = {
      id: `${productId}-${Date.now()}`,
      rating: selectedStars,
      text: reviewText.trim(),
      author: "Teacher",
    }

    const updatedReviews = {
      ...productReviews,
      [productId]: [nextReview, ...(productReviews[productId] || [])].slice(0, 5),
    }

    setProductRatings(updatedRatings)
    setProductReviews(updatedReviews)
    localStorage.setItem("angel-glez-ratings", JSON.stringify(updatedRatings))
    localStorage.setItem("angel-glez-written-reviews", JSON.stringify(updatedReviews))
    setReviewingProductId(null)
    setHoveredStars(0)
    setSelectedStars(0)
    setReviewText("")
    toast.success("Review added", { style: toastStyle })
  }

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
      <main className={`relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ebe3d7_0%,#ddd2c3_16%,#d8d2e2_48%,#e4e8f0_100%)] text-slate-900 transition duration-300 ${modalQuarter ? "scale-[0.985] blur-[2px]" : ""}`}>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(79,70,229,0.18),transparent_24%),radial-gradient(circle_at_84%_14%,rgba(217,119,6,0.16),transparent_22%),radial-gradient(circle_at_78%_70%,rgba(100,116,139,0.18),transparent_28%),linear-gradient(180deg,rgba(236,230,220,0.98),rgba(219,210,197,0.97))]" />
          <div className="absolute inset-0 opacity-[0.36]" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.07) 1px, transparent 1px)", backgroundSize: "46px 46px", maskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 88%)" }} />
          <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
          <div className="pointer-events-none absolute right-[-80px] top-8 h-96 w-96 rounded-full bg-amber-400/16 blur-3xl" />
          <div className="pointer-events-none absolute left-[6%] top-[16%] h-56 w-56 rounded-full bg-white/30 blur-3xl" />
          <div className="pointer-events-none absolute right-[10%] top-[22%] h-72 w-72 rounded-full bg-white/18 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.55),transparent_62%)]" />
          <div className="pointer-events-none absolute inset-x-[7%] top-[12%] h-[420px] rounded-[48px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.20),rgba(255,255,255,0.04))] shadow-[0_40px_120px_rgba(15,23,42,0.06)] backdrop-blur-[2px]" style={{ transform: "rotate(-3deg)" }} />
          <div className="pointer-events-none absolute right-[8%] top-[18%] h-[320px] w-[320px] rounded-[40px] border border-white/30 bg-[linear-gradient(135deg,rgba(99,102,241,0.10),rgba(255,255,255,0.04))] shadow-[0_30px_90px_rgba(79,70,229,0.08)]" style={{ transform: "rotate(9deg)" }} />

          <div className="relative">
            <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="rounded-[28px] border border-white/70 bg-[rgba(255,252,248,0.82)] px-3 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-stone-200/80 bg-white/90 px-3 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
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

                    <nav className="hidden items-center gap-2 rounded-[22px] border border-stone-200/80 bg-white/88 p-2 md:flex">
                      <a
                        href="#quarters"
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="/shop"
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
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
                        href="#quarters"
                        className="rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="/shop"
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

            <div className="mx-auto max-w-7xl px-4 pb-20 pt-36 md:px-6 md:pb-20 md:pt-40">
              <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Angel Glez COT Logo"
                      className="h-14 w-14 rounded-2xl border border-white object-cover shadow-lg md:h-16 md:w-16"
                    />
                    <div className="inline-flex rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                      Organized folders, secure delivery, classroom-ready files
                    </div>
                  </div>

                  <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-slate-900 md:text-7xl">
                    <span className="hero-line block">Ready-to-use COT files</span>
                    <span className="hero-line hero-accent-text block">
                      organized by quarter
                    </span>
                    <span className="hero-line hero-muted-line block text-4xl md:text-5xl">
                      then refined by grade level
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                    Built for busy teachers who need clean, classroom-ready files they can open, edit, and use right away. Find your quarter first, open the grade folder next, then access polished materials made for real classroom work.
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                    Save time on lesson preparation, stay organized every quarter, and teach with more confidence using files arranged the way teachers actually browse.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <a
                      href="#quarters"
                      className="rounded-[18px] border border-[#1e1b4b] bg-[#0f172a] px-6 py-3 font-bold text-white transition hover:scale-[1.03] hover:bg-[#131c31]"
                      style={{
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                      }}
                    >
                      Open Folder Library
                    </a>
                    <a
                      href="/shop"
                      className="rounded-[18px] border border-stone-200 bg-white px-6 py-3 font-bold text-slate-900 transition hover:bg-stone-50"
                    >
                      View Collection
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full border border-stone-200 bg-white px-4 py-2 shadow-sm">
                      Ready-to-edit files
                    </span>
                    <span className="rounded-full border border-stone-200 bg-white px-4 py-2 shadow-sm">
                      Organized for teachers
                    </span>
                    <span className="rounded-full border border-stone-200 bg-white px-4 py-2 shadow-sm">
                      Instant secure download
                    </span>
                  </div>

                  <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
                    <div className="rounded-[26px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,246,242,0.96))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                      <p className="text-3xl font-black text-slate-900">{products.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Teaching Files</p>
                    </div>
                    <div className="rounded-[26px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,246,242,0.96))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                      <p className="text-3xl font-black text-slate-900">{cart.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Saved in Cart</p>
                    </div>
                    <div className="rounded-[26px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,246,242,0.96))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
                      <p className="text-3xl font-black text-slate-900">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Teacher Likes</p>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="relative rounded-[34px] border border-stone-200/80 bg-[rgba(255,252,248,0.86)] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
                    <div className="pointer-events-none absolute inset-x-10 top-8 h-44 rounded-[32px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.14),transparent_65%)] blur-2xl" />
                    <div className="pointer-events-none absolute right-8 top-14 h-40 w-40 rounded-full bg-fuchsia-300/18 blur-3xl" />

                    <div className="relative rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#fffdfa_0%,#f7f4ef_100%)] p-5 shadow-[0_16px_50px_rgba(15,23,42,0.10)]">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured Preview</p>
                          <h3 className="text-2xl font-black text-slate-900">Teacher Marketplace</h3>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/90 px-3 py-2 text-sm font-bold text-violet-700 shadow-sm">
                          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
                          <span>Live</span>
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="rounded-[26px] bg-[linear-gradient(180deg,#f7f4ef_0%,#f3f4f7_100%)] p-4">
                          <div
                            key={currentFeatured.id}
                            onClick={() => setSelectedProduct(currentFeatured)}
                            className="group cursor-pointer overflow-hidden rounded-[30px] border border-stone-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.96))] shadow-[0_22px_58px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                            style={{ animation: "cardFloatIn 0.7s ease" }}
                          >
                            <div className="relative overflow-hidden p-4 pb-3">
                              <div className="pointer-events-none absolute inset-x-10 top-3 h-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.10),transparent_60%)] blur-2xl" />

                              <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                                {currentFeatured.imageUrl ? (
                                  <img
                                    src={currentFeatured.imageUrl}
                                    alt={currentFeatured.title}
                                    className="h-[290px] w-full object-cover transition duration-700 group-hover:scale-[1.045]"
                                  />
                                ) : (
                                  <div className="flex h-[290px] w-full items-center justify-center bg-slate-100 text-slate-400">
                                    No image
                                  </div>
                                )}

                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 via-slate-950/22 to-transparent" />

                                <div className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
                                  Featured Pick
                                </div>

                                <div className="absolute right-5 top-5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20">
                                  {currentFeatured.grade || "No grade"}
                                </div>

                                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                                        {currentFeatured.quarter || "No quarter"}
                                      </span>
                                      {isBestSeller(currentFeatured) && (
                                        <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-950">
                                          Best Seller
                                        </span>
                                      )}
                                    </div>

                                    <p className="line-clamp-2 max-w-[320px] text-[1.7rem] font-black leading-tight text-white drop-shadow-[0_10px_26px_rgba(15,23,42,0.34)]">
                                      {currentFeatured.title}
                                    </p>
                                  </div>

                                  <div className="shrink-0 rounded-full border border-white/25 bg-white/95 px-4 py-2.5 text-lg font-black text-slate-900 shadow-xl">
                                    ₱{currentFeatured.price}
                                  </div>
                                </div>

                                {featuredProducts.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFeaturedIndex((prev) =>
                                          prev === 0 ? featuredProducts.length - 1 : prev - 1
                                        )
                                      }}
                                      className="absolute left-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/72 text-slate-700 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white hover:shadow-[0_20px_34px_rgba(124,58,237,0.18)]"
                                      aria-label="Previous featured product"
                                    >
                                      ←
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFeaturedIndex((prev) =>
                                          prev === featuredProducts.length - 1 ? 0 : prev + 1
                                        )
                                      }}
                                      className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/72 text-slate-700 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white hover:shadow-[0_20px_34px_rgba(124,58,237,0.18)]"
                                      aria-label="Next featured product"
                                    >
                                      →
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="px-5 pb-5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                                    {currentFeatured.likes || 0} likes
                                  </span>
                                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    {currentFeatured.sold || 0} sold
                                  </span>
                                </div>

                                <div className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                                  Tap to preview
                                </div>
                              </div>

                              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                                {currentFeatured.description || "Clean and ready-to-use classroom material."}
                              </p>
                            </div>
                          </div>

                          {featuredProducts.length > 1 && (
                            <>
                              <div className="mt-4 grid grid-cols-3 gap-3">
                                {featuredProducts.slice(0, 3).map((product, index) => {
                                  const actualIndex = index
                                  const active = featuredIndex === actualIndex

                                  return (
                                    <button
                                      key={product.id}
                                      onClick={() => setFeaturedIndex(actualIndex)}
                                      className={`flex items-center gap-3 rounded-[22px] border p-3 text-left transition ${
                                        active
                                          ? "border-violet-300 bg-violet-50 shadow-[0_14px_32px_rgba(124,58,237,0.12)]"
                                          : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                                      }`}
                                    >
                                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-stone-200 bg-slate-100 shadow-sm">
                                        {product.imageUrl ? (
                                          <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                            No image
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="line-clamp-1 text-sm font-black text-slate-900">
                                          {product.title}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                            {product.grade}
                                          </span>
                                        </div>
                                        <p className="mt-1.5 text-sm font-black text-violet-700">₱{product.price}</p>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>

                              <div className="mt-4 flex items-center justify-center gap-2">
                                {featuredProducts.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setFeaturedIndex(index)}
                                    className={`h-2.5 rounded-full transition-all ${
                                      featuredIndex === index ? "w-10 bg-violet-600" : "w-2.5 bg-slate-300"
                                    }`}
                                    aria-label={`Show featured product ${index + 1}`}
                                  />
                                ))}
                              </div>
                            </>
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

        <section className="mx-auto -mt-4 max-w-7xl px-4 pb-6 md:px-6">
          <div className="overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(49,46,129,0.95)_55%,rgba(15,23,42,0.98))] p-5 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                  Find My COT
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                  Find the right classroom file in seconds
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
                  Match your lesson faster by filtering the library by grade, quarter, and keyword. Open the exact material you need without digging through folders one by one.
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {["Kinder", "Grade 1", "Grade 3", "Grade 6", "Q1", "Q4"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        if (chip.startsWith("Q")) {
                          setFinderQuarter(chip)
                        } else {
                          setFinderGrade(chip)
                        }
                      }}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/15"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl md:p-5">
                <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
                  <input
                    value={finderSearch}
                    onChange={(e) => setFinderSearch(e.target.value)}
                    placeholder="Search title, file name, or keyword"
                    className="rounded-2xl border border-white/10 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-400"
                  />

                  <select
                    value={finderGrade}
                    onChange={(e) => setFinderGrade(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/90 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400"
                  >
                    <option>All Grades</option>
                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>

                  <select
                    value={finderQuarter}
                    onChange={(e) => setFinderQuarter(e.target.value)}
                    className="rounded-2xl border border-white/10 bg-white/90 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-violet-400"
                  >
                    <option>All Quarters</option>
                    {quarters.map((quarter) => (
                      <option key={quarter.code} value={quarter.label}>
                        {quarter.label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => document.getElementById("find-my-cot-results")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:scale-[1.02]"
                  >
                    Find My COT
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/80">
                    {smartFinderResults.length} {smartFinderResults.length === 1 ? "match" : "matches"} found
                  </p>

                  <button
                    onClick={() => {
                      setFinderSearch("")
                      setFinderGrade("All Grades")
                      setFinderQuarter("All Quarters")
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/15"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </div>

            <div id="find-my-cot-results" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {smartFinderResults.length > 0 ? (
                smartFinderResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => openFinderProduct(product)}
                    className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/95 text-left shadow-[0_18px_40px_rgba(15,23,42,0.14)] transition hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(15,23,42,0.20)]"
                  >
                    <div className="relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
                        {product.quarter}
                      </div>

                      <div className="absolute right-4 top-4 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                        {product.grade}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="line-clamp-2 text-lg font-black text-slate-900">
                          {product.title}
                        </h3>
                        <span className="shrink-0 text-xl font-black text-violet-700">
                          ₱{product.price}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {product.description || product.fileName || "Classroom-ready file."}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {product.likes || 0} likes
                          </span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            {product.sold || 0} sold
                          </span>
                        </div>

                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                          Open
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="md:col-span-2 xl:col-span-3 rounded-[26px] border border-dashed border-white/15 bg-white/10 p-8 text-center">
                  <p className="text-lg font-bold text-white">No exact match yet</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Try a different grade, quarter, or keyword to find nearby classroom-ready files.
                  </p>
                </div>
              )}
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
              Keep your quarter folders. Hover each folder to feel the lid lift, the body tilt, and the surface catch light like a real folder before you open it.
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
                  onClick={() => openQuarterFolder(quarter.label)}
                  className={`text-left transition-transform duration-200 ${folderPulse === `quarter-${quarter.label}` ? "folder-click-bounce" : ""}`}
                >
                  <FolderShell active={isActive} color="amber">
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

                    <div className="rounded-[24px] bg-white/30 p-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
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
                  </FolderShell>
                </button>
              )
            })}
          </div>
        </section>

        
      </main>

      
      {modalQuarter && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/30 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.24s ease-out" }}
          onClick={() => {
            setModalQuarter(null)
            setModalGrade(null)
          }}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/70 bg-white/82 shadow-[0_36px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl [perspective:1800px]"
            style={{ animation: "folderPanelIn 0.34s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {folderWhoosh && (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                <div className="folder-whoosh absolute inset-y-0 -left-1/3 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)]" />
              </div>
            )}
            <div
              className="pointer-events-none absolute left-10 right-24 top-0 z-10 h-10 rounded-b-[20px] border border-violet-200/70 border-t-0 bg-gradient-to-b from-violet-200 via-fuchsia-100 to-violet-50 opacity-95 shadow-[0_10px_24px_rgba(124,58,237,0.14)]"
              style={{
                transformOrigin: "top center",
                transform: "translateZ(24px)",
                animation: "folderFlapOpen 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            <div className="relative flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-5 pb-4 pt-7 md:px-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">Open Folder</span>
                  <span>{modalQuarter}</span>
                  {modalGrade && (
                    <>
                      <span>/</span>
                      <span>{modalGrade}</span>
                    </>
                  )}
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
                  {modalGrade ? `${modalGrade} Files` : `${modalQuarter} Grade Folders`}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {modalGrade
                    ? "Browse the files inside this grade folder."
                    : "Choose a grade folder to reveal the files inside."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {modalGrade && (
                  <button
                    onClick={() => setModalGrade(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to Grades
                  </button>
                )}
                <button
                  onClick={() => {
                    setModalQuarter(null)
                    setModalGrade(null)
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Close folder modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto px-5 py-5 md:px-8 md:py-7" style={{ animation: "folderContentsIn 0.42s ease-out" }}>
              {!modalGrade ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {grades.map((grade) => {
                    const gradeCount = getGradeCount(modalQuarter, grade)
                    const preview = getGradePreviewProducts(products, modalQuarter, grade)[0]

                    return (
                      <button
                        key={grade}
                        onClick={() => openGradeFolder(grade)}
                        className={`text-left transition-transform duration-200 ${folderPulse === `grade-${modalQuarter}-${grade}` ? "folder-click-bounce" : ""}`}
                      >
                        <FolderShell color="violet" className="h-full">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h4 className="text-xl font-black text-slate-900">{grade}</h4>
                            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                              Open
                            </span>
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
                        </FolderShell>
                      </button>
                    )
                  })}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                  No files found inside this folder.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
                    >
                      <button
                        onClick={() => {
                          setModalQuarter(null)
                          setModalGrade(null)
                          setSelectedProduct(product)
                        }}
                        className="block w-full text-left"
                      >
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
                            className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
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
            </div>
          </div>
        </div>
      )}
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
                onClick={() => {
                  if (selectedProduct?.quarter) {
                    setSelectedQuarter(selectedProduct.quarter)
                    setModalQuarter(selectedProduct.quarter)
                  }

                  if (selectedProduct?.grade) {
                    setSelectedGrade(selectedProduct.grade)
                    setModalGrade(selectedProduct.grade)
                    triggerFolderFeel(`grade-${selectedProduct.quarter}-${selectedProduct.grade}`)
                  }

                  setSelectedProduct(null)
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Folder
              </button>

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

                <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
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
                    className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
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

                <div className="mt-5 overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,#fdfbff_0%,#f6f1ff_100%)] shadow-[0_16px_38px_rgba(124,58,237,0.10)]">
                  <div className="border-b border-violet-100/80 px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                          Teacher Reviews
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Trusted classroom feedback from buyers and fellow teachers
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setReviewingProductId(selectedProduct.id)
                          setHoveredStars(0)
                        }}
                        className="rounded-2xl border border-violet-200 bg-white/90 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"
                      >
                        Write a Review
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 px-5 py-5 md:grid-cols-[auto_1fr] md:px-6">
                    <div className="min-w-[130px] rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(15,23,42,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Average
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-5xl font-black leading-none text-slate-900">
                          {getRatingMeta(selectedProduct.id).rating.toFixed(1)}
                        </span>
                        <span className="pb-1 text-sm font-bold text-slate-400">/ 5</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-2xl">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <span
                              key={index}
                              className={index < Math.round(getRatingMeta(selectedProduct.id).rating) ? "text-amber-400" : "text-slate-300"}
                            >
                              ★
                            </span>
                          ))}
                        </div>

                        <div className="rounded-full border border-violet-200 bg-white/85 px-3 py-1.5 text-sm font-bold text-slate-700">
                          {getRatingMeta(selectedProduct.id).count} teacher reviews
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          Classroom-ready
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                          Easy to use
                        </span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                          Teacher-approved
                        </span>
                      </div>

                      {getRecentReviews(selectedProduct.id).length > 0 && (
                        <div className="mt-5 grid gap-3">
                          {getRecentReviews(selectedProduct.id).slice(0, 2).map((review) => (
                            <div
                              key={review.id}
                              className="rounded-[20px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-800">{review.author}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <span
                                      key={index}
                                      className={index < review.rating ? "text-amber-400" : "text-slate-300"}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-slate-500">{review.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

      {reviewingProductId && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md"
          onClick={() => {
            setReviewingProductId(null)
            setHoveredStars(0)
            setSelectedStars(0)
            setReviewText("")
          }}
        >
          <div
            className="w-full max-w-lg rounded-[30px] border border-white bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Write a Review</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Share your classroom feedback</h3>
              </div>
              <button
                onClick={() => {
                  setReviewingProductId(null)
                  setHoveredStars(0)
                  setSelectedStars(0)
                  setReviewText("")
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-500">Your rating</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const star = index + 1
                  const active = star <= (hoveredStars || selectedStars)
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredStars(star)}
                      onMouseLeave={() => setHoveredStars(0)}
                      onClick={() => setSelectedStars(star)}
                      className={`text-4xl transition hover:scale-110 ${active ? "text-amber-400" : "text-slate-300"}`}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-500">Your short review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Example: Easy to use and very clean layout for classroom discussion."
                className="mt-3 min-h-[120px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setReviewingProductId(null)
                  setHoveredStars(0)
                  setSelectedStars(0)
                  setReviewText("")
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReview(reviewingProductId)}
                className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
              >
                Submit Review
              </button>
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

        @keyframes folderPanelIn {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        
        @keyframes folderFlapOpen {
          from {
            opacity: 0.5;
            transform: perspective(1800px) rotateX(-76deg) translateY(-12px) translateZ(24px);
          }
          to {
            opacity: 0.95;
            transform: perspective(1800px) rotateX(0deg) translateY(0) translateZ(24px);
          }
        }

        @keyframes folderContentsIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroLineReveal {
          0% {
            opacity: 0;
            transform: translateY(26px);
            filter: blur(8px);
          }
          8% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          82% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(26px);
            filter: blur(8px);
          }
        }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes heroGradientShift {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .hero-line {
          opacity: 0;
          will-change: transform, opacity, filter;
          animation-name: heroLineReveal;
          animation-duration: 5s;
          animation-timing-function: cubic-bezier(.22,1,.36,1);
          animation-iteration-count: infinite;
        }

        .hero-line:nth-child(1) {
          animation-delay: 0.06s;
        }

        .hero-line:nth-child(2) {
          animation-delay: 0.22s;
        }

        .hero-line:nth-child(3) {
          animation-delay: 0.38s;
        }

        .hero-accent-text {
          background-image: linear-gradient(90deg, #1e1b4b, #4338ca, #7c3aed, #1e1b4b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation:
            heroLineReveal 5s cubic-bezier(.22,1,.36,1) infinite,
            heroGradientShift 7s linear infinite;
        }

        .hero-muted-line {
          color: rgb(100 116 139);
        }

        .premium-grid-fade {
          background-image: linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0));
        }

@keyframes heartPop {
          0% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(244,63,94,0)); }
          20% { transform: scale(1.18) translateY(-2px) rotate(-6deg); }
          45% { transform: scale(1.34) translateY(-4px) rotate(6deg); filter: drop-shadow(0 12px 22px rgba(244,63,94,0.28)); }
          70% { transform: scale(0.95) translateY(0) rotate(-2deg); }
          100% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 6px 12px rgba(244,63,94,0.14)); }
        }


        @keyframes folderClickBounce {
          0% { transform: scale(1); }
          35% { transform: scale(1.035) translateY(-4px); }
          70% { transform: scale(0.992); }
          100% { transform: scale(1); }
        }

        @keyframes folderWhoosh {
          0% {
            opacity: 0;
            transform: translateX(0) skewX(-18deg);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(240%) skewX(-18deg);
          }
        }

        .folder-click-bounce {
          animation: folderClickBounce 0.34s cubic-bezier(.22,1,.36,1);
        }

        .folder-whoosh {
          animation: folderWhoosh 0.42s cubic-bezier(.22,1,.36,1);
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

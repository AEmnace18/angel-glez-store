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
  const [isFeaturedPaused, setIsFeaturedPaused] = useState(false)

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
    if (featuredProducts.length <= 1 || isFeaturedPaused) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1))
    }, 4200)

    return () => clearInterval(interval)
  }, [featuredProducts.length, isFeaturedPaused])

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
                    <div className="grid grid-cols-4 gap-2 rounded-[24px] border border-slate-200 bg-white/90 p-2">
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
                  <div
                    className="featured-shell group relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(145deg,rgba(255,253,250,0.82),rgba(248,244,238,0.72))] p-5 shadow-[0_26px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition duration-500 hover:-translate-y-2"
                    onMouseEnter={() => setIsFeaturedPaused(true)}
                    onMouseLeave={() => setIsFeaturedPaused(false)}
                  >
                    <div className="pointer-events-none absolute -right-10 top-8 h-44 w-44 rounded-full bg-violet-300/18 blur-3xl" />
                    <div className="pointer-events-none absolute -left-8 bottom-8 h-40 w-40 rounded-full bg-amber-300/18 blur-3xl" />
                    <div className="pointer-events-none absolute inset-0 opacity-70 [background:linear-gradient(135deg,rgba(255,255,255,0.38),transparent_34%,transparent_66%,rgba(124,58,237,0.06))]" />

                    <div className="relative rounded-[30px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,243,236,0.95))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_54px_rgba(15,23,42,0.10)]">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured Preview</p>
                          <h3 className="text-[1.9rem] font-black tracking-tight text-slate-900">Teacher Marketplace</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
                            <span className="h-2.5 w-2.5 rounded-full bg-violet-500 featured-live-dot" />
                            Live
                          </div>
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#f5f0e8_0%,#eff2f7_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                          <div className="relative">
                            {featuredProducts.length > 1 && (
                              <>
                                <button
                                  onClick={() =>
                                    setFeaturedIndex((prev) =>
                                      prev === 0 ? featuredProducts.length - 1 : prev - 1
                                    )
                                  }
                                  className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white"
                                  aria-label="Previous featured product"
                                >
                                  ←
                                </button>
                                <button
                                  onClick={() =>
                                    setFeaturedIndex((prev) =>
                                      prev === featuredProducts.length - 1 ? 0 : prev + 1
                                    )
                                  }
                                  className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white"
                                  aria-label="Next featured product"
                                >
                                  →
                                </button>
                              </>
                            )}

                            <button
                              key={currentFeatured.id}
                              onClick={() => setSelectedProduct(currentFeatured)}
                              className="featured-main-card group/card relative block w-full overflow-hidden rounded-[26px] border border-stone-200 bg-white text-left shadow-[0_22px_60px_rgba(15,23,42,0.12)] transition duration-500 hover:-translate-y-1"
                              style={{ animation: "featuredCardIn 0.65s cubic-bezier(0.22, 1, 0.36, 1)" }}
                            >
                              <div className="absolute inset-0 opacity-0 transition duration-500 group-hover/card:opacity-100 [background:linear-gradient(135deg,rgba(124,58,237,0.06),transparent_35%,rgba(251,191,36,0.06))]" />
                              <div className="relative overflow-hidden p-4 pb-0">
                                <div className="relative overflow-hidden rounded-[24px] bg-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                                  {currentFeatured.imageUrl ? (
                                    <img
                                      src={currentFeatured.imageUrl}
                                      alt={currentFeatured.title}
                                      className="h-64 w-full object-cover transition duration-700 group-hover/card:scale-[1.04]"
                                    />
                                  ) : (
                                    <div className="flex h-64 w-full items-center justify-center bg-slate-100 text-slate-400">
                                      No image
                                    </div>
                                  )}

                                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/50 via-slate-950/15 to-transparent" />

                                  <div className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/88 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow">
                                    Featured Pick
                                  </div>

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

                                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                                    <div className="rounded-[18px] border border-white/20 bg-slate-950/35 px-4 py-3 text-white shadow backdrop-blur-md">
                                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                                        {currentFeatured.quarter || "No quarter"}
                                      </p>
                                      <p className="mt-1 text-base font-black">{currentFeatured.title}</p>
                                    </div>
                                    <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-lg">
                                      ₱{currentFeatured.price}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="relative p-5 pt-4">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                    {currentFeatured.likes || 0} likes
                                  </span>
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                    {currentFeatured.sold || 0} sold
                                  </span>
                                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                    Tap to preview
                                  </span>
                                </div>

                                <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                                  {currentFeatured.description || "Clean and ready-to-use classroom material."}
                                </p>
                              </div>
                            </button>
                          </div>

                          {featuredProducts.length > 1 && (
                            <div className="mt-4 grid grid-cols-3 gap-3">
                              {featuredProducts.slice(0, 3).map((item, index) => {
                                const actualIndex = index
                                const active = featuredIndex === actualIndex
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => setFeaturedIndex(actualIndex)}
                                    className={`overflow-hidden rounded-[18px] border text-left transition duration-300 ${
                                      active
                                        ? "scale-[1.02] border-violet-300 bg-white shadow-[0_14px_34px_rgba(124,58,237,0.16)]"
                                        : "border-stone-200 bg-white/85 hover:-translate-y-1 hover:border-stone-300"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 p-2.5">
                                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-slate-100">
                                        {item.imageUrl ? (
                                          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-slate-400">
                                            No image
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900">{item.title}</p>
                                        <p className="mt-1 text-xs text-slate-500">{item.grade || "No grade"}</p>
                                        <p className="mt-1 text-xs font-bold text-violet-700">₱{item.price}</p>
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {featuredProducts.length > 1 && (
                            <div className="mt-4 flex justify-center gap-2">
                              {featuredProducts.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setFeaturedIndex(index)}
                                  className={`h-2.5 rounded-full transition-all ${
                                    featuredIndex === index ? "w-9 bg-violet-600" : "w-2.5 bg-slate-300"
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

        @keyframes featuredCardIn {
          from {
            opacity: 0;
            transform: translateY(22px) scale(0.975);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes featuredLivePulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(139,92,246,0.35);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 0 10px rgba(139,92,246,0);
          }
        }

        .featured-live-dot {
          animation: featuredLivePulse 1.9s ease-in-out infinite;
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

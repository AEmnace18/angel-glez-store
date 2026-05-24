"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { normalizeProductRows, type Product, type ProductRow } from "@/lib/product-row"
import { HomepageThemeStyles, StoreHeader } from "@/components/homepage-theme"

const CART_KEY = "angel-glez-cart"
const MAX_PROOF_SIZE = 1024 * 1024

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

const buttonPress =
  "cg-pressable focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:pointer-events-none disabled:opacity-60"

const cardLift = "cg-card-lift"

const inputClass =
  "w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 outline-none transition-all duration-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"

function PremiumStyleLayer() {
  return (
    <style>{`
      @keyframes cgSoftPop {
        0% {
          opacity: 0;
          transform: translateY(10px) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes cgSlideUp {
        0% {
          opacity: 0;
          transform: translateY(18px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes cgSelectedPulse {
        0% {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.38);
        }
        70% {
          box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
        }
      }

      @keyframes cgShimmerMove {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(120%);
        }
      }

      @keyframes cgFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }

      @keyframes cgSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .cg-slide-up {
        animation: cgSlideUp 420ms ease-out both;
      }

      .cg-soft-pop {
        animation: cgSoftPop 280ms ease-out both;
      }

      .cg-selected-pulse {
        animation: cgSelectedPulse 720ms ease-out;
      }

      .cg-float {
        animation: cgFloat 4.8s ease-in-out infinite;
      }

      .cg-spin {
        animation: cgSpin 800ms linear infinite;
      }

      .cg-pressable {
        transition:
          transform 180ms ease,
          box-shadow 220ms ease,
          border-color 220ms ease,
          background-color 220ms ease,
          color 220ms ease,
          filter 220ms ease;
      }

      .cg-pressable:hover {
        transform: translateY(-2px);
      }

      .cg-pressable:active {
        transform: translateY(0) scale(0.97);
      }

      .cg-card-lift {
        transition:
          transform 260ms ease,
          box-shadow 260ms ease,
          border-color 260ms ease,
          background-color 260ms ease;
      }

      .cg-card-lift:hover {
        transform: translateY(-4px);
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.12);
      }

      .cg-shimmer {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .cg-shimmer::before {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-120%);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.42),
          transparent
        );
        animation: cgShimmerMove 1.9s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .cg-slide-up,
        .cg-soft-pop,
        .cg-selected-pulse,
        .cg-float,
        .cg-spin,
        .cg-shimmer::before {
          animation: none !important;
        }

        .cg-pressable,
        .cg-card-lift {
          transition: none !important;
        }

        .cg-pressable:hover,
        .cg-card-lift:hover,
        .cg-pressable:active {
          transform: none !important;
        }
      }
    `}</style>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const directProductId = Number(searchParams.get("productId") || 0)
  const [products, setProducts] = useState<Product[]>([])
  const [cartIds, setCartIds] = useState<number[]>([])
  const [buyerName, setBuyerName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [selectedQR, setSelectedQR] = useState(1)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY)

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed)) setCartIds(parsed)
      } catch {
        localStorage.setItem(CART_KEY, JSON.stringify([]))
      }
    }

    const loadProducts = async () => {
      try {
        const { products: productRows } = await apiJson<{ products: ProductRow[] }>("/api/products")
        setProducts(normalizeProductRows(productRows))
      } catch (error) {
        console.warn("Handled client error:", error instanceof Error ? error.message : error)
        toast.error(error instanceof Error ? error.message : "Failed to load products", { style: toastStyle })
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [])

  const checkoutProducts = useMemo(() => {
    if (directProductId) {
      return products.filter((product) => product.id === directProductId)
    }

    return products.filter((product) => cartIds.includes(product.id))
  }, [products, cartIds, directProductId])

  const total = useMemo(() => {
    return checkoutProducts.reduce((sum, product) => sum + Number(product.price), 0)
  }, [checkoutProducts])

  const totalItems = checkoutProducts.length

  const confirmPayment = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Please enter your name and email.", { style: toastStyle })
      return
    }

    if (!proofFile) {
      toast.error("Please upload proof of payment.", { style: toastStyle })
      return
    }

    if (proofFile.size > MAX_PROOF_SIZE) {
      toast.error("Proof image must be under 1MB.", { style: toastStyle })
      return
    }

    if (checkoutProducts.length === 0) {
      toast.error("No items in checkout.", { style: toastStyle })
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append("buyerName", buyerName)
      formData.append("buyerEmail", buyerEmail)
      formData.append("productIds", JSON.stringify(checkoutProducts.map((product) => product.id)))
      formData.append("proof", proofFile)

      await apiJson<{ purchases: Array<{ id: string }> }>("/api/checkout", {
        method: "POST",
        body: formData,
      })

      localStorage.setItem("angel-glez-buyer-email", buyerEmail)

      if (!directProductId) {
        localStorage.setItem(CART_KEY, JSON.stringify([]))
        setCartIds([])
      }

      setBuyerName("")
      setBuyerEmail("")
      setProofFile(null)

      toast.success("Payment submitted. Please wait for verification.", {
        style: toastStyle,
      })

      setTimeout(() => {
        window.location.href = "/purchases"
      }, 1200)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.", { style: toastStyle })
    } finally {
      setSubmitting(false)
    }
  }

  const qrOptions = [
    { id: 1, label: "QR 1", helper: "Primary", image: "/qr1.jpg" },
    { id: 2, label: "QR 2", helper: "Backup", image: "/qr2.jpg" },
    { id: 3, label: "QR 3", helper: "Alternate", image: "/qr3.jpg" },
  ]

  const selectedQrOption = qrOptions.find((option) => option.id === selectedQR) || qrOptions[0]
  const qrImage = selectedQrOption.image
  const paymentReady = buyerName.trim() && buyerEmail.trim() && proofFile && checkoutProducts.length > 0

  return (
    <>
      <PremiumStyleLayer />
      <HomepageThemeStyles />

      <main className="agt-page min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.18),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
        <StoreHeader cartCount={cartIds.length} likedCount={0} />
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="cg-float absolute left-[8%] top-24 h-24 w-24 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="cg-float absolute right-[10%] top-52 h-32 w-32 rounded-full bg-violet-400/20 blur-3xl [animation-delay:1.2s]" />
          <div className="absolute bottom-0 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <section className="cg-slide-up mb-8 overflow-hidden rounded-[36px] border border-white/60 bg-slate-950 px-6 py-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] md:px-8 lg:px-10">
            <div className="relative">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
              <div className="absolute -bottom-28 left-10 h-52 w-52 rounded-full bg-emerald-500/20 blur-3xl" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-emerald-200 backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" />
                    Secure Checkout
                  </div>

                  <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
                    Complete your Angel Glez COT order
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                    Review your selected files, pay through GCash, upload your proof, and wait for
                    approval. Once approved, your downloads will be available in your purchases page.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:w-auto">
                  <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-5 shadow-inner backdrop-blur">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-300">Items</p>
                    <p className="mt-2 text-3xl font-black">{totalItems}</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-5 shadow-inner backdrop-blur">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-300">Total</p>
                    <p className="mt-2 text-3xl font-black">₱{total}</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-7 flex flex-wrap gap-3">
                <a
                  href="/"
                  className={`rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur hover:bg-white/15 ${buttonPress}`}
                >
                  ← Marketplace
                </a>

                <a
                  href="/cart"
                  className={`rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-white/10 hover:bg-slate-100 ${buttonPress}`}
                >
                  Back to Cart
                </a>

                <a
                  href="/purchases"
                  className={`rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-100 backdrop-blur hover:bg-emerald-400/15 ${buttonPress}`}
                >
                  My Purchases
                </a>
              </div>
            </div>
          </section>

          {loadingProducts ? (
            <div className="cg-slide-up rounded-[32px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-violet-100 border-t-violet-600 cg-spin" />
              <p className="text-lg font-bold text-slate-500">Loading checkout...</p>
            </div>
          ) : checkoutProducts.length === 0 ? (
            <div className="cg-slide-up rounded-[32px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-100 text-3xl shadow-inner">
                🛒
              </div>

              <h2 className="mt-5 text-2xl font-black text-slate-900">No items in checkout</h2>
              <p className="mx-auto mt-2 max-w-md text-slate-500">
                Add a product first, then come back here to complete your payment.
              </p>

              <a
                href="/"
                className={`mt-6 inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-black text-white shadow-lg shadow-violet-100 hover:bg-violet-700 ${buttonPress}`}
              >
                Browse Marketplace
              </a>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
              <section className={`cg-slide-up rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.09)] backdrop-blur md:p-8 ${cardLift}`}>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">
                      Order Summary
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Your selected files</h2>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
                    {totalItems} item{totalItems !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-4">
                  {checkoutProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className={`cg-soft-pop flex flex-col gap-4 overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${cardLift}`}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={getProductImageSrc(product.imageUrl)}
                              alt={product.title}
                              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                              No image
                            </div>
                          )}

                          <div className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-black text-white shadow-lg">
                            {index + 1}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-black text-violet-700">
                              {product.grade || "Grade"}
                            </span>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-black text-slate-700">
                              {product.quarter || "Quarter"}
                            </span>
                          </div>

                          <h3 className="line-clamp-2 text-base font-black text-slate-900 md:text-lg">
                            {product.title}
                          </h3>

                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                            {product.fileName || "Digital teaching file"}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                          Price
                        </p>
                        <p className="mt-1 text-3xl font-black text-slate-900">₱{product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="relative overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-xl">
                    <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" />
                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                        Payment Summary
                      </p>

                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-300">Total amount</p>
                          <p className="mt-1 text-4xl font-black">₱{total}</p>
                        </div>

                        <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-300">
                            Method
                          </p>
                          <p className="mt-1 font-black">GCash</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-emerald-200 bg-emerald-50 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                      Before you submit
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                      <li>Use the same email you want to check in Purchases.</li>
                      <li>Send the exact total amount shown here.</li>
                      <li>Upload a clear screenshot of your payment proof.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <aside className={`cg-slide-up rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur md:p-8 lg:sticky lg:top-8 lg:self-start ${cardLift}`}>
                <div className="mb-6">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-600">
                    GCash Payment
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Pay and submit proof</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Select a QR, scan it, then upload your proof for manual verification.
                  </p>
                </div>

                <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-black text-slate-800">Payment steps</p>

                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    {[
                      "Choose a QR option below and scan it using GCash.",
                      `Send the exact amount of ₱${total}.`,
                      "Enter your buyer details and upload your proof of payment.",
                    ].map((step, index) => (
                      <div key={step} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white shadow-sm">
                          {index + 1}
                        </span>
                        <p className="leading-6">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {qrOptions.map((option) => {
                      const isSelected = selectedQR === option.id

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedQR(option.id)}
                          className={`group relative overflow-hidden rounded-2xl px-3 py-3 text-sm font-black ${buttonPress} ${
                            isSelected
                              ? "cg-selected-pulse bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-100"
                              : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          {isSelected && <span className="cg-shimmer opacity-70" />}

                          <span className="relative flex flex-col items-center justify-center gap-1">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] transition-all duration-300 ${
                                isSelected
                                  ? "scale-100 bg-white text-emerald-600"
                                  : "scale-90 bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                              }`}
                            >
                              {isSelected ? "✓" : option.id}
                            </span>

                            <span>{option.label}</span>
                            <span className={`text-[10px] font-bold ${isSelected ? "text-white/75" : "text-slate-400"}`}>
                              {option.helper}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <div className="relative flex justify-center overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_45%)]" />

                    <img
                      key={qrImage}
                      src={qrImage}
                      alt={`GCash QR Option ${selectedQR}`}
                      className={`relative h-auto rounded-2xl object-contain cg-soft-pop ring-1 ring-slate-200 ${
                        selectedQR === 1 ? "w-full max-w-[320px]" : "w-full max-w-[260px]"
                      }`}
                    />
                  </div>
                </div>

                <div className="mb-6 relative overflow-hidden rounded-[28px] bg-slate-950 p-5 text-white">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/20 blur-3xl" />
                  <div className="relative">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                      Receiver Details
                    </p>
                    <p className="mt-3 text-lg font-black">Angel Glez Store</p>
                    <p className="mt-2 text-sm text-slate-300">Amount to pay: ₱{total}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">Buyer Name</label>
                    <input
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">Buyer Email</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="Enter your email"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">
                      Upload proof of payment
                    </label>

                    <label className="group block cursor-pointer">
                      <div
                        className={`relative overflow-hidden rounded-[26px] border-2 border-dashed p-5 transition-all duration-300 active:scale-[0.98] ${
                          proofFile
                            ? "border-emerald-300 bg-emerald-50 shadow-lg shadow-emerald-100"
                            : "border-slate-300 bg-slate-50 hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-100"
                        }`}
                      >
                        {proofFile && <span className="cg-shimmer opacity-60" />}

                        <div className="relative flex flex-col items-start gap-2">
                          <div
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black shadow-sm transition ${
                              proofFile
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                            }`}
                          >
                            {proofFile ? "Proof selected ✓" : "Choose file"}
                          </div>

                          <p className="text-sm font-black text-slate-900">
                            {proofFile ? "Payment proof is ready" : "Click to upload proof of payment"}
                          </p>

                          <p className="text-xs text-slate-500">
                            PNG, JPG, or JPEG up to 1MB
                          </p>

                          <p className="max-w-full truncate text-xs font-semibold text-slate-400">
                            {proofFile ? `Selected: ${proofFile.name}` : "No file selected"}
                          </p>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    onClick={confirmPayment}
                    disabled={submitting}
                    className={`relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 py-4 text-lg font-black text-white shadow-xl shadow-emerald-100 hover:shadow-emerald-200 ${
                      paymentReady ? "ring-4 ring-emerald-100" : ""
                    } ${buttonPress}`}
                  >
                    <span className="cg-shimmer opacity-60" />

                    <span className="relative flex items-center gap-2">
                      {submitting && (
                        <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white cg-spin" />
                      )}
                      {submitting ? "Submitting payment..." : "Submit Payment for Verification"}
                    </span>
                  </button>
                </div>

                <p className="mt-4 text-center text-sm leading-6 text-slate-500">
                  Manual approval for now. Your files will appear in Purchases after verification.
                </p>
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <>
          <PremiumStyleLayer />
          <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-violet-100 border-t-violet-600 cg-spin" />
                <p className="text-lg font-semibold text-slate-500">Loading checkout...</p>
              </div>
            </div>
          </main>
        </>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

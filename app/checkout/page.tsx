"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const CART_KEY = "angel-glez-cart"
const MAX_PROOF_SIZE = 1024 * 1024

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

type Product = {
  id: number
  title: string
  price: number
  quarter: string
  grade: string
  fileName: string
  fileUrl?: string
  imageUrl: string
  likes?: number
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
    if (savedCart) setCartIds(JSON.parse(savedCart))

    const loadProducts = async () => {
      const { data, error } = await supabase.from("products").select("*")

      if (error) {
        toast.error("Failed to load products", { style: toastStyle })
        setLoadingProducts(false)
        return
      }

      const mappedProducts: Product[] = (data || []).map((item: any) => ({
        id: Number(item.id),
        title: item.title || "Untitled Product",
        price: Number(item.price || 0),
        quarter: item.quarter || "",
        grade: item.grade || "",
        fileName: item.file_name || "",
        fileUrl: item.file_url || "",
        imageUrl: item.image_url || "",
        likes: Number(item.likes || 0),
      }))

      setProducts(mappedProducts)
      setLoadingProducts(false)
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

      const fileExt = proofFile.name.split(".").pop()
      const filePath = `proofs/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, proofFile, {
          contentType: proofFile.type || "image/jpeg",
          upsert: false,
        })

      if (uploadError) {
        toast.error("Failed to upload proof.", { style: toastStyle })
        setSubmitting(false)
        return
      }

      const purchaseRows = checkoutProducts.map((product) => ({
        product_id: product.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        proof_path: filePath,
        status: "pending",
      }))

      const { error: insertError } = await supabase.from("purchases").insert(purchaseRows)

      if (insertError) {
        toast.error(insertError.message || "Failed to save payment.", { style: toastStyle })
        setSubmitting(false)
        return
      }

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
    } catch {
      toast.error("Something went wrong.", { style: toastStyle })
    } finally {
      setSubmitting(false)
    }
  }

  const qrImage = selectedQR === 1 ? "/qr1.jpg" : selectedQR === 2 ? "/qr2.jpg" : "/qr3.jpg"

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-slate-900 px-6 py-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)] md:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-violet-300">
                Secure Checkout
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Complete your Angel Glez COT order
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Review your selected files, pay through GCash, upload your proof, and wait for
                approval. Once approved, your downloads will be available in your purchases page.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Items</p>
                <p className="mt-2 text-2xl font-black">{totalItems}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Total</p>
                <p className="mt-2 text-2xl font-black">₱{total}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/"
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
            >
              ← Marketplace
            </a>
            <a
              href="/cart"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              Back to Cart
            </a>
          </div>
        </section>

        {loadingProducts ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">Loading checkout...</p>
          </div>
        ) : checkoutProducts.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">No items in checkout.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
                    Order Summary
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Your selected files</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  {totalItems} item{totalItems !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="space-y-4">
                {checkoutProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 rounded-[26px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                            {product.grade}
                          </span>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-700">
                            {product.quarter}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 md:text-lg">
                          {product.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">{product.fileName}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Price
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-900">₱{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] bg-slate-900 p-6 text-white shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                    Payment Summary
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-300">Total amount</p>
                      <p className="mt-1 text-4xl font-black">₱{total}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-300">
                        Method
                      </p>
                      <p className="mt-1 font-bold">GCash</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
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

            <aside className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
              <div className="mb-6">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
                  GCash Payment
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Pay and submit proof</h2>
              </div>

              <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-800">Payment steps</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      1
                    </span>
                    <p>Choose a QR option below and scan it using GCash.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      2
                    </span>
                    <p>Send the exact amount of <span className="font-bold text-slate-900">₱{total}</span>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      3
                    </span>
                    <p>Enter your buyer details and upload your proof of payment.</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedQR(num)}
                      className={`rounded-2xl px-3 py-3 text-sm font-bold transition ${
                        selectedQR === num
                          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      QR {num}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <img
                    src={qrImage}
                    alt={`GCash QR Option ${selectedQR}`}
                    className={`h-auto rounded-2xl object-contain ${
                      selectedQR === 1 ? "w-full max-w-[320px]" : "w-full max-w-[260px]"
                    }`}
                  />
                </div>
              </div>

              <div className="mb-6 rounded-[28px] bg-slate-900 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                  Receiver Details
                </p>
                <p className="mt-3 text-lg font-bold">Angel Glez Store</p>
                <p className="mt-2 text-sm text-slate-300">Amount to pay: ₱{total}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Buyer Name</label>
                  <input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Buyer Email</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 outline-none transition focus:border-violet-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Upload proof of payment
                  </label>

                  <label className="block cursor-pointer">
                    <div className="rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                      <div className="flex flex-col items-start gap-2">
                        <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                          Choose file
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          Click to upload proof of payment
                        </p>
                        <p className="text-xs text-slate-500">
                          PNG, JPG, or JPEG up to 1MB
                        </p>
                        <p className="text-xs text-slate-400">
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
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-4 text-lg font-extrabold text-white shadow-lg shadow-emerald-100 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Payment"}
                </button>
              </div>

              <p className="mt-4 text-center text-sm text-slate-500">
                Manual approval for now. Your files will appear in Purchases after verification.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <p className="text-lg font-semibold text-slate-500">Loading checkout...</p>
            </div>
          </div>
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}


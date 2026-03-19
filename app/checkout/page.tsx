"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { supabase } from "@/lib/supabase"

const CART_KEY = "angel-glez-cart"

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

export default function CheckoutPage() {
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
        toast.error("Failed to load products", {
          style: {
            borderRadius: "14px",
            background: "#0f172a",
            color: "#fff",
          },
        })
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

  const cartProducts = useMemo(() => {
    return products.filter((product) => cartIds.includes(product.id))
  }, [products, cartIds])

  const total = useMemo(() => {
    return cartProducts.reduce((sum, product) => sum + Number(product.price), 0)
  }, [cartProducts])

  const confirmPayment = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Please enter your name and email.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    if (!proofFile) {
      toast.error("Please upload proof of payment.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    if (proofFile.size > 1024 * 1024) {
      toast.error("Proof image must be under 1MB.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    if (cartProducts.length === 0) {
      toast.error("No items in checkout.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    try {
      setSubmitting(true)

      const fileExt = proofFile.name.split(".").pop()
      const filePath = `proofs/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(filePath, proofFile)

      if (uploadError) {
        toast.error("Failed to upload proof.", {
          style: {
            borderRadius: "14px",
            background: "#0f172a",
            color: "#fff",
          },
        })
        setSubmitting(false)
        return
      }

      const purchaseRows = cartProducts.map((product) => ({
        product_id: product.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        proof_path: filePath,
        status: "pending",
      }))

      const { error: insertError } = await supabase
        .from("purchases")
        .insert(purchaseRows)

      if (insertError) {
        console.log("Insert error:", insertError)
        toast.error(insertError?.message || "Failed to save payment.", {
          style: {
            borderRadius: "14px",
            background: "#0f172a",
            color: "#fff",
          },
        })
        setSubmitting(false)
        return
      }

      localStorage.setItem(CART_KEY, JSON.stringify([]))
      setCartIds([])
      setBuyerName("")
      setBuyerEmail("")
      setProofFile(null)

      toast.success("Payment submitted. Please wait for verification.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })

      setTimeout(() => {
        window.location.href = "/"
      }, 1200)
    } catch {
      toast.error("Something went wrong.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
    } finally {
      setSubmitting(false)
    }
  }

  const qrImage =
    selectedQR === 1 ? "/qr1.jpg" : selectedQR === 2 ? "/qr2.jpg" : "/qr3.jpg"

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold">GCash Checkout</h1>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
            >
              ← Marketplace
            </a>

            <a
              href="/cart"
              className="rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700"
            >
              Back to Cart
            </a>
          </div>
        </div>

        {loadingProducts ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">Loading checkout...</p>
          </div>
        ) : cartProducts.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">No items in checkout.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr]">
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-extrabold">Order Summary</h2>

              <div className="space-y-4">
                {cartProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex gap-4">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                      <div>
                        <h3 className="font-extrabold">{product.title}</h3>
                        <p className="text-sm text-slate-500">
                          {product.grade} • {product.quarter}
                        </p>
                        <p className="text-sm text-slate-500">{product.fileName}</p>
                      </div>
                    </div>

                    <span className="text-xl font-black">₱{product.price}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl bg-slate-50 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-3xl font-black">₱{total}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-extrabold">Pay with GCash</h2>

              <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Payment Instructions
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  1. Choose a QR option below. <br />
                  2. Scan the QR code using GCash. <br />
                  3. Send the exact total amount. <br />
                  4. Enter your name and email. <br />
                  5. Upload your proof of payment. <br />
                  6. Click <span className="font-bold">Submit Payment</span>.
                </p>
              </div>

              <div className="mb-6">
                <div className="mb-4 flex justify-center gap-3">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSelectedQR(num)}
                      className={`rounded-xl px-4 py-2 font-bold transition ${
                        selectedQR === num
                          ? "bg-emerald-600 text-white shadow"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Option {num}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-md">
                    <img
                      src={qrImage}
                      alt={`GCash QR Option ${selectedQR}`}
                      className={`h-auto rounded-2xl object-contain ${
                        selectedQR === 1
                          ? "w-full max-w-[320px]"
                          : "w-full max-w-[260px]"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-3xl bg-slate-50 p-5">
                <p className="font-bold text-slate-800">GCash Name: Angel Glez Store</p>
                <p className="mt-2 text-slate-600">Amount to Pay: ₱{total}</p>
              </div>

              <div className="space-y-4">
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
                />

                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="Your Email"
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
                />

                <div className="rounded-2xl border border-slate-300 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-500">
                    Upload proof of payment
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                  />
                  <p className="mt-2 text-xs text-slate-400">Max file size: 1MB</p>
                </div>

                <button
                  onClick={confirmPayment}
                  disabled={submitting}
                  className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Payment"}
                </button>
              </div>

              <p className="mt-4 text-center text-sm text-slate-500">
                Manual GCash checkout for now.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
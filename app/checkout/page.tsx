"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

const STORAGE_KEY = "angel-glez-products"
const CART_KEY = "angel-glez-cart"
const PAYMENT_SUBMISSIONS_KEY = "angel-glez-payment-submissions"

type Product = {
  id: number
  title: string
  price: number
  quarter: string
  grade: string
  fileName: string
  fileDataUrl: string
  imageUrl: string
  likes?: number
}

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cartIds, setCartIds] = useState<number[]>([])
  const [buyerName, setBuyerName] = useState("")
  const [buyerGcash, setBuyerGcash] = useState("")
  const [reference, setReference] = useState("")
  const [selectedQR, setSelectedQR] = useState(1)

  useEffect(() => {
    const savedProducts = localStorage.getItem(STORAGE_KEY)
    const savedCart = localStorage.getItem(CART_KEY)

    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedCart) setCartIds(JSON.parse(savedCart))
  }, [])

  const cartProducts = useMemo(() => {
    return products.filter((product) => cartIds.includes(product.id))
  }, [products, cartIds])

  const total = useMemo(() => {
    return cartProducts.reduce((sum, product) => sum + Number(product.price), 0)
  }, [cartProducts])

  const confirmPayment = () => {
    if (!buyerName || !buyerGcash || !reference) {
      toast.error("Please complete all payment details.", {
        style: {
          borderRadius: "14px",
          background: "#0f172a",
          color: "#fff",
        },
      })
      return
    }

    const existing = localStorage.getItem(PAYMENT_SUBMISSIONS_KEY)
    const submissions = existing ? JSON.parse(existing) : []

    const newSubmission = {
      id: Date.now(),
      buyerName,
      buyerGcash,
      reference,
      total,
      selectedQR,
      submittedAt: new Date().toLocaleString(),
      status: "Pending",
      items: cartProducts.map((product) => ({
        id: product.id,
        title: product.title,
        price: product.price,
        grade: product.grade,
        quarter: product.quarter,
        fileName: product.fileName,
        imageUrl: product.imageUrl,
      })),
    }

    submissions.unshift(newSubmission)
    localStorage.setItem(PAYMENT_SUBMISSIONS_KEY, JSON.stringify(submissions))

    localStorage.setItem(CART_KEY, JSON.stringify([]))
    setCartIds([])

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

        {cartProducts.length === 0 ? (
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
                  4. Enter your name, GCash number, and reference number. <br />
                  5. Click <span className="font-bold">I Paid</span>.
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
                  value={buyerGcash}
                  onChange={(e) => setBuyerGcash(e.target.value)}
                  placeholder="Your GCash Number"
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
                />

                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="GCash Reference Number"
                  className="w-full rounded-2xl border border-slate-300 p-4 outline-none"
                />

                <button
                  onClick={confirmPayment}
                  className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white hover:bg-emerald-700"
                >
                  I Paid
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
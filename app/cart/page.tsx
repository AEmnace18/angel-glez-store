"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"

const STORAGE_KEY = "angel-glez-products"
const CART_KEY = "angel-glez-cart"

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

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cartIds, setCartIds] = useState<number[]>([])

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

  const removeFromCart = (id: number) => {
    const updated = cartIds.filter((itemId) => itemId !== id)
    setCartIds(updated)
    localStorage.setItem(CART_KEY, JSON.stringify(updated))

    toast.success("Removed from cart", {
      style: {
        borderRadius: "14px",
        background: "#0f172a",
        color: "#fff",
      },
    })
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold">Your Cart</h1>

          <div className="flex gap-3">
            <a
              href="/"
              className="rounded-2xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
            >
              ← Marketplace
            </a>

            <a
              href="/purchases"
              className="rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700"
            >
              My Purchases
            </a>
          </div>
        </div>

        {cartProducts.length === 0 ? (
          <div className="rounded-[28px] bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-500">Your cart is empty.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
            <div className="space-y-4">
              {cartProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex gap-4">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />

                    <div>
                      <h3 className="text-xl font-extrabold">{product.title}</h3>
                      <p className="text-sm text-slate-500">
                        {product.grade} • {product.quarter}
                      </p>
                      <p className="text-sm text-slate-500">{product.fileName}</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        ₱{product.price}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="rounded-2xl bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-[28px] bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-extrabold">Checkout Summary</h2>

              <div className="space-y-3 text-slate-600">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{cartProducts.length}</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₱{total}</span>
                </div>

                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>Digital</span>
                </div>
              </div>

              <div className="my-6 h-px bg-slate-200" />

              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black">₱{total}</span>
              </div>

              <a
                href="/checkout"
                className="block w-full rounded-2xl bg-emerald-600 py-4 text-center text-lg font-bold text-white hover:bg-emerald-700"
              >
                Proceed to GCash Checkout
              </a>

              <p className="mt-4 text-center text-sm text-slate-500">
                Continue to payment page.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
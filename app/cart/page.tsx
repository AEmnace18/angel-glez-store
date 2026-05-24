"use client"

import { useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { normalizeProductRows, type Product, type ProductRow } from "@/lib/product-row"
import { PremiumMotionStyles } from "@/components/premium-ui"
import { HomepageThemeStyles, StoreHeader } from "@/components/homepage-theme"

const CART_KEY = "angel-glez-cart"

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  )
}

function EmptyCartIcon() {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-100 text-violet-600 shadow-inner">
      <CartIcon className="h-9 w-9" />
    </div>
  )
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cartIds, setCartIds] = useState<number[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY)
    if (savedCart) setCartIds(JSON.parse(savedCart))

    const loadProducts = async () => {
      try {
        const { products: productRows } = await apiJson<{ products: ProductRow[] }>("/api/products")
        setProducts(normalizeProductRows(productRows))
      } catch (error) {
        console.warn("Handled client error:", error instanceof Error ? error.message : error)
        toast.error(error instanceof Error ? error.message : "Failed to load cart products", { style: toastStyle })
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
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
    toast.success("Removed from cart", { style: toastStyle })
  }

  const clearCart = () => {
    setCartIds([])
    localStorage.setItem(CART_KEY, JSON.stringify([]))
    toast.success("Cart cleared", { style: toastStyle })
  }

  return (
    <>
      <PremiumMotionStyles />
      <HomepageThemeStyles />
      <main className="agt-page premium-page min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#f8fafc_100%)] px-4 py-8 text-slate-900 md:px-6 lg:px-8">
        <StoreHeader cartCount={cartIds.length} likedCount={0} />
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 overflow-hidden rounded-[34px] border border-white/60 bg-slate-900 px-6 py-8 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)] md:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-violet-300">
                Premium Cart
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                Review your teaching files before checkout
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Review your cart, confirm your files, and proceed to secure checkout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:w-auto">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Items</p>
                <p className="mt-2 text-2xl font-black">{cartProducts.length}</p>
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
              href="/purchases"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              My Purchases
            </a>
          </div>
        </section>

        {loadingProducts ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-lg font-semibold text-slate-500">Loading cart...</p>
          </div>
        ) : cartProducts.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200/70 bg-white/90 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <EmptyCartIcon />
            <h2 className="mt-5 text-2xl font-black text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-slate-500">
              Add your favorite quarter and grade files first, then come back here to checkout.
            </p>
            <a
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700"
            >
              Browse Marketplace
            </a>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-4">
              {cartProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-4">
                      <div className="relative">
                        <img
                          src={getProductImageSrc(product.imageUrl)}
                          alt={product.title}
                          className="h-24 w-24 rounded-[22px] object-cover ring-1 ring-slate-200"
                        />
                        <div className="absolute -right-2 -top-2 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-black text-white shadow-lg">
                          {index + 1}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
                            {product.grade}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                            {product.quarter}
                          </span>
                          {(product.sold || 0) >= 5 && (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">
                              Best Seller
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-extrabold text-slate-900">{product.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{product.fileName}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                          <span>{product.likes || 0} likes</span>
                          <span>•</span>
                          <span>{product.sold || 0} sold</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <div className="text-left md:text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Price
                        </p>
                        <p className="mt-1 text-3xl font-black text-slate-900">₱{product.price}</p>
                      </div>

                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 font-bold text-red-600 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="bg-slate-900 px-6 py-6 text-white">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
                    Cart Drawer
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Checkout Summary</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Quick review of your order before you continue to GCash checkout.
                  </p>
                </div>

                <div className="p-6">
                  <div className="space-y-4 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Items</span>
                      <span className="font-bold text-slate-900">{cartProducts.length}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-900">₱{total}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Delivery</span>
                      <span className="font-bold text-emerald-700">Digital</span>
                    </div>

                    <div className="h-px bg-slate-200" />

                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold text-slate-900">Total</span>
                      <span className="text-4xl font-black text-slate-900">₱{total}</span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <a
                      href="/checkout"
                      className="block w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-4 text-center text-lg font-extrabold text-white shadow-lg shadow-emerald-100 transition hover:scale-[1.01]"
                    >
                      Proceed to GCash Checkout
                    </a>

                    <button
                      onClick={clearCart}
                      className="block w-full rounded-2xl border border-slate-300 py-4 text-center text-lg font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Clear Cart
                    </button>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-violet-200 bg-violet-50 p-4 text-sm leading-7 text-slate-600">
                    Your cart updates instantly and stays saved locally on this device until checkout.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
      </main>
    </>
  )
}

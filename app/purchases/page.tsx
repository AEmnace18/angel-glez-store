"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "angel-glez-products"
const PURCHASES_KEY = "angel-glez-purchases"

type Product = {
  id: number
  title: string
  price: number
  quarter: string
  grade: string
  fileName: string
  fileDataUrl: string
  imageUrl: string
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<number[]>([])

  useEffect(() => {
    const savedProducts = localStorage.getItem(STORAGE_KEY)
    const savedPurchases = localStorage.getItem(PURCHASES_KEY)

    if (savedProducts) setProducts(JSON.parse(savedProducts))
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
  }, [])

  const purchasedProducts = products.filter((p) => purchases.includes(p.id))

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-extrabold">My Purchases</h1>
          <a
            href="/"
            className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white"
          >
            Back to Store
          </a>
        </div>

        {purchasedProducts.length === 0 ? (
          <p className="text-slate-500">No purchased products yet.</p>
        ) : (
          <div className="space-y-4">
            {purchasedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-2xl border p-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="h-20 w-20 rounded-xl object-cover"
                  />

                  <div>
                    <p className="text-xl font-bold">{product.title}</p>
                    <p className="text-sm text-slate-500">
                      {product.grade} • {product.quarter}
                    </p>
                    <p className="text-sm text-slate-500">{product.fileName}</p>
                    <p className="font-bold text-violet-600">₱{product.price}</p>
                  </div>
                </div>

                <a
                  href={product.fileDataUrl}
                  download={product.fileName}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
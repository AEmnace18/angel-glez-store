import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

const MAX_REVIEW_TEXT_LENGTH = 700

type ProductReviewRow = {
  id: string
  product_id: number | string
  purchase_id: string
  buyer_name?: string | null
  rating: number | string | null
  review_text?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type PurchaseReviewGateRow = {
  id: string
  product_id: number | string
  buyer_email: string
  buyer_name?: string | null
  status: string
}

type PurchaseStatusRow = {
  id: string
  status: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isMissingReviewsTableError(error: { code?: string; message?: string } | null) {
  const message = String(error?.message || "").toLowerCase()
  return error?.code === "42P01" || (message.includes("product_reviews") && message.includes("does not exist"))
}

function parseProductIds(searchParams: URLSearchParams) {
  const productId = searchParams.get("productId") || ""
  const productIds = searchParams.get("productIds") || ""

  return [...new Set([productId, ...productIds.split(",")]
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value > 0))]
    .slice(0, 80)
}

function normalizeReview(row: ProductReviewRow) {
  return {
    id: String(row.id),
    productId: Number(row.product_id),
    rating: Number(row.rating || 0),
    text: String(row.review_text || ""),
    author: String(row.buyer_name || "Teacher"),
    createdAt: row.created_at || "",
  }
}

function buildReviewPayload(productIds: number[], rows: ProductReviewRow[]) {
  const reviewsByProduct: Record<number, ReturnType<typeof normalizeReview>[]> = {}
  const ratingsByProduct: Record<number, { rating: number; count: number }> = {}
  const totalsByProduct = new Map<number, { total: number; count: number }>()

  for (const productId of productIds) {
    reviewsByProduct[productId] = []
    ratingsByProduct[productId] = { rating: 0, count: 0 }
  }

  for (const row of rows) {
    const review = normalizeReview(row)
    if (!review.productId || !review.rating) continue

    const current = totalsByProduct.get(review.productId) || { total: 0, count: 0 }
    current.total += review.rating
    current.count += 1
    totalsByProduct.set(review.productId, current)

    if (!reviewsByProduct[review.productId]) reviewsByProduct[review.productId] = []
    if (reviewsByProduct[review.productId].length < 5) {
      reviewsByProduct[review.productId].push(review)
    }
  }

  totalsByProduct.forEach((meta, productId) => {
    ratingsByProduct[productId] = {
      rating: Number((meta.total / meta.count).toFixed(1)),
      count: meta.count,
    }
  })

  return { reviewsByProduct, ratingsByProduct }
}

async function loadApprovedReviewRows(productIds: number[]) {
  const supabase = createSupabaseAdminClient()
  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("id, product_id, purchase_id, buyer_name, rating, review_text, created_at, updated_at")
    .in("product_id", productIds)
    .order("created_at", { ascending: false })

  if (reviewsError) {
    return { reviews: [], error: reviewsError }
  }

  const reviewRows = (reviews || []) as ProductReviewRow[]
  const purchaseIds = [...new Set(reviewRows.map((review) => String(review.purchase_id)).filter(Boolean))]

  if (purchaseIds.length === 0) {
    return { reviews: [], error: null }
  }

  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select("id, status")
    .in("id", purchaseIds)

  if (purchasesError) {
    return { reviews: [], error: purchasesError }
  }

  const approvedPurchaseIds = new Set(
    ((purchases || []) as PurchaseStatusRow[])
      .filter((purchase) => purchase.status === "approved")
      .map((purchase) => String(purchase.id))
  )

  return {
    reviews: reviewRows.filter((review) => approvedPurchaseIds.has(String(review.purchase_id))),
    error: null,
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productIds = parseProductIds(searchParams)

    if (productIds.length === 0) {
      return NextResponse.json({ reviewsByProduct: {}, ratingsByProduct: {} })
    }

    const { reviews, error } = await loadApprovedReviewRows(productIds)

    if (error) {
      if (isMissingReviewsTableError(error)) {
        return NextResponse.json({
          reviewsByProduct: buildReviewPayload(productIds, []).reviewsByProduct,
          ratingsByProduct: buildReviewPayload(productIds, []).ratingsByProduct,
          setupNeeded: true,
        })
      }

      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(buildReviewPayload(productIds, reviews))
  } catch (error) {
    console.error("LOAD REVIEWS ERROR:", error)
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const productId = Number(body.productId)
    const purchaseId = String(body.purchaseId || "").trim()
    const buyerEmail = String(body.buyerEmail || "").trim().toLowerCase()
    const rating = Number(body.rating)
    const reviewText = String(body.text || "").trim().slice(0, MAX_REVIEW_TEXT_LENGTH)

    if (!Number.isInteger(productId) || productId <= 0 || !purchaseId || !buyerEmail) {
      return NextResponse.json({ error: "Missing review info" }, { status: 400 })
    }

    if (!isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Enter a valid buyer email" }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Pick a valid star rating" }, { status: 400 })
    }

    if (reviewText.length < 3) {
      return NextResponse.json({ error: "Write a short review first" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .select("id, product_id, buyer_email, buyer_name, status")
      .eq("id", purchaseId)
      .eq("buyer_email", buyerEmail)
      .eq("product_id", productId)
      .single()

    if (purchaseError || !purchase || (purchase as PurchaseReviewGateRow).status !== "approved") {
      return NextResponse.json(
        { error: "Only approved buyers can review this product." },
        { status: 403 }
      )
    }

    const approvedPurchase = purchase as PurchaseReviewGateRow
    const { error: reviewError } = await supabase
      .from("product_reviews")
      .upsert(
        {
          product_id: productId,
          purchase_id: purchaseId,
          buyer_name: approvedPurchase.buyer_name || "Teacher",
          buyer_email: buyerEmail,
          rating,
          review_text: reviewText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "purchase_id" }
      )

    if (reviewError) {
      if (isMissingReviewsTableError(reviewError)) {
        return NextResponse.json(
          { error: "Reviews table is not set up yet. Run supabase/product-reviews.sql first." },
          { status: 500 }
        )
      }

      return NextResponse.json({ error: reviewError.message }, { status: 500 })
    }

    const { reviews, error } = await loadApprovedReviewRows([productId])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(buildReviewPayload([productId], reviews), { status: 201 })
  } catch (error) {
    console.error("SUBMIT REVIEW ERROR:", error)
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 })
  }
}

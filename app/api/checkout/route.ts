import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/server/supabase"
import { sanitizeObjectName } from "@/lib/server/r2"

const MAX_PROOF_SIZE = 1024 * 1024

function parseProductIds(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return []

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return [...new Set(parsed.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
  } catch {
    return []
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const buyerName = String(formData.get("buyerName") || "").trim()
    const buyerEmail = String(formData.get("buyerEmail") || "").trim().toLowerCase()
    const productIds = parseProductIds(formData.get("productIds"))
    const proofFile = formData.get("proof")

    if (!buyerName || !buyerEmail || !isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Enter a valid buyer name and email" }, { status: 400 })
    }

    if (productIds.length === 0) {
      return NextResponse.json({ error: "No products were selected" }, { status: 400 })
    }

    if (!(proofFile instanceof File)) {
      return NextResponse.json({ error: "Proof image is required" }, { status: 400 })
    }

    if (!proofFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Proof must be an image file" }, { status: 400 })
    }

    if (proofFile.size > MAX_PROOF_SIZE) {
      return NextResponse.json({ error: "Proof image must be under 1MB" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id")
      .in("id", productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const existingIds = new Set((products || []).map((product) => Number(product.id)))
    const missingProduct = productIds.find((id) => !existingIds.has(id))

    if (missingProduct) {
      return NextResponse.json({ error: "One or more products no longer exist" }, { status: 400 })
    }

    const proofPath = `proofs/${Date.now()}-${randomUUID()}-${sanitizeObjectName(proofFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, proofFile, {
        contentType: proofFile.type || "image/jpeg",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const purchaseRows = productIds.map((productId) => ({
      product_id: productId,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      proof_path: proofPath,
      status: "pending",
    }))

    const { data: purchases, error: insertError } = await supabase
      .from("purchases")
      .insert(purchaseRows)
      .select("id, product_id, status")

    if (insertError) {
      await supabase.storage.from("payment-proofs").remove([proofPath])
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ purchases: purchases || [] }, { status: 201 })
  } catch (error) {
    console.error("CHECKOUT ERROR:", error)
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 })
  }
}

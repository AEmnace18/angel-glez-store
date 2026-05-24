import { NextResponse } from "next/server"
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/server/admin-auth"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

type RouteContext = {
  params: Promise<{ paymentId: string }>
}

const validStatuses = new Set(["pending", "approved", "rejected"])

export async function PATCH(req: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const { paymentId } = await context.params
    const { status } = await req.json()

    if (!paymentId || !validStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existingPayment, error: loadError } = await supabase
      .from("purchases")
      .select("id, status, product_id, proof_path, products ( id, sold )")
      .eq("id", paymentId)
      .single()

    if (loadError || !existingPayment) {
      return NextResponse.json({ error: loadError?.message || "Payment not found" }, { status: 404 })
    }

    const nextProofPath = status === "approved" ? null : existingPayment.proof_path
    const { error: updateError } = await supabase
      .from("purchases")
      .update({ status, proof_path: nextProofPath })
      .eq("id", paymentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const product = Array.isArray(existingPayment.products)
      ? existingPayment.products[0]
      : existingPayment.products

    if (product?.id && existingPayment.status !== status) {
      const currentSold = Number(product.sold || 0)
      const soldDelta = status === "approved" ? 1 : existingPayment.status === "approved" ? -1 : 0

      if (soldDelta !== 0) {
        await supabase
          .from("products")
          .update({ sold: Math.max(0, currentSold + soldDelta) })
          .eq("id", product.id)
      }
    }

    if (status === "approved" && existingPayment.proof_path) {
      await supabase.storage.from("payment-proofs").remove([existingPayment.proof_path])
    }

    return NextResponse.json({ updated: true })
  } catch (error) {
    console.error("ADMIN PAYMENT UPDATE ERROR:", error)
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const { paymentId } = await context.params

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existingPayment } = await supabase
      .from("purchases")
      .select("proof_path")
      .eq("id", paymentId)
      .single()
    const { error } = await supabase.from("purchases").delete().eq("id", paymentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (existingPayment?.proof_path) {
      await supabase.storage.from("payment-proofs").remove([existingPayment.proof_path])
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("ADMIN PAYMENT DELETE ERROR:", error)
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
  }
}

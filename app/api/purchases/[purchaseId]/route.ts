import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

type RouteContext = {
  params: Promise<{ purchaseId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { purchaseId } = await context.params
    const { searchParams } = new URL(req.url)
    const buyerEmail = String(searchParams.get("buyerEmail") || "").trim().toLowerCase()

    if (!purchaseId || !buyerEmail) {
      return NextResponse.json({ error: "Missing purchase info" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        status,
        created_at,
        buyer_email,
        products (
          id,
          title,
          price,
          quarter,
          grade,
          file_name,
          image_url
        )
      `)
      .eq("id", purchaseId)
      .eq("buyer_email", buyerEmail)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Could not load this purchase" }, { status: 404 })
    }

    return NextResponse.json({ purchase: data })
  } catch (error) {
    console.error("LOAD PURCHASE ERROR:", error)
    return NextResponse.json({ error: "Failed to load purchase" }, { status: 500 })
  }
}

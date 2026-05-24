import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const buyerEmail = String(searchParams.get("buyerEmail") || "").trim().toLowerCase()

    if (!buyerEmail) {
      return NextResponse.json({ purchases: [] })
    }

    if (!isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Enter a valid buyer email" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        status,
        created_at,
        products (
          id,
          title,
          price,
          quarter,
          grade,
          file_name,
          file_url,
          image_url
        )
      `)
      .eq("buyer_email", buyerEmail)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ purchases: data || [] })
  } catch (error) {
    console.error("LOAD PURCHASES ERROR:", error)
    return NextResponse.json({ error: "Failed to load purchases" }, { status: 500 })
  }
}

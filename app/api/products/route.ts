import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("id, title, description, price, quarter, grade, file_name, image_url, thumbnail_url, likes, sold, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error) {
    console.error("LOAD PRODUCTS ERROR:", error)
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }
}

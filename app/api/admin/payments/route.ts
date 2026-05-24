import { NextResponse } from "next/server"
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/server/admin-auth"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("purchases")
      .select(`
        *,
        products (
          id,
          title,
          price,
          grade,
          quarter,
          file_name,
          image_url,
          sold
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payments: data || [] })
  } catch (error) {
    console.error("ADMIN PAYMENTS LOAD ERROR:", error)
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 })
  }
}

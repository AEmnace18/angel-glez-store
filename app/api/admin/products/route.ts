import { NextResponse } from "next/server"
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/server/admin-auth"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

export const runtime = "nodejs"

type ZipEntryInput = {
  entry_path?: string
  entry_name?: string
  entry_extension?: string
  entry_type?: string
  sort_order?: number
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Request failed"
}

function normalizePrice(value: unknown) {
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

function normalizeZipEntries(entries: unknown, productId: string | number) {
  if (!Array.isArray(entries)) return []

  return entries
    .map((entry: ZipEntryInput, index) => ({
      product_id: productId,
      entry_path: String(entry.entry_path || "").trim(),
      entry_name: String(entry.entry_name || "").trim(),
      entry_extension: String(entry.entry_extension || "").trim(),
      entry_type: String(entry.entry_type || "other").trim() || "other",
      sort_order: Number.isInteger(entry.sort_order) ? Number(entry.sort_order) : index,
    }))
    .filter((entry) => entry.entry_path && entry.entry_name)
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error) {
    console.error("ADMIN PRODUCTS LOAD ERROR:", error)
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        hint: "Check NEXT_PUBLIC_SUPABASE_URL and your Supabase service/admin key in .env.local, then restart npm run dev.",
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const body = await req.json()
    const title = String(body.title || "").trim()
    const description = String(body.description || "").trim()
    const price = normalizePrice(body.price)
    const grade = String(body.grade || "").trim()
    const quarter = String(body.quarter || "").trim()
    const fileName = String(body.file_name || "").trim()
    const fileUrl = String(body.file_url || "").trim()
    const thumbnailUrl = String(body.thumbnail_url || "").trim()

    if (!title || !description || !price || !grade || !quarter || !fileName || !fileUrl) {
      return NextResponse.json(
        { error: "Please complete title, description, price, grade, quarter, and product file." },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const { data: insertedProduct, error } = await supabase
      .from("products")
      .insert({
        title,
        description,
        price,
        grade,
        quarter,
        thumbnail_url: thumbnailUrl || null,
        image_url: thumbnailUrl || null,
        file_name: fileName,
        file_url: fileUrl,
      })
      .select("*")
      .single()

    if (error || !insertedProduct) {
      return NextResponse.json({ error: error?.message || "Failed to create product" }, { status: 500 })
    }

    const zipEntries = normalizeZipEntries(body.zip_entries, insertedProduct.id)
    let manifestWarning: string | null = null

    if (zipEntries.length > 0) {
      const { error: manifestError } = await supabase.from("product_zip_entries").insert(zipEntries)
      if (manifestError) {
        manifestWarning = manifestError.message
      }
    }

    return NextResponse.json(
      {
        product: insertedProduct,
        manifest_warning: manifestWarning,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("ADMIN PRODUCT CREATE ERROR:", error)
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        hint: "The file may have uploaded to R2, but saving the product needs Supabase products table access.",
      },
      { status: 500 }
    )
  }
}

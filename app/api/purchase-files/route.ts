import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import JSZip from "jszip"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

function bufferFromStream(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

function fileType(name: string) {
  const lower = name.toLowerCase()

  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(lower)) return "image"
  if (/\.pdf$/i.test(lower)) return "pdf"
  if (/\.(doc|docx)$/i.test(lower)) return "document"
  if (/\.(xls|xlsx|csv)$/i.test(lower)) return "spreadsheet"
  if (/\.(ppt|pptx)$/i.test(lower)) return "presentation"
  if (/\.(txt|md)$/i.test(lower)) return "text"
  return "other"
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { searchParams } = new URL(req.url)
    const purchaseId = searchParams.get("purchaseId") || ""
    const buyerEmail = searchParams.get("buyerEmail") || ""

    if (!purchaseId || !buyerEmail) {
      return NextResponse.json({ error: "Missing purchase info" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("purchases")
      .select(`
        id,
        status,
        buyer_email,
        products (
          file_name,
          file_url
        )
      `)
      .eq("id", purchaseId)
      .eq("buyer_email", buyerEmail)
      .single()

    if (error || !data || data.status !== "approved" || !data.products) {
      return NextResponse.json({ error: "Purchase not approved or not found" }, { status: 403 })
    }

    const fileName = String((data.products as any).file_name || "")
    const objectKey = String((data.products as any).file_url || "")

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "This product is not a ZIP file" }, { status: 400 })
    }

    const object = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: objectKey,
      })
    )

    if (!object.Body) {
      return NextResponse.json({ error: "ZIP file not found" }, { status: 404 })
    }

    const zipBuffer = await bufferFromStream(object.Body)
    const zip = await JSZip.loadAsync(zipBuffer)

    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map((entry) => {
        const name = entry.name.split("/").pop() || entry.name
        const extension = name.includes(".") ? name.split(".").pop() || "" : ""
        return {
          path: entry.name,
          name,
          extension,
          type: fileType(name),
        }
      })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("PURCHASE FILES ERROR:", error)
    return NextResponse.json({ error: "Failed to inspect ZIP file" }, { status: 500 })
  }
}
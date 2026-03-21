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

function contentType(name: string) {
  const lower = name.toLowerCase()

  if (/\.png$/i.test(lower)) return "image/png"
  if (/\.(jpg|jpeg)$/i.test(lower)) return "image/jpeg"
  if (/\.gif$/i.test(lower)) return "image/gif"
  if (/\.webp$/i.test(lower)) return "image/webp"
  if (/\.svg$/i.test(lower)) return "image/svg+xml"
  if (/\.pdf$/i.test(lower)) return "application/pdf"
  if (/\.txt$/i.test(lower)) return "text/plain; charset=utf-8"
  if (/\.md$/i.test(lower)) return "text/markdown; charset=utf-8"
  if (/\.html?$/i.test(lower)) return "text/html; charset=utf-8"
  if (/\.docx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (/\.doc$/i.test(lower)) return "application/msword"
  if (/\.pptx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  if (/\.ppt$/i.test(lower)) return "application/vnd.ms-powerpoint"
  if (/\.xlsx$/i.test(lower)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (/\.xls$/i.test(lower)) return "application/vnd.ms-excel"
  if (/\.csv$/i.test(lower)) return "text/csv; charset=utf-8"

  return "application/octet-stream"
}

function extractObjectKey(input: string) {
  if (!input) return ""

  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    return input
  }

  try {
    const url = new URL(input)
    return url.pathname.replace(/^\/+/, "")
  } catch {
    return input
  }
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
    const entryPath = searchParams.get("entryPath") || ""
    const download = searchParams.get("download") === "1"

    if (!purchaseId || !buyerEmail || !entryPath) {
      return NextResponse.json({ error: "Missing file request data" }, { status: 400 })
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
    const rawFileUrl = String((data.products as any).file_url || "")
    const objectKey = extractObjectKey(rawFileUrl)

    if (!fileName.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "This product is not a ZIP file" }, { status: 400 })
    }

    if (!objectKey) {
      return NextResponse.json({ error: "ZIP file key is missing" }, { status: 400 })
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
    const entry = zip.file(entryPath)

    if (!entry) {
      return NextResponse.json({ error: "File not found in ZIP" }, { status: 404 })
    }

    const entryBuffer = await entry.async("nodebuffer")
    const outputName = entryPath.split("/").pop() || "file"
    const fileBytes = new Uint8Array(entryBuffer)

    return new Response(fileBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType(outputName),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${outputName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("PURCHASE FILE ERROR:", error)
    return NextResponse.json({ error: "Failed to open ZIP file entry" }, { status: 500 })
  }
}

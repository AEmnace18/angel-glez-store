import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import JSZip from "jszip"
import { extractR2ObjectKey } from "@/lib/server/r2"
import { createSupabaseAdminClient } from "@/lib/server/supabase"

type PurchaseProduct = {
  file_name?: string | null
  file_url?: string | null
}

type PurchaseFileRow = {
  status?: string | null
  products?: PurchaseProduct | PurchaseProduct[] | null
}

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

type R2Body = NodeJS.ReadableStream | Blob | { transformToByteArray: () => Promise<Uint8Array> }

function hasByteArrayTransform(stream: R2Body): stream is { transformToByteArray: () => Promise<Uint8Array> } {
  return "transformToByteArray" in stream && typeof stream.transformToByteArray === "function"
}

async function bufferFromStream(stream: R2Body): Promise<Buffer> {
  if (hasByteArrayTransform(stream)) {
    return Buffer.from(await stream.transformToByteArray())
  }

  if (stream instanceof Blob) {
    return Buffer.from(await stream.arrayBuffer())
  }

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
    const { searchParams } = new URL(req.url)
    const purchaseId = searchParams.get("purchaseId") || ""
    const buyerEmail = searchParams.get("buyerEmail") || ""

    if (!purchaseId || !buyerEmail) {
      return NextResponse.json({ error: "Missing purchase info" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
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

    const purchase = data as PurchaseFileRow | null
    const product = Array.isArray(purchase?.products) ? purchase?.products[0] : purchase?.products

    if (error || !purchase || purchase.status !== "approved" || !product) {
      return NextResponse.json({ error: "Purchase not approved or not found" }, { status: 403 })
    }

    const fileName = String(product.file_name || "")
    const objectKey = extractR2ObjectKey(String(product.file_url || ""))

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

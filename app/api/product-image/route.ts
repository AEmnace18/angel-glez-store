import { GetObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { createR2Client, extractR2ObjectKey, requireR2BucketName } from "@/lib/server/r2"

export const runtime = "nodejs"

function getImageSource(req: Request) {
  const url = new URL(req.url)
  const raw = String(url.searchParams.get("src") || url.searchParams.get("key") || "").trim()

  if (!raw) return ""

  if (raw.startsWith("/api/product-image")) {
    const nested = new URL(raw, url.origin)
    return String(nested.searchParams.get("src") || nested.searchParams.get("key") || "").trim()
  }

  return raw
}

function getSafeImageKey(value: string) {
  const objectKey = extractR2ObjectKey(value).replace(/^\/+/, "")

  if (!objectKey) return ""
  if (objectKey.includes("..") || objectKey.includes("\\")) return ""
  if (!/^(thumbnails|products)\//.test(objectKey)) return ""

  return objectKey
}

export async function GET(req: Request) {
  try {
    const imageSource = getImageSource(req)
    const objectKey = getSafeImageKey(imageSource)

    if (!objectKey) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const result = await createR2Client().send(
      new GetObjectCommand({
        Bucket: requireR2BucketName(),
        Key: objectKey,
      })
    )

    if (!result.Body) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const bytes = await result.Body.transformToByteArray()
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    const headers = new Headers()
    headers.set("Content-Type", result.ContentType || "application/octet-stream")
    headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400")
    headers.set("X-Content-Type-Options", "nosniff")

    if (result.ETag) headers.set("ETag", result.ETag)
    if (result.LastModified) headers.set("Last-Modified", result.LastModified.toUTCString())

    return new Response(body, { headers })
  } catch (error) {
    console.error("PRODUCT IMAGE LOAD ERROR:", error)
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 })
  }
}

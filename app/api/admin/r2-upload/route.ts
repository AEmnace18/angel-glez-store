import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/server/admin-auth"
import { createR2Client, requireR2BucketName, sanitizeObjectName } from "@/lib/server/r2"

export const runtime = "nodejs"

const validFolders = new Set(["thumbnails", "products"])

function publicUrlFor(objectKey: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.R2_PUBLIC_URL ||
    ""

  return baseUrl ? `${baseUrl.replace(/\/$/, "")}/${objectKey.replace(/^\//, "")}` : ""
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error) return error
  return "Upload failed"
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    const folderValue = String(formData.get("folder") || "products")
    const folder = validFolders.has(folderValue) ? folderValue : "products"

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was received by the upload route." }, { status: 400 })
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "The selected file is empty." }, { status: 400 })
    }

    const safeName = sanitizeObjectName(file.name || "upload")
    const objectKey = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`
    const contentType = file.type || "application/octet-stream"
    const buffer = Buffer.from(await file.arrayBuffer())

    await createR2Client().send(
      new PutObjectCommand({
        Bucket: requireR2BucketName(),
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      })
    )

    return NextResponse.json({
      uploaded: true,
      objectKey,
      publicUrl: publicUrlFor(objectKey),
      fileName: file.name || safeName,
      size: file.size,
      contentType,
    })
  } catch (error) {
    console.error("ADMIN R2 SERVER UPLOAD ERROR:", error)

    return NextResponse.json(
      {
        error: getErrorMessage(error),
        hint: "Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in .env.local, then restart npm run dev.",
      },
      { status: 500 }
    )
  }
}

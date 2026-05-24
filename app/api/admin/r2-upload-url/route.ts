import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
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
  return "Failed to create upload URL"
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse()

  try {
    const body = await req.json()
    const rawFolder = String(body.folder || "")
    const rawFileName = String(body.fileName || "upload")
    const folderFromPath = rawFileName.startsWith("thumbnails/") ? "thumbnails" : "products"
    const folder = validFolders.has(rawFolder) ? rawFolder : folderFromPath
    const baseName = rawFileName.split("/").pop() || "upload"
    const objectKey = `${folder}/${Date.now()}-${randomUUID()}-${sanitizeObjectName(baseName)}`
    const contentType = String(body.contentType || "application/octet-stream")

    const command = new PutObjectCommand({
      Bucket: requireR2BucketName(),
      Key: objectKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(createR2Client(), command, { expiresIn: 60 * 5 })

    return NextResponse.json({
      uploadUrl,
      objectKey,
      publicUrl: publicUrlFor(objectKey),
    })
  } catch (error) {
    console.error("ADMIN R2 SIGNED URL ERROR:", error)

    return NextResponse.json(
      {
        error: getErrorMessage(error),
        hint: "Check R2 environment variables. If browser-to-R2 upload has CORS issues, use /api/admin/r2-upload instead.",
      },
      { status: 500 }
    )
  }
}

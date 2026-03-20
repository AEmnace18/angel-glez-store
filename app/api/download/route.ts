import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

function extractObjectKey(input: string) {
  if (!input) return ""

  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    return input
  }

  try {
    const url = new URL(input)
    const path = url.pathname.replace(/^\/+/, "")
    const bucketName = process.env.R2_BUCKET_NAME || ""

    if (bucketName && path.startsWith(`${bucketName}/`)) {
      return path.slice(bucketName.length + 1)
    }

    return path
  } catch {
    return input
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawFileKey = String(body.fileKey || "")
    const fileName = String(body.fileName || "download")

    if (!rawFileKey) {
      return NextResponse.json({ error: "Missing file key" }, { status: 400 })
    }

    const objectKey = extractObjectKey(rawFileKey)

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    })

    const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 })

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error)
    return NextResponse.json({ error: "Failed to prepare download" }, { status: 500 })
  }
}
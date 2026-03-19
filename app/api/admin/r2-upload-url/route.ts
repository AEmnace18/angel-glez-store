import { NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  try {
    const { fileName, contentType } = await req.json()

    const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const objectKey = `products/${Date.now()}-${cleanName}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    })

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 })

    return NextResponse.json({
      uploadUrl,
      objectKey,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
  }
}
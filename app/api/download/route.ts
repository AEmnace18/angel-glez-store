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

export async function POST(req: Request) {
  try {
    const { fileKey, fileName } = await req.json()

    if (!fileKey) {
      return NextResponse.json({ error: "Missing file key" }, { status: 400 })
    }

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileKey,
      ResponseContentDisposition: `attachment; filename="${fileName || "download"}"`,
    })

    const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 60 * 5 })

    return NextResponse.json({ downloadUrl })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 })
  }
}
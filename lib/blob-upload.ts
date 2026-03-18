"use client"

import { upload } from "@vercel/blob/client"

export async function uploadToBlob(file: File, folder: string) {
  const safeName = file.name.replace(/\s+/g, "-")

  const blob = await upload(`${folder}/${Date.now()}-${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
  })

  return blob
}
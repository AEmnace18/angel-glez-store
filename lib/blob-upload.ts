import { put } from "@vercel/blob";

export async function uploadToBlob(file: File) {
  const res = await put(file.name, file, {
    access: "private",
  });

  return res.url;
}
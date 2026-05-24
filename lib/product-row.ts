export type ProductRow = {
  id: number | string
  title?: string | null
  description?: string | null
  price?: number | string | null
  quarter?: string | null
  grade?: string | null
  file_name?: string | null
  file_url?: string | null
  image_url?: string | null
  likes?: number | string | null
  sold?: number | string | null
}

export type Product = {
  id: number
  title: string
  description: string
  price: number
  quarter: string
  grade: string
  fileName: string
  imageUrl: string
  likes: number
  sold: number
}

function titleCaseGrade(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function normalizeProductRow(item: ProductRow): Product {
  return {
    id: Number(item.id),
    title: item.title || "Untitled Product",
    description: item.description || "",
    price: Number(item.price || 0),
    quarter: String(item.quarter || "").trim().toUpperCase(),
    grade: titleCaseGrade(String(item.grade || "")),
    fileName: item.file_name || "",
    imageUrl: item.image_url || "",
    likes: Number(item.likes || 0),
    sold: Number(item.sold || 0),
  }
}

export function normalizeProductRows(rows: ProductRow[] | null | undefined): Product[] {
  return (rows || []).map(normalizeProductRow)
}

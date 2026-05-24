export function getProductImageSrc(value?: string | null) {
  const raw = String(value || "").trim()

  if (!raw) return ""
  if (/^(blob:|data:)/i.test(raw)) return raw
  if (raw.startsWith("/api/product-image")) return raw
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw

  return `/api/product-image?src=${encodeURIComponent(raw)}`
}

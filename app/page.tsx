"use client"

import { type CSSProperties, useEffect, useMemo, useState } from "react"
import toast from "react-hot-toast"
import { apiJson } from "@/lib/api-client"
import { getProductImageSrc } from "@/lib/product-image-src"
import { normalizeProductRows, type Product, type ProductRow } from "@/lib/product-row"

const PURCHASES_KEY = "angel-glez-purchases"
const CART_KEY = "angel-glez-cart"
const LIKES_KEY = "angel-glez-likes"

const quarters = [
  { code: "Q1", label: "Q1", name: "Quarter 1" },
  { code: "Q2", label: "Q2", name: "Quarter 2" },
  { code: "Q3", label: "Q3", name: "Quarter 3" },
  { code: "Q4", label: "Q4", name: "Quarter 4" },
]

const grades = [
  "Kinder",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
]

type ReviewDraft = {
  rating: number
  count: number
}

type ReviewEntry = {
  id: string
  rating: number
  text: string
  author: string
}

type PurchaseLookup = {
  id: string
  status: "pending" | "approved" | "rejected"
  products: {
    id: number
  } | null
}

const toastStyle = {
  borderRadius: "14px",
  background: "#0f172a",
  color: "#fff",
}

const animationIndexStyle = (value: number): CSSProperties & { "--i": number } => ({
  "--i": value,
})

const getQuarterPreviewProducts = (products: Product[], quarterLabel: string) =>
  products.filter((p) => p.quarter === quarterLabel).slice(0, 2)

const getGradePreviewProducts = (
  products: Product[],
  quarterLabel: string,
  gradeLabel: string
) => products.filter((p) => p.quarter === quarterLabel && p.grade === gradeLabel).slice(0, 1)

function CartIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  )
}

function HeartIcon({
  className = "h-5 w-5",
  filled = false,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M12 21s-6.7-4.3-9.2-8.1C.9 9.9 2 5.5 6.1 4.5c2.3-.6 4.2.5 5.1 2.1.9-1.6 2.8-2.7 5.1-2.1 4.1 1 5.2 5.4 3.3 8.4C18.7 16.7 12 21 12 21z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FolderShell({
  children,
  active = false,
  color = "amber",
  size = "default",
  className = "",
}: {
  children: React.ReactNode
  active?: boolean
  color?: "amber" | "violet"
  size?: "default" | "compact"
  className?: string
}) {
  const [style, setStyle] = useState({ rotateX: 0, rotateY: 0, translateY: 0, glareX: 50, glareY: 50 })
  const isCompact = size === "compact"

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = x / rect.width
    const py = y / rect.height

    setStyle({
      rotateX: (0.5 - py) * 7,
      rotateY: (px - 0.5) * 10,
      translateY: -6,
      glareX: px * 100,
      glareY: py * 100,
    })
  }

  const reset = () => setStyle({ rotateX: 0, rotateY: 0, translateY: 0, glareX: 50, glareY: 50 })
  const stackStyle: CSSProperties & Record<"--glare-x" | "--glare-y", string> = {
    transform: `rotateX(${style.rotateX}deg) rotateY(${style.rotateY}deg) translateY(${style.translateY}px)`,
    transformStyle: "preserve-3d",
    "--glare-x": `${style.glareX}%`,
    "--glare-y": `${style.glareY}%`,
  }

  return (
    <div
      className={`skeuo-folder-shell ${color === "amber" ? "skeuo-folder-amber" : "skeuo-folder-violet"} ${isCompact ? "compact" : ""} ${active ? "is-open" : ""} group relative w-full [perspective:1800px] ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      <div className="skeuo-folder-cast-shadow" />
      <div
        className="skeuo-folder-stack"
        style={stackStyle}
      >
        <div className="skeuo-folder-tab" />
        <div className="skeuo-folder-back" />
        <div className="skeuo-folder-paper paper-one" />
        <div className="skeuo-folder-paper paper-two" />
        <div className="skeuo-folder-front">
          <div className="skeuo-folder-grain" />
          <div className="skeuo-folder-crease" />
          <div className="skeuo-folder-pocket" />
          <div className="skeuo-folder-label-card">{children}</div>
        </div>
      </div>
    </div>
  )
}


function QuarterFolderCard({
  quarter,
  previewItems,
  quarterCount,
  isActive,
}: {
  quarter: { code: string; label: string; name: string }
  previewItems: Product[]
  quarterCount: number
  isActive: boolean
}) {
  const folderSheetItems = previewItems.filter((item) => item.imageUrl).slice(0, 3)

  return (
    <div className="group relative mx-auto flex min-h-[310px] w-full max-w-[290px] flex-col items-center justify-end pt-8">
      <div className="pointer-events-none absolute bottom-[68px] h-12 w-[80%] rounded-full bg-amber-950/24 blur-[30px] transition-all duration-300 group-hover:translate-y-1 group-hover:scale-110 group-hover:bg-amber-950/30" />

      <div className="file relative z-50 h-[205px] w-[270px] cursor-pointer origin-bottom [perspective:1500px]">
        <div className="work-5 relative h-full w-full origin-top rounded-2xl rounded-tl-none border border-amber-700/25 bg-[linear-gradient(180deg,#e58a05_0%,#d97706_55%,#b45309_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,.28),inset_0_-14px_24px_rgba(92,38,8,.22),0_18px_30px_rgba(120,53,15,.16)] transition-all duration-300 ease-out after:absolute after:bottom-[99%] after:left-0 after:h-5 after:w-24 after:rounded-t-2xl after:border after:border-amber-700/25 after:border-b-0 after:bg-[linear-gradient(180deg,#f59e0b,#d97706)] after:content-[''] before:absolute before:-top-[18px] before:left-[91px] before:h-5 before:w-5 before:bg-amber-600 before:[clip-path:polygon(0_35%,0%_100%,50%_100%)] group-hover:shadow-[inset_0_2px_0_rgba(255,255,255,.32),inset_0_-14px_24px_rgba(92,38,8,.22),0_24px_42px_rgba(120,53,15,.24)]" />

        <div className="work-4 absolute inset-1 z-10 origin-bottom select-none rounded-2xl border border-zinc-300/80 bg-[linear-gradient(180deg,#d8d4cc_0%,#a8a29e_100%)] shadow-[0_8px_16px_rgba(15,23,42,.10),inset_0_1px_0_rgba(255,255,255,.65)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-20deg)]" />
        <div className="work-3 absolute inset-1 z-20 origin-bottom rounded-2xl border border-zinc-200/90 bg-[linear-gradient(180deg,#eee9df_0%,#d6d3d1_100%)] shadow-[0_8px_16px_rgba(15,23,42,.08),inset_0_1px_0_rgba(255,255,255,.72)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-30deg)]" />
        <div className="work-2 absolute inset-1 z-30 origin-bottom rounded-2xl border border-white/70 bg-[linear-gradient(180deg,#fffaf1_0%,#e7e5e4_100%)] shadow-[0_10px_18px_rgba(15,23,42,.08),inset_0_1px_0_rgba(255,255,255,.88)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-38deg)]" />

        {folderSheetItems.length > 0 ? (
          folderSheetItems.map((item, index) => {
            const placements = [
              "left-7 bottom-[82px] h-[110px] w-[82px] rotate-[-5deg] group-hover:-translate-y-7 group-hover:rotate-[-8deg]",
              "left-[93px] bottom-[88px] h-[118px] w-[86px] rotate-[1deg] group-hover:-translate-y-9 group-hover:rotate-[0deg]",
              "right-7 bottom-[82px] h-[110px] w-[82px] rotate-[6deg] group-hover:-translate-y-7 group-hover:rotate-[9deg]",
            ]
            return (
              <div
                key={`folder-product-sheet-${item.id}`}
                className={`absolute z-40 overflow-hidden rounded-xl border border-white/85 bg-white shadow-[0_12px_22px_rgba(15,23,42,.20),inset_0_1px_0_rgba(255,255,255,.80)] ring-1 ring-amber-950/5 transition-all duration-300 ease-out ${placements[index] || placements[2]}`}
              >
                <img src={getProductImageSrc(item.imageUrl)} alt={item.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(15,23,42,.16))]" />
              </div>
            )
          })
        ) : (
          <div className="absolute left-1/2 top-[72px] z-40 flex h-[54px] w-[150px] -translate-x-1/2 items-center justify-center rounded-2xl border border-dashed border-amber-900/12 bg-white/55 text-xs font-black text-amber-950/45 shadow-sm transition-all duration-300 group-hover:-translate-y-5">
            No preview yet
          </div>
        )}

        <div className="work-1 absolute bottom-0 z-50 flex h-[198px] w-full origin-bottom flex-col justify-end rounded-2xl rounded-tr-none border border-amber-300/75 bg-[linear-gradient(180deg,#ffd66b_0%,#ffc02e_35%,#f59e0b_70%,#d97706_100%)] px-5 pb-4 shadow-[inset_0_2px_0_rgba(255,255,255,.52),inset_0_-18px_26px_rgba(146,64,14,.24),0_16px_24px_rgba(120,53,15,.14)] transition-all duration-300 ease-out after:absolute after:bottom-[99%] after:right-0 after:h-5 after:w-[164px] after:rounded-t-2xl after:border after:border-amber-300/75 after:border-b-0 after:bg-[linear-gradient(180deg,#ffdd75,#fbbf24)] after:content-[''] before:absolute before:-top-[13px] before:right-[160px] before:size-4 before:bg-amber-300 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%)] group-hover:shadow-[inset_0_24px_40px_rgba(255,237,163,.84),inset_0_-20px_40px_rgba(217,119,6,.72),0_22px_34px_rgba(120,53,15,.22)] group-hover:[transform:rotateX(-46deg)_translateY(1px)]">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,.38),transparent_28%),linear-gradient(115deg,rgba(255,255,255,.22),transparent_44%)]" />
          <div className="pointer-events-none absolute inset-x-4 top-6 h-px bg-amber-50/55 shadow-[0_1px_0_rgba(146,64,14,.16)]" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.10] [background-image:radial-gradient(rgba(120,53,15,.45)_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="relative z-10 rounded-[20px] border border-amber-900/12 bg-[linear-gradient(180deg,#fff9e6_0%,#ffefbd_100%)] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,.86),inset_0_-8px_16px_rgba(180,83,9,.08),0_12px_20px_rgba(120,53,15,.18)] transition-opacity duration-300 group-hover:opacity-90">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-900/55">{quarter.code}</p>
                <h3 className="mt-0.5 text-[1.85rem] font-black leading-[0.9] tracking-tight text-amber-950">
                  {quarter.name}
                </h3>
              </div>
              {isActive && (
                <span className="shrink-0 rounded-full bg-violet-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_16px_rgba(109,40,217,.22)]">
                  Active
                </span>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <span className="rounded-full bg-[linear-gradient(180deg,#78350f,#451a03)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,.20),0_4px_8px_rgba(69,26,3,.18)]">
                {quarterCount} {quarterCount === 1 ? "Product" : "Products"}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-black text-amber-950">
                Open folder <span aria-hidden>→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function GradeFolderCard({
  grade,
  previewItems,
  gradeCount,
}: {
  grade: string
  previewItems: Product[]
  gradeCount: number
}) {
  const folderSheetItems = previewItems.filter((item) => item.imageUrl).slice(0, 3)

  return (
    <div className="group relative mx-auto flex min-h-[275px] w-full max-w-[270px] items-end justify-center pt-9">
      <div className="pointer-events-none absolute bottom-1 h-10 w-[78%] rounded-full bg-violet-950/22 blur-[26px] transition-all duration-300 group-hover:translate-y-1 group-hover:scale-110" />

      <div className="relative z-10 h-[225px] w-full cursor-pointer origin-bottom [perspective:1500px]">
        <div className="absolute inset-x-0 bottom-0 h-[194px] w-full origin-top rounded-2xl rounded-tl-none border border-violet-700/25 bg-[linear-gradient(180deg,#8b5cf6_0%,#7c3aed_55%,#5b21b6_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,.26),inset_0_-14px_24px_rgba(46,16,101,.22),0_18px_30px_rgba(76,29,149,.16)] transition-all duration-300 ease-out after:absolute after:bottom-[99%] after:left-0 after:h-5 after:w-24 after:rounded-t-2xl after:border after:border-violet-700/25 after:border-b-0 after:bg-[linear-gradient(180deg,#a78bfa,#7c3aed)] after:content-[''] before:absolute before:-top-[17px] before:left-[91px] before:h-5 before:w-5 before:bg-violet-600 before:[clip-path:polygon(0_35%,0%_100%,50%_100%)] group-hover:shadow-[inset_0_2px_0_rgba(255,255,255,.30),inset_0_-14px_24px_rgba(46,16,101,.22),0_24px_42px_rgba(76,29,149,.24)]" />
        <div className="absolute inset-1 bottom-3 origin-bottom select-none rounded-2xl border border-zinc-300/80 bg-[linear-gradient(180deg,#d8d4cc_0%,#a8a29e_100%)] shadow-[0_8px_16px_rgba(30,27,75,.10),inset_0_1px_0_rgba(255,255,255,.65)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-20deg)]" />
        <div className="absolute inset-1 bottom-3 origin-bottom rounded-2xl border border-zinc-200/90 bg-[linear-gradient(180deg,#eee9df_0%,#d6d3d1_100%)] shadow-[0_8px_16px_rgba(30,27,75,.08),inset_0_1px_0_rgba(255,255,255,.72)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-30deg)]" />
        <div className="absolute inset-1 bottom-3 origin-bottom rounded-2xl border border-white/70 bg-[linear-gradient(180deg,#fffaf1_0%,#e7e5e4_100%)] shadow-[0_10px_18px_rgba(30,27,75,.08),inset_0_1px_0_rgba(255,255,255,.88)] transition-all duration-300 ease-out group-hover:[transform:rotateX(-38deg)]" />

        {folderSheetItems.length > 0 && (
          <div className="pointer-events-none absolute inset-x-5 bottom-[92px] z-20 h-[100px]">
            {folderSheetItems.map((item, index) => {
              const positions = [
                "left-1 top-3 w-[35%] rotate-[-7deg] group-hover:-translate-y-4 group-hover:rotate-[-10deg]",
                "left-[32%] top-0 w-[38%] rotate-[1deg] group-hover:-translate-y-6 group-hover:rotate-[0deg]",
                "right-1 top-4 w-[33%] rotate-[8deg] group-hover:-translate-y-4 group-hover:rotate-[10deg]",
              ]
              return (
                <div
                  key={`grade-sheet-${item.id}`}
                  className={`absolute h-[98px] overflow-hidden rounded-[15px] border border-white/85 bg-white shadow-[0_12px_20px_rgba(30,27,75,.20),inset_0_1px_0_rgba(255,255,255,.80)] ring-1 ring-violet-950/5 transition-all duration-300 ease-out ${positions[index] || positions[2]}`}
                >
                  <img src={getProductImageSrc(item.imageUrl)} alt={item.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.05),rgba(30,27,75,.20))]" />
                </div>
              )
            })}
          </div>
        )}

        <div className="absolute bottom-0 z-30 flex h-[188px] w-full origin-bottom flex-col justify-end rounded-2xl rounded-tr-none border border-violet-300/75 bg-[linear-gradient(180deg,#d8b4fe_0%,#c084fc_32%,#8b5cf6_68%,#6d28d9_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,.48),inset_0_-18px_26px_rgba(76,29,149,.24),0_16px_24px_rgba(76,29,149,.14)] transition-all duration-300 ease-out after:absolute after:bottom-[99%] after:right-0 after:h-5 after:w-[61%] after:rounded-t-2xl after:border after:border-violet-300/75 after:border-b-0 after:bg-[linear-gradient(180deg,#ddd6fe,#c084fc)] after:content-[''] before:absolute before:-top-[12px] before:right-[59%] before:h-4 before:w-4 before:bg-violet-300 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%)] group-hover:shadow-[inset_0_24px_40px_rgba(221,214,254,.90),inset_0_-20px_40px_rgba(124,58,237,.78),0_22px_34px_rgba(76,29,149,.22)] group-hover:[transform:rotateX(-46deg)_translateY(1px)]">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_18%_14%,rgba(255,255,255,.28),transparent_28%),linear-gradient(115deg,rgba(255,255,255,.18),transparent_44%)]" />
          <div className="absolute inset-0 rounded-2xl opacity-20 [background-image:radial-gradient(rgba(76,29,149,.32)_1px,transparent_1px)] [background-size:12px_12px]" />
          <div className="pointer-events-none absolute inset-x-4 top-6 h-px bg-violet-50/55 shadow-[0_1px_0_rgba(76,29,149,.16)]" />
          <div className="relative z-10 mx-4 mb-4 rounded-[20px] border border-violet-900/12 bg-[linear-gradient(180deg,#ffffff_0%,#f3edff_100%)] p-3.5 shadow-[inset_0_2px_0_rgba(255,255,255,.88),inset_0_-8px_16px_rgba(124,58,237,.08),0_12px_20px_rgba(76,29,149,.18)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="text-xl font-black tracking-tight text-slate-900">{grade}</h4>
              <span className="rounded-full bg-[linear-gradient(180deg,#8b5cf6,#6d28d9)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_4px_8px_rgba(76,29,149,.18)]">
                Open
              </span>
            </div>

            <div className="relative h-[58px] overflow-hidden rounded-[16px] bg-violet-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,.70)]">
              {folderSheetItems.length > 0 ? (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-7 rounded-t-[14px] bg-[linear-gradient(180deg,rgba(221,214,254,.82),rgba(196,181,253,.96))]" />
                  {folderSheetItems.slice(0, 2).map((item, index) => (
                    <div
                      key={`grade-pocket-${item.id}`}
                      className={`absolute bottom-2 h-[50px] overflow-hidden rounded-[11px] border border-white/80 bg-white shadow-[0_6px_12px_rgba(30,27,75,.12)] transition-all duration-300 ease-out ${
                        index === 0
                          ? "left-3 w-[43%] -rotate-3 group-hover:-translate-y-2"
                          : "right-3 w-[43%] rotate-3 group-hover:-translate-y-3"
                      }`}
                    >
                      <img src={getProductImageSrc(item.imageUrl)} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">
                  No preview yet
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="rounded-full bg-[linear-gradient(180deg,#1e1b4b,#0f172a)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_4px_8px_rgba(15,23,42,.16)]">
                {gradeCount} {gradeCount === 1 ? "item" : "items"}
              </span>
              <span className="font-bold text-slate-500 transition-transform duration-300 group-hover:translate-x-1">Open →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnimatedAddToCartButton({
  inCart,
  onClick,
  className = "",
}: {
  inCart: boolean
  onClick: () => void
  className?: string
}) {
  const addLetters = ["A", "d", "d", " ", "t", "o", " ", "c", "a", "r", "t"]
  const addedLetters = ["A", "d", "d", "e", "d"]

  const renderLetters = (letters: string[], offset = 0) =>
    letters.map((letter, index) => (
      <span key={`${letter}-${index}`} style={animationIndexStyle(index + offset)}>
        {letter === " " ? " " : letter}
      </span>
    ))

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cart-action-button ${inCart ? "is-added" : ""} ${className}`}
      aria-label={inCart ? "Already in cart" : "Add to cart"}
    >
      <div className="cart-button-wrap">
        <div className="cart-state cart-state--default">
          <div className="cart-icon-cart">
            <svg strokeLinejoin="round" strokeLinecap="round" strokeWidth={2} stroke="currentColor" fill="none" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <circle r={1} cy={21} cx={8} />
              <circle r={1} cy={21} cx={19} />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </div>
          <div className="cart-icon-plus">
            <svg strokeLinejoin="round" strokeLinecap="round" strokeWidth={2} stroke="currentColor" fill="none" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </div>
          <p>{renderLetters(addLetters)}</p>
        </div>
        <div className="cart-state cart-state--added">
          <div className="cart-icon-plus">
            <svg strokeLinejoin="round" strokeLinecap="round" strokeWidth={2} stroke="currentColor" fill="none" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p>{renderLetters(addedLetters, 5)}</p>
        </div>
      </div>
      <div className="cart-button-bg" />
      <div className="cart-button-bg-spin" />
      <div className="cart-button-bg-gradient" />
    </button>
  )
}

function AnimatedBuyNowButton({
  onClick,
  className = "",
}: {
  onClick: () => void
  className?: string
}) {
  const buyLetters = ["B", "u", "y", " ", "N", "o", "w"]
  const openingLetters = ["O", "p", "e", "n", "i", "n", "g"]

  const renderLetters = (letters: string[], offset = 0) =>
    letters.map((letter, index) => (
      <span key={`${letter}-${index}`} style={animationIndexStyle(index + offset)}>
        {letter === " " ? " " : letter}
      </span>
    ))

  return (
    <button
      type="button"
      onClick={onClick}
      className={`buy-action-button ${className}`}
      aria-label="Buy now"
    >
      <div className="buy-button-wrap">
        <div className="buy-state buy-state--default">
          <div className="buy-icon-cart">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={8} cy={21} r={1} />
              <circle cx={19} cy={21} r={1} />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </div>
          <div className="buy-icon-plus">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </div>
          <p>{renderLetters(buyLetters)}</p>
        </div>
        <div className="buy-state buy-state--added">
          <div className="buy-icon-plus">
            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p>{renderLetters(openingLetters, 5)}</p>
        </div>
      </div>
      <div className="buy-button-bg" />
      <div className="buy-button-bg-spin" />
      <div className="buy-button-bg-gradient" />
    </button>
  )
}


export default function Home() {
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [purchases, setPurchases] = useState<number[]>([])
  const [purchaseIdsByProduct, setPurchaseIdsByProduct] = useState<Record<number, string>>({})
  const [cart, setCart] = useState<number[]>([])
  const [likedIds, setLikedIds] = useState<number[]>([])
  const [animatingHeart, setAnimatingHeart] = useState<number | null>(null)
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [modalQuarter, setModalQuarter] = useState<string | null>(null)
  const [modalGrade, setModalGrade] = useState<string | null>(null)
  const [folderPulse, setFolderPulse] = useState<string | null>(null)
  const [folderWhoosh, setFolderWhoosh] = useState(false)
  const [productRatings, setProductRatings] = useState<Record<number, ReviewDraft>>({})
  const [productReviews, setProductReviews] = useState<Record<number, ReviewEntry[]>>({})
  const [reviewingProductId, setReviewingProductId] = useState<number | null>(null)
  const [hoveredStars, setHoveredStars] = useState(0)
  const [selectedStars, setSelectedStars] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [finderGrade, setFinderGrade] = useState("All Grades")
  const [finderQuarter, setFinderQuarter] = useState("All Quarters")
  const [finderSearch, setFinderSearch] = useState("")
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  const triggerFolderFeel = (key: string) => {
    setFolderPulse(key)
    setFolderWhoosh(true)

    window.setTimeout(() => {
      setFolderPulse(null)
    }, 360)

    window.setTimeout(() => {
      setFolderWhoosh(false)
    }, 260)
  }

  const openQuarterFolder = (quarterLabel: string) => {
    triggerFolderFeel(`quarter-${quarterLabel}`)
    setSelectedQuarter(quarterLabel)
    setSelectedGrade(null)
    setModalQuarter(quarterLabel)
    setModalGrade(null)
  }

  const openGradeFolder = (gradeLabel: string) => {
    if (modalQuarter) {
      triggerFolderFeel(`grade-${modalQuarter}-${gradeLabel}`)
    }
    setSelectedGrade(gradeLabel)
    setModalGrade(gradeLabel)
  }

  useEffect(() => {
    const savedPurchases = localStorage.getItem(PURCHASES_KEY)
    const savedCart = localStorage.getItem(CART_KEY)
    const savedLikes = localStorage.getItem(LIKES_KEY)
    const savedEmail = localStorage.getItem("angel-glez-buyer-email") || ""

    if (savedPurchases) setPurchases(JSON.parse(savedPurchases))
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedLikes) setLikedIds(JSON.parse(savedLikes))

    if (savedEmail) {
      fetch(`/api/purchases?buyerEmail=${encodeURIComponent(savedEmail)}`)
        .then((response) => (response.ok ? response.json() : { purchases: [] }))
        .then(({ purchases: loadedPurchases }: { purchases?: PurchaseLookup[] }) => {
          const approved = (loadedPurchases || []).reduce<{
            ids: number[]
            byProduct: Record<number, string>
          }>(
            (acc, purchase) => {
              if (purchase.status === "approved" && purchase.products?.id) {
                const productId = Number(purchase.products.id)
                acc.ids.push(productId)
                acc.byProduct[productId] = purchase.id
              }
              return acc
            },
            { ids: [], byProduct: {} }
          )

          if (approved.ids.length > 0) {
            setPurchases((current) => [...new Set([...current, ...approved.ids])])
            setPurchaseIdsByProduct(approved.byProduct)
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const savedRatings = localStorage.getItem("angel-glez-ratings")
    if (savedRatings) {
      try {
        setProductRatings(JSON.parse(savedRatings))
      } catch {}
    }
  }, [])

  useEffect(() => {
    const savedReviews = localStorage.getItem("angel-glez-written-reviews")
    if (savedReviews) {
      try {
        setProductReviews(JSON.parse(savedReviews))
      } catch {}
    }
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true)
      setLoadError(null)

      try {
        const { products: data } = await apiJson<{ products: ProductRow[] }>("/api/products")
        setProducts(normalizeProductRows(data))
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load products.")
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [])

  const featuredProducts = products.slice(0, 6)

  useEffect(() => {
    if (featuredProducts.length <= 1) return

    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev === featuredProducts.length - 1 ? 0 : prev + 1))
    }, 3400)

    return () => clearInterval(interval)
  }, [featuredProducts.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedProduct) {
          setSelectedProduct(null)
          return
        }

        if (modalQuarter) {
          setModalQuarter(null)
          setModalGrade(null)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = selectedProduct || modalQuarter ? "hidden" : ""

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [selectedProduct, modalQuarter])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchQuarter = selectedQuarter ? product.quarter === selectedQuarter : true
      const matchGrade = selectedGrade ? product.grade === selectedGrade : true
      return matchQuarter && matchGrade
    })
  }, [products, selectedQuarter, selectedGrade])

  const smartFinderResults = useMemo(() => {
    const keyword = finderSearch.trim().toLowerCase()

    return products
      .filter((product) => {
        const matchesGrade = finderGrade === "All Grades" ? true : product.grade === finderGrade
        const matchesQuarter =
          finderQuarter === "All Quarters" ? true : product.quarter === finderQuarter
        const matchesKeyword =
          keyword.length === 0
            ? true
            : [product.title, product.description, product.fileName, product.grade, product.quarter]
                .join(" ")
                .toLowerCase()
                .includes(keyword)

        return matchesGrade && matchesQuarter && matchesKeyword
      })
      .slice(0, 6)
  }, [products, finderGrade, finderQuarter, finderSearch])

  const openFinderProduct = (product: Product) => {
    setSelectedQuarter(product.quarter)
    setSelectedGrade(product.grade)
    setSelectedProduct(product)
  }

  const currentFeatured =
    featuredProducts.length > 0 ? featuredProducts[featuredIndex % featuredProducts.length] : null

  const hasPurchased = (id: number) => purchases.includes(id) || Boolean(purchaseIdsByProduct[id])
  const isInCart = (id: number) => cart.includes(id)
  const hasLiked = (id: number) => likedIds.includes(id)
  const isBestSeller = (product: Product) => (product.sold || 0) >= 5

  const getQuarterCount = (quarterLabel: string) =>
    products.filter((p) => p.quarter === quarterLabel).length

  const getGradeCount = (quarterLabel: string, gradeLabel: string) =>
    products.filter((p) => p.quarter === quarterLabel && p.grade === gradeLabel).length

  const getRatingMeta = (productId: number) => {
    const saved = productRatings[productId]
    if (saved) return saved

    const baseRating = 4.5 + ((productId % 5) * 0.1)
    return {
      rating: Number(Math.min(5, baseRating).toFixed(1)),
      count: 8 + (productId % 11),
    }
  }

  const getRecentReviews = (productId: number) => {
    return productReviews[productId] || []
  }

  const submitReview = (productId: number) => {
    if (!selectedStars) {
      toast.error("Pick a star rating first.", { style: toastStyle })
      return
    }

    if (!reviewText.trim()) {
      toast.error("Write a short review first.", { style: toastStyle })
      return
    }

    const current = getRatingMeta(productId)
    const totalScore = current.rating * current.count + selectedStars
    const nextCount = current.count + 1
    const nextRating = Number((totalScore / nextCount).toFixed(1))

    const updatedRatings = {
      ...productRatings,
      [productId]: {
        rating: nextRating,
        count: nextCount,
      },
    }

    const nextReview = {
      id: `${productId}-${Date.now()}`,
      rating: selectedStars,
      text: reviewText.trim(),
      author: "Teacher",
    }

    const updatedReviews = {
      ...productReviews,
      [productId]: [nextReview, ...(productReviews[productId] || [])].slice(0, 5),
    }

    setProductRatings(updatedRatings)
    setProductReviews(updatedReviews)
    localStorage.setItem("angel-glez-ratings", JSON.stringify(updatedRatings))
    localStorage.setItem("angel-glez-written-reviews", JSON.stringify(updatedReviews))
    setReviewingProductId(null)
    setHoveredStars(0)
    setSelectedStars(0)
    setReviewText("")
    toast.success("Review added", { style: toastStyle })
  }

  const addToCart = (product: Product) => {
    if (cart.includes(product.id)) {
      toast("Already in cart", { style: toastStyle })
      return
    }

    const updatedCart = [...cart, product.id]
    setCart(updatedCart)
    localStorage.setItem(CART_KEY, JSON.stringify(updatedCart))
    toast.success("Added to cart", { style: toastStyle })
  }

  const toggleLike = (productId: number) => {
    const alreadyLiked = likedIds.includes(productId)

    const updatedLikedIds = alreadyLiked
      ? likedIds.filter((id) => id !== productId)
      : [...likedIds, productId]

    setLikedIds(updatedLikedIds)
    localStorage.setItem(LIKES_KEY, JSON.stringify(updatedLikedIds))

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product
        const currentLikes = product.likes || 0
        return {
          ...product,
          likes: alreadyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
        }
      })
    )

    setAnimatingHeart(productId)
    setTimeout(() => setAnimatingHeart(null), 360)
  }

  const buyNow = (product: Product) => {
    window.location.href = `/checkout?productId=${product.id}`
  }

  useEffect(() => {
    const handleParallax = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 18
      const y = (e.clientY / window.innerHeight - 0.5) * 18
      setParallax({ x, y })
    }

    window.addEventListener("mousemove", handleParallax)
    return () => window.removeEventListener("mousemove", handleParallax)
  }, [])

  const downloadProduct = async (product: Product) => {
    if (!hasPurchased(product.id)) {
      toast.error("Buy this product first to unlock download.", { style: toastStyle })
      return
    }

    try {
      setDownloadingId(product.id)

      const buyerEmail = localStorage.getItem("angel-glez-buyer-email") || ""
      const purchaseId = purchaseIdsByProduct[product.id]

      if (!buyerEmail || !purchaseId) {
        toast.error("Open your Purchases page to unlock this download.", { style: toastStyle })
        return
      }

      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchaseId,
          buyerEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Download failed")
      }

      window.open(data.downloadUrl, "_blank")
      toast.success("Download ready.", { style: toastStyle })
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Download failed", {
        style: toastStyle,
      })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <>
      <main className={`skeuo-desktop relative min-h-screen overflow-hidden text-slate-900 transition duration-300 ${modalQuarter ? "scale-[0.985] blur-[2px]" : ""}`}>
        <section className="relative overflow-hidden">
          <div className="skeuo-wood-stage absolute inset-0" />
          <div className="skeuo-desk-vignette pointer-events-none absolute inset-0" />
          <div className="skeuo-back-folder pointer-events-none absolute left-[6%] top-[150px] hidden h-[520px] w-[58%] rotate-[-4deg] rounded-[34px] md:block" />
          <div className="skeuo-back-folder-two pointer-events-none absolute right-[7%] top-[210px] hidden h-[390px] w-[330px] rotate-[8deg] rounded-[30px] lg:block" />
          <div className="skeuo-ruler pointer-events-none absolute left-[2%] top-[210px] hidden h-10 w-[360px] rotate-[-16deg] md:block" />
          <div className="skeuo-pencil pointer-events-none absolute right-[8%] top-[165px] hidden h-4 w-[300px] rotate-[18deg] lg:block" />
          <div className="relative">
            <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
              <div className="mx-auto max-w-7xl">
                <div className="skeuo-toolbar rounded-[28px] px-3 py-3 md:px-5 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href="/"
                      className="skeuo-engraved-plaque group flex min-w-0 items-center gap-3 rounded-[22px] px-3 py-2.5 transition duration-300 hover:-translate-y-0.5"
                    >
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-2xl bg-violet-300/20 blur-md transition group-hover:bg-violet-300/30" />
                        <img
                          src="/logo.png"
                          alt="Angel Glez COT Logo"
                          className="relative h-12 w-12 rounded-2xl border border-white object-cover shadow-lg transition duration-300 group-hover:rotate-3 md:h-14 md:w-14"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight text-slate-900 md:text-[1.7rem]">
                          ANGEL GLEZ&apos;s COT
                        </p>
                        <p className="truncate text-[11px] font-medium text-slate-500 md:text-xs">
                          Premium Digital Teaching Essentials
                        </p>
                      </div>
                    </a>

                    <nav className="skeuo-nav-tray hidden items-center gap-2 rounded-[22px] p-2 md:flex">
                      <a
                        href="#quarters"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="#find-my-cot"
                        className="nav-pill rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                      >
                        Find My COT
                      </a>
                      <a
                        href="/shop"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Purchases
                      </a>
                      <a
                        href="/admin-login"
                        className="nav-link rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-stone-100 hover:text-slate-900"
                      >
                        Admin
                      </a>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      <a
                        href="/cart"
                        className="flex items-center gap-2 rounded-[18px] border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:bg-stone-50"
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>Cart {cart.length}</span>
                      </a>

                      <div className="flex items-center gap-2 rounded-[18px] border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-700">
                        <HeartIcon className="h-4 w-4" filled />
                        <span>{likedIds.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                      <a
                        href="/cart"
                        className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        <CartIcon className="h-4 w-4" />
                        <span>{cart.length}</span>
                      </a>
                      <div className="flex items-center gap-1 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-bold text-pink-700">
                        <HeartIcon className="h-4 w-4" filled />
                        <span>{likedIds.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 md:hidden">
                    <div className="grid grid-cols-5 gap-2 rounded-[24px] border border-slate-200 bg-white/90 p-2">
                      <a
                        href="#quarters"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Quarters
                      </a>
                      <a
                        href="#find-my-cot"
                        className="nav-pill rounded-2xl px-2 py-2 text-center text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                      >
                        Finder
                      </a>
                      <a
                        href="/shop"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Shop
                      </a>
                      <a
                        href="/purchases"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Files
                      </a>
                      <a
                        href="/admin-login"
                        className="nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        Admin
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="skeuo-hero-wrap mx-auto max-w-7xl px-4 pb-14 pt-36 md:px-6 md:pb-16 md:pt-40">
              <div className="skeuo-hero-grid grid gap-10 lg:grid-cols-[minmax(0,660px)_minmax(460px,620px)] lg:items-start lg:justify-between xl:gap-12">
                <div
                  className="skeuo-hero-folder relative max-w-[720px] p-6 md:p-8 lg:p-9"
                  style={{
                    transform: `translate3d(${parallax.x * 0.35}px, ${parallax.y * 0.35}px, 0)`,
                    transition: "transform 220ms ease-out",
                  }}
                >
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <img
                      src="/logo.png"
                      alt="Angel Glez COT Logo"
                      className="h-14 w-14 rounded-2xl border border-white object-cover shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_22px_rgba(74,52,31,0.14)] md:h-16 md:w-16"
                    />
                    <div className="skeuo-folder-label inline-flex rounded-[14px] px-4 py-2 text-sm font-bold text-[#4a2b11]">
                      Organized folders, secure delivery, classroom-ready files
                    </div>
                  </div>

                  <h1 className="max-w-[680px] text-[clamp(3rem,5.4vw,5.8rem)] font-black leading-[0.96] tracking-tight text-slate-900">
                    <span className="hero-line block">Ready-to-use COT files</span>
                    <span className="hero-line hero-accent-text block">
                      organized by quarter
                    </span>
                    <span className="hero-line hero-muted-line block text-[clamp(2.15rem,3.35vw,3.4rem)]">
                      then refined by grade level
                    </span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                    Built for busy teachers who need clean, classroom-ready files they can open, edit, and use right away. Find your quarter first, open the grade folder next, then access polished materials made for real classroom work.
                  </p>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                    Save time on lesson preparation, stay organized every quarter, and teach with more confidence using files arranged the way teachers actually browse.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <a
                      href="#quarters"
                      className="skeuo-primary-tab magnetic-btn rounded-[18px] px-6 py-3 font-bold text-white transition hover:scale-[1.03]"
                      style={{
                        boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
                      }}
                    >
                      Open Folder Library
                    </a>
                    <a
                      href="/shop"
                      className="skeuo-secondary-tab magnetic-btn rounded-[18px] px-6 py-3 font-bold text-slate-900 transition"
                    >
                      View Collection
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="skeuo-small-label rounded-[14px] px-4 py-2">
                      Ready-to-edit files
                    </span>
                    <span className="skeuo-small-label rounded-[14px] px-4 py-2">
                      Organized for teachers
                    </span>
                    <span className="skeuo-small-label rounded-[14px] px-4 py-2">
                      Instant secure download
                    </span>
                  </div>

                  <div
                    className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3"
                    style={{
                      transform: `translate3d(${parallax.x * 0.18}px, ${parallax.y * 0.18}px, 0)`,
                      transition: "transform 260ms ease-out",
                    }}
                  >
                    <div className="skeuo-counter-tile rounded-[26px] p-5">
                      <p className="text-3xl font-black text-slate-900">{products.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Teaching Files</p>
                    </div>
                    <div className="skeuo-counter-tile rounded-[26px] p-5">
                      <p className="text-3xl font-black text-slate-900">{cart.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Saved in Cart</p>
                    </div>
                    <div className="skeuo-counter-tile rounded-[26px] p-5">
                      <p className="text-3xl font-black text-slate-900">{likedIds.length}</p>
                      <p className="mt-1 text-sm text-slate-500">Teacher Likes</p>
                    </div>
                  </div>
                </div>

                <div
                  className="skeuo-featured-column hidden lg:block lg:pt-14"
                  style={{
                    transform: `translate3d(${parallax.x * -0.5}px, ${parallax.y * -0.5}px, 0)`,
                    transition: "transform 260ms ease-out",
                  }}
                >
                  <div className="skeuo-featured-case relative mx-auto w-full max-w-[620px] rounded-[34px] p-5">
                    <div className="pointer-events-none absolute inset-x-10 top-8 h-44 rounded-[32px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.14),transparent_65%)] blur-2xl" />
                    <div className="pointer-events-none absolute right-8 top-14 h-40 w-40 rounded-full bg-fuchsia-300/18 blur-3xl" />

                    <div className="skeuo-photo-card relative rounded-[30px] p-5">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">Featured Preview</p>
                          <h3 className="text-2xl font-black text-slate-900">Teacher Marketplace</h3>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/90 px-3 py-2 text-sm font-bold text-violet-700 shadow-sm">
                          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
                          <span>Live</span>
                        </div>
                      </div>

                      {currentFeatured ? (
                        <div className="skeuo-photo-mat rounded-[26px] p-4">
                          <div
                            key={currentFeatured.id}
                            onClick={() => setSelectedProduct(currentFeatured)}
                            className="group cursor-pointer overflow-hidden rounded-[30px] border border-stone-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.96))] shadow-[0_22px_58px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
                            style={{ animation: "cardFloatIn 0.7s ease" }}
                          >
                            <div className="relative overflow-hidden p-4 pb-3">
                              <div className="pointer-events-none absolute inset-x-10 top-3 h-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.10),transparent_60%)] blur-2xl" />

                              <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                                {currentFeatured.imageUrl ? (
                                  <img
                                    src={getProductImageSrc(currentFeatured.imageUrl)}
                                    alt={currentFeatured.title}
                                    className="skeuo-featured-image h-[300px] w-full object-cover transition duration-700 group-hover:scale-[1.045]"
                                  />
                                ) : (
                                  <div className="skeuo-featured-image flex h-[300px] w-full items-center justify-center bg-slate-100 text-slate-400">
                                    No image
                                  </div>
                                )}

                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%)]" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/70 via-slate-950/22 to-transparent" />

                                <div className="absolute left-5 top-5 rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
                                  Featured Pick
                                </div>

                                <div className="absolute right-5 top-5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20">
                                  {currentFeatured.grade || "No grade"}
                                </div>

                                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                                        {currentFeatured.quarter || "No quarter"}
                                      </span>
                                      {isBestSeller(currentFeatured) && (
                                        <span className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-950">
                                          Best Seller
                                        </span>
                                      )}
                                    </div>

                                    <p className="line-clamp-2 max-w-[320px] text-[1.7rem] font-black leading-tight text-white drop-shadow-[0_10px_26px_rgba(15,23,42,0.34)]">
                                      {currentFeatured.title}
                                    </p>
                                  </div>

                                  <div className="shrink-0 rounded-full border border-white/25 bg-white/95 px-4 py-2.5 text-lg font-black text-slate-900 shadow-xl">
                                    ₱{currentFeatured.price}
                                  </div>
                                </div>

                                {featuredProducts.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFeaturedIndex((prev) =>
                                          prev === 0 ? featuredProducts.length - 1 : prev - 1
                                        )
                                      }}
                                      className="absolute left-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/72 text-slate-700 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white hover:shadow-[0_20px_34px_rgba(124,58,237,0.18)]"
                                      aria-label="Previous featured product"
                                    >
                                      ←
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setFeaturedIndex((prev) =>
                                          prev === featuredProducts.length - 1 ? 0 : prev + 1
                                        )
                                      }}
                                      className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/72 text-slate-700 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:scale-105 hover:bg-white hover:shadow-[0_20px_34px_rgba(124,58,237,0.18)]"
                                      aria-label="Next featured product"
                                    >
                                      →
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="px-5 pb-5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                                    {currentFeatured.likes || 0} likes
                                  </span>
                                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    {currentFeatured.sold || 0} sold
                                  </span>
                                </div>

                                <div className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                                  Tap to preview
                                </div>
                              </div>

                              <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
                                {currentFeatured.description || "Clean and ready-to-use classroom material."}
                              </p>
                            </div>
                          </div>

                          {featuredProducts.length > 1 && (
                            <>
                              <div className="mt-4 grid grid-cols-3 gap-3">
                                {featuredProducts.slice(0, 3).map((product, index) => {
                                  const actualIndex = index
                                  const active = featuredIndex === actualIndex

                                  return (
                                    <button
                                      key={product.id}
                                      onClick={() => setFeaturedIndex(actualIndex)}
                                      className={`flex items-center gap-3 rounded-[22px] border p-3 text-left transition ${
                                        active
                                          ? "border-violet-300 bg-violet-50 shadow-[0_14px_32px_rgba(124,58,237,0.12)]"
                                          : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                                      }`}
                                    >
                                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-stone-200 bg-slate-100 shadow-sm">
                                        {product.imageUrl ? (
                                          <img src={getProductImageSrc(product.imageUrl)} alt={product.title} className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                            No image
                                          </div>
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="line-clamp-1 text-sm font-black text-slate-900">
                                          {product.title}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                            {product.grade}
                                          </span>
                                        </div>
                                        <p className="mt-1.5 text-sm font-black text-violet-700">₱{product.price}</p>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>

                              <div className="mt-4 flex items-center justify-center gap-2">
                                {featuredProducts.map((_, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setFeaturedIndex(index)}
                                    className={`h-2.5 rounded-full transition-all ${
                                      featuredIndex === index ? "w-10 bg-violet-600" : "w-2.5 bg-slate-300"
                                    }`}
                                    aria-label={`Show featured product ${index + 1}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-[28px] bg-slate-50 p-10 text-center text-slate-500">
                          {loadingProducts ? "Loading products..." : "Upload products to show live previews here."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="find-my-cot" className="mx-auto -mt-2 max-w-7xl px-4 pb-8 md:px-6">
          <div className="relative overflow-hidden rounded-[34px] border border-amber-200/80 bg-[linear-gradient(180deg,#fff9ea_0%,#f4e2bd_56%,#d8b77d_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-18px_30px_rgba(105,64,18,0.13),0_24px_64px_rgba(74,52,31,0.18)] md:p-5">
            <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(120,53,15,.26)_1px,transparent_1px)] [background-size:13px_13px]" />
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/90" />
            <div className="pointer-events-none absolute bottom-0 left-8 right-8 h-8 rounded-t-full bg-amber-950/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-amber-950/12 bg-[linear-gradient(180deg,#fffdf8_0%,#f7ead0_63%,#ead0a0_100%)] p-4 shadow-[inset_0_2px_0_rgba(255,255,255,0.92),inset_0_-12px_24px_rgba(120,53,15,0.09),0_14px_28px_rgba(95,62,22,0.14)] md:p-5">
              <div className="absolute left-7 top-0 h-8 w-44 rounded-b-[18px] border border-amber-300/80 border-t-0 bg-[linear-gradient(180deg,#fff0b8_0%,#f7ca62_100%)] shadow-[inset_0_-6px_12px_rgba(120,53,15,0.12),0_7px_14px_rgba(120,53,15,0.12)]" />
              <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/35 blur-2xl" />

              <div className="relative grid gap-4 xl:grid-cols-[0.76fr_1.24fr] xl:items-stretch">
                <div className="rounded-[24px] border border-amber-950/10 bg-[linear-gradient(180deg,#fff8e7_0%,#f3dfb9_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-10px_18px_rgba(120,53,15,0.06),0_10px_22px_rgba(95,62,22,0.10)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-violet-200 bg-white/82 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_6px_12px_rgba(109,40,217,0.09)]">
                      Find My COT
                    </span>
                    <span className="rounded-full border border-amber-950/10 bg-white/62 px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                      Live shelf search
                    </span>
                  </div>

                  <h2 className="mt-3 max-w-md text-3xl font-black leading-[0.94] tracking-tight text-slate-950 md:text-[2.35rem]">
                    Pull the right classroom file from the drawer
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                    Search by lesson title, grade, or quarter. The finder narrows the library instantly without opening every folder.
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-[18px] border border-amber-950/10 bg-[linear-gradient(180deg,#fffefb,#efe1c8)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-5px_10px_rgba(120,53,15,0.05),0_7px_14px_rgba(95,62,22,0.08)]">
                      <p className="text-xl font-black text-slate-950">{products.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Files</p>
                    </div>
                    <div className="rounded-[18px] border border-amber-950/10 bg-[linear-gradient(180deg,#fffefb,#efe1c8)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-5px_10px_rgba(120,53,15,0.05),0_7px_14px_rgba(95,62,22,0.08)]">
                      <p className="text-xl font-black text-slate-950">{smartFinderResults.length}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Matches</p>
                    </div>
                    <div className="rounded-[18px] border border-violet-200/70 bg-[linear-gradient(180deg,#ffffff,#f1e7ff)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-5px_10px_rgba(109,40,217,0.07),0_7px_14px_rgba(109,40,217,0.08)]">
                      <p className="text-xl font-black text-violet-700">Live</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Results</p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-slate-950/25 bg-[linear-gradient(180deg,#393576_0%,#282562_58%,#17173a_100%)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.20),inset_0_-20px_28px_rgba(0,0,0,0.25),0_13px_26px_rgba(40,32,74,0.22)]">
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-7 rounded-b-[16px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-400/24 blur-3xl" />

                  <div className="relative flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">Search Cabinet</p>
                      <h3 className="mt-1 text-xl font-black tracking-tight">Filter the file drawer</h3>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
                      {smartFinderResults.length} {smartFinderResults.length === 1 ? 'match' : 'matches'} found
                    </span>
                  </div>

                  <div className="relative mt-4 rounded-[22px] border border-white/16 bg-white/12 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-8px_16px_rgba(0,0,0,0.12),0_12px_24px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                    <div className="grid gap-2 lg:grid-cols-[1.18fr_0.78fr_0.78fr_auto]">
                      <label className="relative block">
                        <span className="pointer-events-none absolute left-4 top-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Keyword</span>
                        <input
                          value={finderSearch}
                          onChange={(e) => setFinderSearch(e.target.value)}
                          placeholder="Search title or file name"
                          className="min-h-[52px] w-full rounded-[16px] border border-white/20 bg-[linear-gradient(180deg,#fff_0%,#eeeaf8_100%)] px-4 pb-2.5 pt-6 text-sm font-bold text-slate-900 outline-none shadow-[inset_0_2px_4px_rgba(15,23,42,0.10),0_8px_16px_rgba(0,0,0,0.10)] transition focus:border-violet-300"
                        />
                      </label>

                      <label className="relative block">
                        <span className="pointer-events-none absolute left-4 top-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Grade</span>
                        <select
                          value={finderGrade}
                          onChange={(e) => setFinderGrade(e.target.value)}
                          className="min-h-[52px] w-full rounded-[16px] border border-white/20 bg-[linear-gradient(180deg,#fff_0%,#eeeaf8_100%)] px-4 pb-2.5 pt-6 text-sm font-black text-slate-900 outline-none shadow-[inset_0_2px_4px_rgba(15,23,42,0.10),0_8px_16px_rgba(0,0,0,0.10)] transition focus:border-violet-300"
                        >
                          <option>All Grades</option>
                          {grades.map((grade) => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="relative block">
                        <span className="pointer-events-none absolute left-4 top-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Quarter</span>
                        <select
                          value={finderQuarter}
                          onChange={(e) => setFinderQuarter(e.target.value)}
                          className="min-h-[52px] w-full rounded-[16px] border border-white/20 bg-[linear-gradient(180deg,#fff_0%,#eeeaf8_100%)] px-4 pb-2.5 pt-6 text-sm font-black text-slate-900 outline-none shadow-[inset_0_2px_4px_rgba(15,23,42,0.10),0_8px_16px_rgba(0,0,0,0.10)] transition focus:border-violet-300"
                        >
                          <option>All Quarters</option>
                          {quarters.map((quarter) => (
                            <option key={quarter.code} value={quarter.label}>
                              {quarter.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        onClick={() => document.getElementById('find-my-cot-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="min-h-[52px] rounded-[16px] border border-violet-300/60 bg-[linear-gradient(180deg,#b768ff_0%,#862ee6_58%,#5b21b6_100%)] px-5 py-3 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.40),inset_0_-6px_9px_rgba(49,20,99,0.38),0_10px_22px_rgba(124,58,237,0.30)] transition hover:-translate-y-0.5 active:translate-y-px"
                      >
                        Find
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {['Kinder', 'Grade 1', 'Grade 3', 'Grade 6', 'Q1', 'Q4'].map((chip) => {
                          const activeChip = chip === finderGrade || chip === finderQuarter
                          return (
                            <button
                              key={chip}
                              onClick={() => {
                                if (chip.startsWith('Q')) {
                                  setFinderQuarter(chip)
                                } else {
                                  setFinderGrade(chip)
                                }
                              }}
                              className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition active:translate-y-px ${
                                activeChip
                                  ? 'border-violet-300 bg-violet-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_18px_rgba(109,40,217,0.24)]'
                                  : 'border-white/14 bg-white/10 text-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-white/16'
                              }`}
                            >
                              {chip}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => {
                          setFinderSearch('')
                          setFinderGrade('All Grades')
                          setFinderQuarter('All Quarters')
                        }}
                        className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-black text-white transition hover:bg-white/16 active:translate-y-px"
                      >
                        Reset filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-4 rounded-[24px] border border-amber-950/12 bg-[linear-gradient(180deg,#f8f1e4_0%,#dec191_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-14px_20px_rgba(105,64,18,0.10),0_12px_24px_rgba(95,62,22,0.12)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-600">Results Drawer</p>
                    <h3 className="mt-0.5 text-xl font-black text-slate-950">Files ready to open</h3>
                  </div>
                  <p className="rounded-full border border-amber-950/10 bg-white/72 px-4 py-2 text-xs font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
                    {smartFinderResults.length} {smartFinderResults.length === 1 ? 'result' : 'results'}
                  </p>
                </div>

                <div id="find-my-cot-results" className="grid gap-3 lg:grid-cols-2">
                  {smartFinderResults.length > 0 ? (
                    smartFinderResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => openFinderProduct(product)}
                        className="group relative overflow-hidden rounded-[22px] border border-amber-950/10 bg-[linear-gradient(180deg,#fffefb_0%,#f4e8d3_100%)] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-7px_14px_rgba(120,53,15,0.06),0_9px_18px_rgba(74,52,31,0.11)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_18px_32px_rgba(74,52,31,0.15)]"
                      >
                        <div className="absolute left-5 top-0 h-4 w-24 rounded-b-[12px] bg-[linear-gradient(180deg,#ffe8a3,#f4c466)] shadow-[inset_0_-4px_8px_rgba(120,53,15,0.10)]" />
                        <div className="grid gap-3 p-3 pt-5 sm:grid-cols-[128px_1fr]">
                          <div className="relative overflow-hidden rounded-[18px] border border-white/75 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_16px_rgba(15,23,42,0.10)]">
                            {product.imageUrl ? (
                              <img
                                src={getProductImageSrc(product.imageUrl)}
                                alt={product.title}
                                className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                              />
                            ) : (
                              <div className="flex h-28 items-center justify-center bg-slate-100 text-sm font-bold text-slate-400">
                                No image
                              </div>
                            )}

                            <div className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm">
                              {product.quarter}
                            </div>
                            <div className="absolute right-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_8px_16px_rgba(109,40,217,0.24)]">
                              {product.grade}
                            </div>
                          </div>

                          <div className="flex min-w-0 flex-col justify-between py-1">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-base font-black leading-tight text-slate-950">
                                  {product.title}
                                </h3>
                                <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-sm font-black text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  ₱{product.price}
                                </span>
                              </div>

                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                                {product.description || product.fileName || 'Classroom-ready file.'}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  {product.likes || 0} likes
                                </span>
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                  {product.sold || 0} sold
                                </span>
                              </div>

                              <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_8px_14px_rgba(15,23,42,0.18)] transition group-hover:bg-violet-700">
                                Open →
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-amber-950/18 bg-white/58 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:col-span-2">
                      <p className="text-base font-black text-slate-900">No exact match yet</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Try a different grade, quarter, or keyword to find nearby classroom-ready files.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="quarters" className="mx-auto max-w-7xl scroll-mt-36 px-4 py-16 md:px-6">
          <div className="skeuo-folder-desk rounded-[44px] p-5 md:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-500">
                Organized Library
              </p>
              <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                Quarter Folders
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              Each quarter now sits on the page like a real manila folder, with a raised tab, paper sheets tucked inside, a front pocket, soft shadows, and a tactile open-folder feel.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {quarters.map((quarter) => {
              const previewItems = getQuarterPreviewProducts(products, quarter.label)
              const quarterCount = getQuarterCount(quarter.label)
              const isActive = selectedQuarter === quarter.label

              return (
                <button
                  key={quarter.code}
                  onClick={() => openQuarterFolder(quarter.label)}
                  className={`w-full text-left transition-transform duration-200 ${folderPulse === `quarter-${quarter.label}` ? "folder-click-bounce" : ""}`}
                >
                  <QuarterFolderCard
                    quarter={quarter}
                    previewItems={previewItems}
                    quarterCount={quarterCount}
                    isActive={isActive}
                  />
                </button>
              )
            })}
          </div>
          </div>
        </section>

        
      </main>

      
      {modalQuarter && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/34 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.24s ease-out" }}
          onClick={() => {
            setModalQuarter(null)
            setModalGrade(null)
          }}
        >
          <div
            className="relative w-full max-w-6xl overflow-hidden rounded-b-[34px] rounded-t-[22px] border border-amber-200/80 bg-[linear-gradient(180deg,#fff8df_0%,#fffdf8_16%,#ffffff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-16px_30px_rgba(120,53,15,0.04),0_36px_120px_rgba(74,52,31,0.26)] backdrop-blur-2xl [perspective:1800px]"
            style={{ animation: "folderPanelIn 0.34s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {folderWhoosh && (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                <div className="folder-whoosh absolute inset-y-0 -left-1/3 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)]" />
              </div>
            )}
            <div
              className="pointer-events-none absolute left-8 top-0 z-10 h-12 w-[46%] rounded-b-[22px] border border-amber-300/80 border-t-0 bg-[linear-gradient(180deg,#ffe9a3_0%,#ffd36c_100%)] opacity-95 shadow-[inset_0_-8px_18px_rgba(120,53,15,0.08),0_10px_24px_rgba(120,53,15,0.14)]"
              style={{
                transformOrigin: "top center",
                transform: "translateZ(24px)",
                animation: "folderFlapOpen 0.42s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
            <div className="relative flex items-center justify-between border-b border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,239,0.88),rgba(255,255,255,0.76))] px-5 pb-4 pt-8 md:px-8">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">Open Folder</span>
                  <span>{modalQuarter}</span>
                  {modalGrade && (
                    <>
                      <span>/</span>
                      <span>{modalGrade}</span>
                    </>
                  )}
                </div>
                <h3 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
                  {modalGrade ? `${modalGrade} Files` : `${modalQuarter} Grade Folders`}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {modalGrade
                    ? "Browse the files inside this grade folder."
                    : "Choose a grade folder to reveal the files inside."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {modalGrade && (
                  <button
                    onClick={() => setModalGrade(null)}
                    className="rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#f6f0e8)] px-4 py-2.5 text-sm font-bold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(74,52,31,0.06)] transition hover:bg-stone-50"
                  >
                    Back to Grades
                  </button>
                )}
                <button
                  onClick={() => {
                    setModalQuarter(null)
                    setModalGrade(null)
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#f6f0e8)] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(74,52,31,0.06)] transition hover:bg-stone-50"
                  aria-label="Close folder modal"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.82),transparent_34%),linear-gradient(180deg,#fffdf8_0%,#f8f2e8_100%)] px-5 py-5 md:px-8 md:py-7" style={{ animation: "folderContentsIn 0.42s ease-out" }}>
              {!modalGrade ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {grades.map((grade) => {
                    const gradeCount = getGradeCount(modalQuarter, grade)
                    const previewItems = getGradePreviewProducts(products, modalQuarter, grade)

                    return (
                      <button
                        key={grade}
                        onClick={() => openGradeFolder(grade)}
                        className={`w-full text-left transition-transform duration-200 ${folderPulse === `grade-${modalQuarter}-${grade}` ? "folder-click-bounce" : ""}`}
                      >
                        <GradeFolderCard
                          grade={grade}
                          previewItems={previewItems}
                          gradeCount={gradeCount}
                        />
                      </button>
                    )
                  })}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
                  No files found inside this folder.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]"
                    >
                      <button
                        onClick={() => {
                          setModalQuarter(null)
                          setModalGrade(null)
                          setSelectedProduct(product)
                        }}
                        className="block w-full text-left"
                      >
                        <div className="relative overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={getProductImageSrc(product.imageUrl)}
                              alt={product.title}
                              className="h-60 w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-60 w-full items-center justify-center bg-slate-100 text-slate-400">
                              No image
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/40 to-transparent" />

                          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                            <div className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-900 shadow">
                              {product.grade || "No grade"}
                            </div>

                            {isBestSeller(product) && (
                              <div className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 shadow-lg">
                                Best Seller
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <h4 className="text-2xl font-black leading-tight text-slate-900">
                              {product.title}
                            </h4>
                          </div>

                          {product.description && (
                            <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-500">
                              {product.description}
                            </p>
                          )}

                          <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                              {product.likes || 0} likes
                            </span>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              {product.sold || 0} sold
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                              {product.quarter || "No quarter"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-3xl font-black text-slate-900">₱{product.price}</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                              View Details
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="border-t border-slate-200 px-5 pb-5 pt-4">
                        <div className="mb-5 flex items-center gap-3">
                          <button
                            onClick={() => toggleLike(product.id)}
                            className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                              hasLiked(product.id)
                                ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.75),0_8px_16px_rgba(236,72,153,0.18)]"
                                : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.85),0_8px_16px_rgba(15,23,42,0.08)]"
                            } ${animatingHeart === product.id ? "heart-pop" : ""}`}
                            aria-label="Like product"
                          >
                            <HeartIcon className="h-5 w-5" filled={hasLiked(product.id)} />
                          </button>

                          <span className="text-sm font-semibold text-slate-500">{product.likes || 0}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {!hasPurchased(product.id) && (
                            <AnimatedAddToCartButton
                              inCart={isInCart(product.id)}
                              onClick={() => addToCart(product)}
                              className="cart-action-button--compact"
                            />
                          )}

                          {hasPurchased(product.id) ? (
                            <button
                              onClick={() => downloadProduct(product)}
                              disabled={downloadingId === product.id}
                              className="rounded-2xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-70"
                            >
                              {downloadingId === product.id ? "Preparing..." : "Download"}
                            </button>
                          ) : (
                            <AnimatedBuyNowButton
                              onClick={() => buyNow(product)}
                              className="cart-action-button--compact"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
{selectedProduct && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md"
          style={{ animation: "modalFadeIn 0.22s ease-out" }}
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-white bg-white shadow-[0_30px_120px_rgba(15,23,42,0.22)]"
            style={{ animation: "modalScaleIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-4 top-4 z-20 flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedProduct?.quarter) {
                    setSelectedQuarter(selectedProduct.quarter)
                    setModalQuarter(selectedProduct.quarter)
                  }

                  if (selectedProduct?.grade) {
                    setSelectedGrade(selectedProduct.grade)
                    setModalGrade(selectedProduct.grade)
                    triggerFolderFeel(`grade-${selectedProduct.quarter}-${selectedProduct.grade}`)
                  }

                  setSelectedProduct(null)
                }}
                className="rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#f6f0e8)] px-4 py-2.5 text-sm font-bold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(74,52,31,0.06)] transition hover:bg-stone-50"
              >
                Back to Folder
              </button>

              <button
                onClick={() => setSelectedProduct(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-[linear-gradient(180deg,#ffffff,#f6f0e8)] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(74,52,31,0.06)] transition hover:bg-stone-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={getProductImageSrc(selectedProduct.imageUrl)}
                      alt={selectedProduct.title}
                      className="h-[260px] w-full object-cover md:h-[420px]"
                    />
                  ) : (
                    <div className="flex h-[260px] w-full items-center justify-center bg-slate-100 text-slate-400 md:h-[420px]">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Price</p>
                      <p className="text-4xl font-black text-slate-900">₱{selectedProduct.price}</p>
                    </div>

                    {hasPurchased(selectedProduct.id) ? (
                      <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                        Purchased
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                        Ready to buy
                      </span>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {!hasPurchased(selectedProduct.id) && (
                      <AnimatedAddToCartButton
                        inCart={isInCart(selectedProduct.id)}
                        onClick={() => addToCart(selectedProduct)}
                        className="w-full"
                      />
                    )}

                    {hasPurchased(selectedProduct.id) ? (
                      <button
                        onClick={() => downloadProduct(selectedProduct)}
                        disabled={downloadingId === selectedProduct.id}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                      >
                        {downloadingId === selectedProduct.id ? "Preparing..." : "Download File"}
                      </button>
                    ) : (
                      <AnimatedBuyNowButton
                        onClick={() => buyNow(selectedProduct)}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                    {selectedProduct.quarter || "No quarter"}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                    {selectedProduct.grade || "No grade"}
                  </span>
                </div>

                {isBestSeller(selectedProduct) && (
                  <div className="mb-5">
                    <span className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-950 shadow-lg">
                      Best Seller
                    </span>
                  </div>
                )}

                <h2 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">
                  {selectedProduct.title}
                </h2>

                <p className="mt-5 text-base leading-8 text-slate-600">
                  {selectedProduct.description || "No description available for this product yet."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => toggleLike(selectedProduct.id)}
                    className={`heart-press flex h-12 w-12 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 ${
                      hasLiked(selectedProduct.id)
                        ? "border-pink-200 bg-[linear-gradient(180deg,#ffe4ef,#ffc9dd)] text-pink-600 shadow-[inset_0_2px_0_rgba(255,255,255,0.75),0_8px_16px_rgba(236,72,153,0.18)]"
                        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eef2ff)] text-slate-500 shadow-[inset_0_2px_0_rgba(255,255,255,0.85),0_8px_16px_rgba(15,23,42,0.08)]"
                    } ${animatingHeart === selectedProduct.id ? "heart-pop" : ""}`}
                    aria-label="Like product"
                  >
                    <HeartIcon className="h-5 w-5" filled={hasLiked(selectedProduct.id)} />
                  </button>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                    {selectedProduct.likes || 0} likes
                  </div>

                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    {selectedProduct.sold || 0} sold
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-violet-100 bg-[linear-gradient(180deg,#fdfbff_0%,#f6f1ff_100%)] shadow-[0_16px_38px_rgba(124,58,237,0.10)]">
                  <div className="border-b border-violet-100/80 px-5 py-4 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">
                          Teacher Reviews
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Trusted classroom feedback from buyers and fellow teachers
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setReviewingProductId(selectedProduct.id)
                          setHoveredStars(0)
                        }}
                        className="rounded-2xl border border-violet-200 bg-white/90 px-4 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"
                      >
                        Write a Review
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-5 px-5 py-5 md:grid-cols-[auto_1fr] md:px-6">
                    <div className="min-w-[130px] rounded-[24px] border border-white/70 bg-white/80 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(15,23,42,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Average
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-5xl font-black leading-none text-slate-900">
                          {getRatingMeta(selectedProduct.id).rating.toFixed(1)}
                        </span>
                        <span className="pb-1 text-sm font-bold text-slate-400">/ 5</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 text-2xl">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <span
                              key={index}
                              className={index < Math.round(getRatingMeta(selectedProduct.id).rating) ? "text-amber-400" : "text-slate-300"}
                            >
                              ★
                            </span>
                          ))}
                        </div>

                        <div className="rounded-full border border-violet-200 bg-white/85 px-3 py-1.5 text-sm font-bold text-slate-700">
                          {getRatingMeta(selectedProduct.id).count} teacher reviews
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                          Classroom-ready
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                          Easy to use
                        </span>
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
                          Teacher-approved
                        </span>
                      </div>

                      {getRecentReviews(selectedProduct.id).length > 0 && (
                        <div className="mt-5 grid gap-3">
                          {getRecentReviews(selectedProduct.id).slice(0, 2).map((review) => (
                            <div
                              key={review.id}
                              className="rounded-[20px] border border-white/80 bg-white/85 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-800">{review.author}</p>
                                <div className="flex items-center gap-1 text-sm">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <span
                                      key={index}
                                      className={index < review.rating ? "text-amber-400" : "text-slate-300"}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-slate-500">{review.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                  Payment continues on the checkout page, then approved purchases unlock secure downloads.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewingProductId && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-md"
          onClick={() => {
            setReviewingProductId(null)
            setHoveredStars(0)
            setSelectedStars(0)
            setReviewText("")
          }}
        >
          <div
            className="w-full max-w-lg rounded-[30px] border border-white bg-white p-6 shadow-[0_30px_120px_rgba(15,23,42,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Write a Review</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Share your classroom feedback</h3>
              </div>
              <button
                onClick={() => {
                  setReviewingProductId(null)
                  setHoveredStars(0)
                  setSelectedStars(0)
                  setReviewText("")
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-500">Your rating</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const star = index + 1
                  const active = star <= (hoveredStars || selectedStars)
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoveredStars(star)}
                      onMouseLeave={() => setHoveredStars(0)}
                      onClick={() => setSelectedStars(star)}
                      className={`text-4xl transition hover:scale-110 ${active ? "text-amber-400" : "text-slate-300"}`}
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      ★
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold text-slate-500">Your short review</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Example: Easy to use and very clean layout for classroom discussion."
                className="mt-3 min-h-[120px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-violet-300 focus:bg-white"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setReviewingProductId(null)
                  setHoveredStars(0)
                  setSelectedStars(0)
                  setReviewText("")
                }}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReview(reviewingProductId)}
                className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`

        .skeuo-desktop {
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,0.88), transparent 34%),
            radial-gradient(circle at 84% 16%, rgba(240,186,87,0.36), transparent 27%),
            linear-gradient(90deg, rgba(97,66,37,0.045) 1px, transparent 1px),
            linear-gradient(180deg, rgba(97,66,37,0.045) 1px, transparent 1px),
            repeating-linear-gradient(92deg, rgba(129,91,50,0.045) 0 2px, transparent 2px 12px),
            linear-gradient(180deg, #efe2cf 0%, #e2d2bd 42%, #ede7dd 100%);
          background-size: auto, auto, 48px 48px, 48px 48px, 180px 180px, auto;
        }

        .skeuo-topbar {
          border: 1px solid rgba(146, 111, 70, 0.24);
          background: linear-gradient(180deg, #fffaf1 0%, #f3eadb 58%, #e3d3bd 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.85),
            inset 0 -2px 0 rgba(99,67,35,0.09),
            0 22px 54px rgba(66,44,22,0.16),
            0 3px 0 rgba(116,83,48,0.08);
          backdrop-filter: blur(12px);
        }

        .skeuo-logo-plaque,
        .skeuo-nav-tray,
        .skeuo-showcase {
          border: 1px solid rgba(130, 102, 68, 0.20);
          background: linear-gradient(180deg, #fffdf8 0%, #f7efe4 100%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(116,83,48,0.08),
            0 12px 26px rgba(66,44,22,0.10);
        }

        .skeuo-paper-sheet {
          border: 1px solid rgba(132, 105, 70, 0.18);
          border-radius: 38px;
          background:
            linear-gradient(90deg, rgba(124,58,237,0.07) 0 1px, transparent 1px),
            linear-gradient(180deg, rgba(15,23,42,0.035) 0 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,244,233,0.90));
          background-size: 100% 34px, 100% 34px, auto;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.96),
            inset 0 -1px 0 rgba(103,71,42,0.08),
            0 34px 80px rgba(72,48,22,0.15),
            0 4px 0 rgba(116,83,48,0.05);
        }

        .skeuo-paper-sheet::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          background:
            radial-gradient(circle at 16% 14%, rgba(124,58,237,0.08), transparent 24%),
            radial-gradient(circle at 86% 8%, rgba(217,119,6,0.12), transparent 22%),
            repeating-linear-gradient(100deg, rgba(75,54,31,0.035) 0 1px, transparent 1px 8px);
          opacity: 0.9;
          mix-blend-mode: multiply;
        }

        .skeuo-paper-sheet::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          width: 82px;
          height: 82px;
          border-top-left-radius: 22px;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(190,168,136,0.30));
          box-shadow: inset 2px 2px 0 rgba(255,255,255,0.55);
          clip-path: polygon(100% 0, 0 100%, 100% 100%);
          pointer-events: none;
        }

        .skeuo-showcase {
          background:
            linear-gradient(180deg, #fffaf1 0%, #efe4d2 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.9),
            0 32px 80px rgba(66,44,22,0.18),
            0 5px 0 rgba(116,83,48,0.06);
        }

        .skeuo-folder-desk {
          position: relative;
          border: 1px solid rgba(111, 78, 42, 0.22);
          background:
            radial-gradient(circle at 14% 10%, rgba(255,255,255,0.56), transparent 28%),
            radial-gradient(circle at 86% 18%, rgba(245,158,11,0.15), transparent 28%),
            repeating-linear-gradient(0deg, rgba(97,66,37,0.035) 0 1px, transparent 1px 9px),
            linear-gradient(180deg, #f4e9d8 0%, #dfcbb0 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.82),
            inset 0 -18px 42px rgba(86,56,26,0.08),
            0 28px 70px rgba(72,48,22,0.14);
        }

        .skeuo-folder-desk::before {
          content: "";
          position: absolute;
          left: 28px;
          right: 28px;
          top: 28px;
          height: 1px;
          background: rgba(255,255,255,0.72);
          pointer-events: none;
        }

        .skeuo-open-folder-panel {
          border: 1px solid rgba(139, 92, 31, 0.25);
          background:
            linear-gradient(180deg, #f9df9e 0%, #e6b65e 22%, #f8f4ec 23%, #ffffff 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.75),
            0 38px 120px rgba(54,36,16,0.30);
          backdrop-filter: blur(16px);
        }



        /* Literal skeuomorphism: physical desktop, manila folders, raised controls. */
        .skeuo-desktop {
          background:
            radial-gradient(circle at 20% 0%, rgba(255,246,226,0.28), transparent 30%),
            radial-gradient(circle at 84% 16%, rgba(104,62,25,0.24), transparent 36%),
            linear-gradient(180deg, #8a5a32 0%, #b7793e 46%, #c89258 100%);
        }

        .skeuo-wood-stage {
          background:
            radial-gradient(circle at 14% 10%, rgba(255,244,219,0.55), transparent 26%),
            radial-gradient(circle at 88% 18%, rgba(255,207,125,0.30), transparent 25%),
            repeating-linear-gradient(92deg, rgba(81,45,19,0.18) 0 2px, rgba(255,221,164,0.06) 2px 6px, transparent 6px 18px),
            linear-gradient(180deg, #a56c38 0%, #c08345 52%, #d3a06d 100%);
        }
        .skeuo-wood-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(62,35,14,0.12) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,237,199,0.10) 1px, transparent 1px);
          background-size: 72px 72px, 72px 72px;
          opacity: 0.35;
        }
        .skeuo-desk-vignette {
          background:
            radial-gradient(circle at center, transparent 0 52%, rgba(54,31,13,0.20) 100%),
            linear-gradient(180deg, rgba(255,247,232,0.22), rgba(70,40,15,0.08));
        }
        .skeuo-back-folder,
        .skeuo-back-folder-two {
          border: 1px solid rgba(115,73,27,0.28);
          background: linear-gradient(180deg, rgba(245,200,113,0.62), rgba(178,107,38,0.48));
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.32), 0 42px 80px rgba(45,27,11,0.18);
        }
        .skeuo-back-folder::before,
        .skeuo-back-folder-two::before {
          content: "";
          position: absolute;
          left: 34px;
          top: -34px;
          height: 58px;
          width: 42%;
          border-radius: 16px 16px 0 0;
          border: 1px solid rgba(115,73,27,0.25);
          background: linear-gradient(180deg, rgba(250,211,129,0.65), rgba(190,119,43,0.50));
        }
        .skeuo-ruler {
          border-radius: 8px;
          border: 1px solid rgba(83,50,19,0.26);
          background: linear-gradient(180deg, #f7d78a, #cc9b48);
          box-shadow: 0 18px 38px rgba(46,28,12,0.22), inset 0 1px 0 rgba(255,255,255,0.55);
        }
        .skeuo-ruler::after {
          content: "";
          position: absolute;
          inset: 6px 12px;
          background: repeating-linear-gradient(90deg, rgba(76,45,15,0.50) 0 1px, transparent 1px 16px);
        }
        .skeuo-pencil {
          border-radius: 999px;
          background: linear-gradient(90deg, #7c2d12 0 8%, #facc15 8% 82%, #d97706 82% 88%, #f7d7b2 88% 96%, #1f2937 96%);
          box-shadow: 0 12px 26px rgba(38,24,10,0.22), inset 0 1px 0 rgba(255,255,255,0.45);
        }
        .skeuo-toolbar {
          position: relative;
          border: 1px solid rgba(75,45,18,0.35);
          background: linear-gradient(180deg, #f4d39c 0%, #d5a45d 48%, #a8682b 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -4px 0 rgba(72,40,13,0.16), 0 24px 46px rgba(42,25,10,0.26), 0 5px 0 rgba(70,39,13,0.14);
        }
        .skeuo-toolbar::before,
        .skeuo-toolbar::after {
          content: "";
          position: absolute;
          top: 22px;
          height: 13px;
          width: 13px;
          border-radius: 999px;
          border: 1px solid rgba(65,38,15,0.45);
          background: radial-gradient(circle at 34% 30%, #fff1ca, #a46b30 52%, #4b2b10 100%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 0 rgba(255,255,255,0.25);
        }
        .skeuo-toolbar::before { left: 22px; }
        .skeuo-toolbar::after { right: 22px; }
        .skeuo-engraved-plaque {
          border: 1px solid rgba(72,44,18,0.22);
          background: linear-gradient(180deg, #fff8e8 0%, #ead4ab 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.78), inset 0 -2px 0 rgba(78,47,18,0.11), 0 10px 18px rgba(50,30,12,0.17);
        }
        .skeuo-nav-tray {
          border: 1px solid rgba(72,44,18,0.25);
          background: linear-gradient(180deg, #a96b32 0%, #75451d 100%);
          box-shadow: inset 0 3px 7px rgba(40,24,10,0.42), inset 0 -1px 0 rgba(255,255,255,0.12), 0 10px 22px rgba(43,25,10,0.18);
        }
        .skeuo-nav-tray .nav-link { color: #fff7e7; text-shadow: 0 1px 1px rgba(50,30,12,0.45); }
        .skeuo-nav-tray .nav-link:hover {
          color: #2b1a0c;
          background: linear-gradient(180deg, #fce6b1, #d29b55);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.62), 0 6px 12px rgba(40,24,10,0.18);
        }
        .skeuo-nav-tray .nav-pill {
          border: 1px solid rgba(43,25,10,0.24);
          background: linear-gradient(180deg, #7c3aed 0%, #5b21b6 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -3px 0 rgba(25,12,62,0.25), 0 12px 20px rgba(54,22,116,0.36);
        }
        .skeuo-header-button,
        .skeuo-secondary-tab,
        .skeuo-primary-tab {
          border: 1px solid rgba(53,31,12,0.24);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.58), inset 0 -3px 0 rgba(47,29,12,0.12), 0 10px 18px rgba(42,25,10,0.18);
        }
        .skeuo-header-button,
        .skeuo-secondary-tab { background: linear-gradient(180deg, #fff8e9 0%, #dfc295 100%); }
        .skeuo-primary-tab { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); }

        .skeuo-hero-folder {
          border: 1px solid rgba(89,54,20,0.28);
          border-radius: 34px 42px 38px 38px;
          background:
            linear-gradient(90deg, rgba(83,48,17,0.045) 1px, transparent 1px),
            linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 18%, rgba(89,51,17,0.08) 100%),
            linear-gradient(180deg, #f2c36b 0%, #d08a34 48%, #b56c23 100%);
          background-size: 26px 26px, auto, auto;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -34px 64px rgba(66,36,12,0.20), 0 36px 68px rgba(46,28,12,0.25), 0 7px 0 rgba(69,38,12,0.13);
        }
        .skeuo-hero-folder::before {
          content: "ANGEL GLEZ COT FILE";
          position: absolute;
          left: 34px;
          top: -28px;
          width: 300px;
          height: 58px;
          display: flex;
          align-items: center;
          padding-left: 28px;
          border-radius: 18px 18px 0 0;
          border: 1px solid rgba(89,54,20,0.28);
          background: linear-gradient(180deg, #f8d68b 0%, #d9963d 100%);
          color: rgba(67,38,12,0.78);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.46), 0 10px 18px rgba(43,25,10,0.16);
        }
        .skeuo-hero-folder::after {
          content: "";
          position: absolute;
          inset: 72px 30px 30px 30px;
          border-radius: 26px;
          border: 1px solid rgba(108,75,41,0.24);
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,249,237,0.90));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 34px rgba(48,29,12,0.16);
          pointer-events: none;
          z-index: 0;
        }
        .skeuo-hero-folder > * { position: relative; z-index: 1; }
        .skeuo-folder-label,
        .skeuo-small-label {
          border: 1px solid rgba(91,56,22,0.24);
          background: linear-gradient(180deg, #fff9e8 0%, #ead49a 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.72), inset 0 -2px 0 rgba(69,40,13,0.09), 0 8px 14px rgba(44,26,10,0.14);
        }
        .skeuo-counter-tile {
          border: 1px solid rgba(83,50,19,0.22);
          background: linear-gradient(180deg, #fff8e8 0%, #e6c48e 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.72), inset 0 -10px 18px rgba(82,48,17,0.08), 0 16px 28px rgba(43,25,10,0.18);
        }
        .skeuo-featured-case {
          border: 1px solid rgba(77,46,18,0.30);
          background: linear-gradient(180deg, #6f421e 0%, #4b2b13 100%);
          box-shadow: inset 0 2px 0 rgba(255,233,181,0.22), inset 0 -5px 0 rgba(22,13,6,0.24), 0 36px 64px rgba(35,21,9,0.34);
        }
        .skeuo-photo-card {
          border: 1px solid rgba(249,231,192,0.28);
          background: linear-gradient(180deg, #fff2ce 0%, #d4a15c 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.56), inset 0 -16px 32px rgba(87,49,16,0.16), 0 16px 30px rgba(31,20,10,0.24);
        }
        .skeuo-photo-mat {
          border: 1px solid rgba(81,49,19,0.22);
          background: linear-gradient(180deg, #f6e8c8, #c79a5a);
          box-shadow: inset 0 5px 12px rgba(67,40,15,0.20), 0 2px 0 rgba(255,255,255,0.20);
        }
        .skeuo-finder-panel {
          border: 1px solid rgba(38,23,10,0.35);
          background: radial-gradient(circle at 16% 0%, rgba(255,226,164,0.18), transparent 24%), linear-gradient(180deg, #2f1f14 0%, #1c130d 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.13), inset 0 -5px 0 rgba(0,0,0,0.22), 0 30px 64px rgba(38,23,10,0.34);
        }
        .skeuo-folder-desk {
          position: relative;
          border: 1px solid rgba(76,45,16,0.30);
          background: radial-gradient(circle at 12% 8%, rgba(255,244,220,0.42), transparent 24%), repeating-linear-gradient(90deg, rgba(74,43,15,0.10) 0 2px, transparent 2px 14px), linear-gradient(180deg, #9b612f 0%, #c58a4a 100%);
          box-shadow: inset 0 2px 0 rgba(255,225,167,0.32), inset 0 -18px 42px rgba(49,29,11,0.18), 0 30px 66px rgba(42,25,10,0.26);
        }
        .skeuo-folder-desk::before {
          content: "";
          position: absolute;
          inset: 20px;
          border-radius: 32px;
          border: 1px solid rgba(255,231,185,0.18);
          pointer-events: none;
        }

        .skeuo-folder-shell { min-height: 455px; padding-top: 48px; }
        .skeuo-folder-shell.compact { min-height: 315px; padding-top: 34px; }
        .skeuo-folder-cast-shadow {
          pointer-events: none;
          position: absolute;
          left: 26px;
          right: 26px;
          bottom: -14px;
          height: 62px;
          border-radius: 999px;
          background: rgba(31,20,10,0.30);
          filter: blur(24px);
          transition: transform 250ms ease;
        }
        .skeuo-folder-shell:hover .skeuo-folder-cast-shadow { transform: scale(1.05); }
        .skeuo-folder-stack { position: relative; width: 100%; transition: transform 260ms ease; will-change: transform; }
        .skeuo-folder-tab {
          pointer-events: none;
          position: absolute;
          left: 32px;
          top: 0;
          z-index: 1;
          height: 86px;
          width: 64%;
          border-radius: 16px 16px 0 0;
          clip-path: polygon(0 0, 72% 0, 100% 100%, 0 100%);
          transform: translateZ(16px);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.68), inset 0 -22px 25px rgba(58,30,10,0.18), 0 12px 16px rgba(31,20,10,0.18);
        }
        .skeuo-folder-back {
          pointer-events: none;
          position: absolute;
          left: 8px;
          right: 8px;
          top: 64px;
          z-index: 0;
          height: 335px;
          border-radius: 28px 28px 18px 18px;
          transform: translateZ(8px);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -32px 48px rgba(57,31,12,0.18);
        }
        .skeuo-folder-paper {
          pointer-events: none;
          position: absolute;
          z-index: 2;
          top: 98px;
          height: 182px;
          border-radius: 10px;
          transform: translateZ(13px) rotate(-2.2deg);
          box-shadow: 0 10px 18px rgba(31,20,10,0.13);
        }
        .skeuo-folder-paper.paper-one { left: 40px; right: 56px; }
        .skeuo-folder-paper.paper-two { left: 56px; right: 32px; top: 112px; transform: translateZ(15px) rotate(2.5deg); }
        .skeuo-folder-front {
          position: relative;
          z-index: 3;
          min-height: 365px;
          margin-top: 98px;
          overflow: hidden;
          border-radius: 10px 10px 30px 30px;
          clip-path: polygon(0 13%, 100% 0, 100% 100%, 0 100%);
          transform: translateZ(26px);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.50), inset 0 -38px 52px rgba(58,31,12,0.22);
        }
        .skeuo-folder-grain {
          pointer-events: none;
          position: absolute;
          inset: 0;
          opacity: 0.36;
          mix-blend-mode: multiply;
          background-image: radial-gradient(circle at 22% 18%, rgba(72,39,15,0.42) 0 0.6px, transparent 0.8px), radial-gradient(circle at 70% 46%, rgba(255,255,255,0.68) 0 0.7px, transparent 0.9px);
          background-size: 12px 12px, 18px 18px;
        }
        .skeuo-folder-crease {
          pointer-events: none;
          position: absolute;
          left: 20px;
          right: 20px;
          top: 15%;
          height: 1px;
          background: rgba(0,0,0,0.18);
          box-shadow: 0 32px 0 rgba(255,255,255,0.12), 0 86px 0 rgba(0,0,0,0.06);
        }
        .skeuo-folder-front::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(255,255,255,0.35), transparent 27%), linear-gradient(115deg, rgba(255,255,255,0.20), transparent 42%);
        }
        .skeuo-folder-pocket {
          pointer-events: none;
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          z-index: 0;
          height: 43%;
          clip-path: polygon(0 19%, 100% 0, 100% 100%, 0 100%);
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.25), inset 0 24px 38px rgba(255,255,255,0.09);
        }
        .skeuo-folder-label-card {
          position: relative;
          z-index: 1;
          margin: 64px 20px 20px 20px;
          border-radius: 18px;
          padding: 20px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -10px 20px rgba(80,45,14,0.06), 0 12px 22px rgba(45,27,11,0.15);
        }
        .skeuo-folder-amber .skeuo-folder-tab { border: 1px solid #8f5c24; background: linear-gradient(180deg,#f8d585 0%,#e3a64a 56%,#b97125 100%); }
        .skeuo-folder-amber .skeuo-folder-back { border: 1px solid #9a6426; background: linear-gradient(180deg,#f5cd78 0%,#d99838 60%,#ac641f 100%); }
        .skeuo-folder-amber .skeuo-folder-front { border: 1px solid #89551e; background: linear-gradient(180deg,#eeb85e 0%,#cf852d 48%,#a85e1e 100%); }
        .skeuo-folder-amber .skeuo-folder-pocket { border-top: 1px solid #7a4719; background: linear-gradient(180deg,#d79338 0%,#ad641f 100%); }
        .skeuo-folder-amber .skeuo-folder-paper { border: 1px solid #c5b08a; background: linear-gradient(180deg,#fffdf7 0%,#f5eddb 100%); }
        .skeuo-folder-amber .skeuo-folder-label-card { border: 1px solid #8c5a21; background: linear-gradient(180deg,#fff5ca 0%,#e7cf8c 100%); color: #4a2b11; }
        .skeuo-folder-violet .skeuo-folder-tab { border: 1px solid #6d56ad; background: linear-gradient(180deg,#e8ddff 0%,#c5aef0 56%,#9271cd 100%); }
        .skeuo-folder-violet .skeuo-folder-back { border: 1px solid #7058ad; background: linear-gradient(180deg,#ede5ff 0%,#c6aff1 60%,#9574cd 100%); }
        .skeuo-folder-violet .skeuo-folder-front { border: 1px solid #654ba1; background: linear-gradient(180deg,#d8c6ff 0%,#b392e0 50%,#8062bd 100%); }
        .skeuo-folder-violet .skeuo-folder-pocket { border-top: 1px solid #5b428f; background: linear-gradient(180deg,#bba0ec 0%,#8667bd 100%); }
        .skeuo-folder-violet .skeuo-folder-paper { border: 1px solid #d3c8eb; background: linear-gradient(180deg,#ffffff 0%,#f3eeff 100%); }
        .skeuo-folder-violet .skeuo-folder-label-card { border: 1px solid #7a64b7; background: linear-gradient(180deg,#ffffff 0%,#eee6ff 100%); color: #2e1065; }
        .skeuo-folder-shell.compact .skeuo-folder-tab { height: 68px; }
        .skeuo-folder-shell.compact .skeuo-folder-back { top: 48px; height: 238px; }
        .skeuo-folder-shell.compact .skeuo-folder-paper { top: 74px; height: 120px; left: 36px; right: 32px; }
        .skeuo-folder-shell.compact .skeuo-folder-paper.paper-two { top: 86px; left: 48px; right: 20px; }
        .skeuo-folder-shell.compact .skeuo-folder-front { min-height: 260px; margin-top: 76px; }
        .skeuo-folder-shell.compact .skeuo-folder-label-card { margin: 42px 16px 16px 16px; padding: 16px; }



        /* Layout repair: keeps the tactile look but fixes the broken arrangement. */
        .skeuo-toolbar > div:first-child {
          display: grid;
          grid-template-columns: minmax(270px, 1fr) auto minmax(180px, 1fr);
          align-items: center;
          column-gap: 18px;
        }
        .skeuo-toolbar .skeuo-engraved-plaque { justify-self: start; }
        .skeuo-toolbar .skeuo-nav-tray { justify-self: center; }
        .skeuo-toolbar > div:first-child > div:nth-child(3) { justify-self: end; }
        .skeuo-hero-wrap { min-height: calc(100vh - 92px); }
        .skeuo-hero-grid { position: relative; z-index: 1; }
        .skeuo-featured-column { align-self: start; }
        .skeuo-featured-case { transform-origin: top center; }
        .skeuo-hero-folder { min-height: auto; }
        .skeuo-hero-folder::after { inset: 78px 28px 28px 28px; }
        .skeuo-hero-folder h1 { text-wrap: balance; }
        .skeuo-hero-folder p { max-width: 620px; }
        .skeuo-photo-card h3 { line-height: 1.05; }

        @media (max-width: 1120px) {
          .skeuo-toolbar > div:first-child {
            grid-template-columns: minmax(230px, 1fr) auto minmax(132px, 0.55fr);
            column-gap: 12px;
          }
          .skeuo-nav-tray a { padding-left: 0.8rem; padding-right: 0.8rem; }
        }

        @media (max-width: 1023px) {
          .skeuo-toolbar > div:first-child {
            display: flex;
          }
          .skeuo-hero-wrap { min-height: auto; }
          .skeuo-hero-folder {
            max-width: 760px;
            margin-inline: auto;
          }
        }

        @media (max-width: 640px) {
          .skeuo-hero-folder {
            border-radius: 26px;
            padding: 1.25rem;
          }
          .skeuo-hero-folder::before {
            left: 24px;
            top: -22px;
            width: 230px;
            height: 46px;
            font-size: 9px;
          }
          .skeuo-hero-folder::after { inset: 62px 16px 16px 16px; }
        }



        /* Clean tactile skeuomorphism pass: less literal wood, less visual clutter, tighter layout. */
        .skeuo-desktop {
          background:
            radial-gradient(circle at 18% 8%, rgba(124,58,237,0.10), transparent 24%),
            radial-gradient(circle at 82% 12%, rgba(245,158,11,0.12), transparent 26%),
            linear-gradient(180deg, #f7f2ea 0%, #efe6d7 46%, #f4f0ea 100%) !important;
        }
        .skeuo-wood-stage {
          background:
            linear-gradient(90deg, rgba(111,80,47,0.035) 1px, transparent 1px),
            linear-gradient(180deg, rgba(111,80,47,0.030) 1px, transparent 1px),
            radial-gradient(circle at 50% 0%, rgba(255,255,255,0.72), transparent 44%),
            linear-gradient(180deg, #fbf7ef 0%, #eee1cf 100%) !important;
          background-size: 32px 32px, 32px 32px, auto, auto !important;
        }
        .skeuo-wood-stage::after {
          background:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.40), transparent 24%),
            radial-gradient(circle at 78% 18%, rgba(245,158,11,0.09), transparent 30%) !important;
          opacity: 0.62 !important;
        }
        .skeuo-desk-vignette {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.40), rgba(255,255,255,0.08)),
            radial-gradient(circle at center, transparent 0 70%, rgba(76,59,42,0.08) 100%) !important;
        }
        .skeuo-ruler,
        .skeuo-pencil,
        .skeuo-back-folder,
        .skeuo-back-folder-two {
          display: none !important;
        }

        .skeuo-toolbar {
          border: 1px solid rgba(160,137,110,0.28) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(251,246,238,0.94) 52%, rgba(232,220,204,0.92) 100%) !important;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.95),
            inset 0 -2px 0 rgba(120,92,61,0.06),
            0 18px 42px rgba(76,59,42,0.14),
            0 2px 0 rgba(255,255,255,0.55) !important;
          backdrop-filter: blur(18px);
        }
        .skeuo-toolbar::before,
        .skeuo-toolbar::after { display: none !important; }
        .skeuo-engraved-plaque {
          border: 1px solid rgba(183,166,145,0.44) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f3ede5 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            inset 0 -2px 0 rgba(116,88,56,0.05),
            0 10px 22px rgba(75,56,37,0.10) !important;
        }
        .skeuo-nav-tray {
          border: 1px solid rgba(174,155,132,0.36) !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(242,235,226,0.90)) !important;
          box-shadow:
            inset 0 2px 5px rgba(80,60,39,0.08),
            inset 0 -1px 0 rgba(255,255,255,0.80),
            0 10px 22px rgba(78,59,40,0.08) !important;
        }
        .skeuo-nav-tray .nav-link {
          color: rgb(71 85 105) !important;
          text-shadow: none !important;
        }
        .skeuo-nav-tray .nav-link:hover {
          color: rgb(15 23 42) !important;
          background: linear-gradient(180deg, #ffffff, #f1ebe3) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 16px rgba(78,59,40,0.08) !important;
        }
        .skeuo-nav-tray .nav-pill {
          border: 1px solid rgba(104,58,183,0.26) !important;
          background: linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.34),
            inset 0 -2px 0 rgba(52,20,110,0.18),
            0 12px 24px rgba(109,40,217,0.22) !important;
        }
        .skeuo-header-button,
        .skeuo-secondary-tab {
          border-color: rgba(180,160,136,0.42) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f1ebe4 100%) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -2px 0 rgba(82,61,38,0.04), 0 10px 20px rgba(72,54,34,0.09) !important;
        }
        .skeuo-primary-tab {
          border-color: rgba(15,23,42,0.16) !important;
          background: linear-gradient(180deg, #1f2937 0%, #0f172a 100%) !important;
        }

        .skeuo-hero-wrap {
          min-height: auto !important;
          padding-top: 8.25rem !important;
          padding-bottom: 4rem !important;
        }
        .skeuo-hero-grid {
          position: relative;
          z-index: 1;
        }
        @media (min-width: 1024px) {
          .skeuo-hero-grid {
            grid-template-columns: minmax(0, 580px) minmax(460px, 600px) !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 56px !important;
          }
        }
        .skeuo-hero-folder {
          max-width: 640px !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .skeuo-hero-folder::before { display: none !important; }
        .skeuo-hero-folder::after {
          display: none !important;
          content: none !important;
        }
        .skeuo-hero-folder h1 {
          max-width: 590px !important;
          font-size: clamp(2.8rem, 4.9vw, 4.9rem) !important;
          line-height: 0.98 !important;
          letter-spacing: -0.055em !important;
        }
        .skeuo-hero-folder .hero-muted-line {
          font-size: clamp(1.75rem, 3vw, 2.8rem) !important;
          line-height: 1.02 !important;
          letter-spacing: -0.055em !important;
        }
        .skeuo-folder-label,
        .skeuo-small-label {
          border-color: rgba(184,163,136,0.46) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f1e8dc 100%) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -2px 0 rgba(95,72,45,0.04), 0 8px 16px rgba(74,55,35,0.10) !important;
        }
        .skeuo-counter-tile {
          border-color: rgba(184,163,136,0.42) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f1eadf 100%) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 14px 28px rgba(74,55,35,0.09) !important;
        }
        .skeuo-featured-column {
          align-self: center !important;
          width: 100% !important;
          max-width: 600px !important;
          justify-self: end !important;
        }
        .skeuo-featured-case {
          width: 100% !important;
          max-width: 600px !important;
          border: 1px solid rgba(80,58,35,0.24) !important;
          background: linear-gradient(180deg, #f5efe6 0%, #dfcfb8 100%) !important;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.74),
            inset 0 -5px 0 rgba(83,61,37,0.08),
            0 28px 54px rgba(64,45,26,0.18) !important;
        }
        .skeuo-photo-card {
          border: 1px solid rgba(190,169,140,0.42) !important;
          background: linear-gradient(180deg, #ffffff 0%, #f8f2e8 100%) !important;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.92), inset 0 -10px 22px rgba(91,66,39,0.04), 0 16px 32px rgba(67,49,31,0.10) !important;
        }
        .skeuo-photo-mat {
          border-color: rgba(188,166,137,0.38) !important;
          background: linear-gradient(180deg, #f4eadb 0%, #dfccb0 100%) !important;
          box-shadow: inset 0 4px 10px rgba(87,65,42,0.10), 0 1px 0 rgba(255,255,255,0.60) !important;
        }

        .skeuo-finder-panel,
        #find-my-cot > div {
          border-color: rgba(42,38,64,0.22) !important;
          background:
            radial-gradient(circle at 16% 0%, rgba(139,92,246,0.22), transparent 28%),
            linear-gradient(135deg, #1f2937 0%, #312e81 56%, #111827 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -10px 24px rgba(0,0,0,0.15),
            0 28px 64px rgba(49,46,129,0.16) !important;
        }
        .skeuo-folder-desk {
          border: 1px solid rgba(190,170,145,0.42) !important;
          background:
            radial-gradient(circle at 18% 0%, rgba(255,255,255,0.62), transparent 28%),
            linear-gradient(180deg, #fff8ec 0%, #ead9bf 100%) !important;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.72), inset 0 -16px 34px rgba(99,74,45,0.06), 0 24px 52px rgba(75,55,34,0.12) !important;
        }
        .skeuo-folder-desk::before {
          border-color: rgba(255,255,255,0.52) !important;
        }

        .skeuo-folder-shell { min-height: 405px !important; padding-top: 42px !important; }
        .skeuo-folder-shell.compact { min-height: 300px !important; padding-top: 32px !important; }
        .skeuo-folder-cast-shadow {
          background: rgba(71,52,31,0.16) !important;
          filter: blur(22px) !important;
        }
        .skeuo-folder-tab,
        .skeuo-folder-back,
        .skeuo-folder-front,
        .skeuo-folder-pocket {
          box-shadow-color: rgba(76,55,31,0.12) !important;
        }
        .skeuo-folder-amber .skeuo-folder-tab {
          border-color: rgba(180,122,38,0.58) !important;
          background: linear-gradient(180deg,#ffe1a0 0%,#f1bf62 58%,#d99b3c 100%) !important;
        }
        .skeuo-folder-amber .skeuo-folder-back {
          border-color: rgba(177,118,34,0.54) !important;
          background: linear-gradient(180deg,#ffda8e 0%,#efbd5f 64%,#d39a3c 100%) !important;
        }
        .skeuo-folder-amber .skeuo-folder-front {
          border-color: rgba(162,103,30,0.52) !important;
          background: linear-gradient(180deg,#f6c975 0%,#e6ad4d 52%,#cc8d33 100%) !important;
        }
        .skeuo-folder-amber .skeuo-folder-pocket {
          border-top-color: rgba(139,89,27,0.42) !important;
          background: linear-gradient(180deg,#e8ad50 0%,#ca8b31 100%) !important;
        }
        .skeuo-folder-amber .skeuo-folder-label-card {
          border-color: rgba(164,108,38,0.38) !important;
          background: linear-gradient(180deg,#fffaf0 0%,#f0dfb8 100%) !important;
        }
        .skeuo-folder-violet .skeuo-folder-tab {
          border-color: rgba(134,111,199,0.50) !important;
          background: linear-gradient(180deg,#eee7ff 0%,#d2c1f7 58%,#b49be8 100%) !important;
        }
        .skeuo-folder-violet .skeuo-folder-back {
          border-color: rgba(134,111,199,0.46) !important;
          background: linear-gradient(180deg,#f3eeff 0%,#d4c5f5 64%,#b79ee6 100%) !important;
        }
        .skeuo-folder-violet .skeuo-folder-front {
          border-color: rgba(118,94,184,0.48) !important;
          background: linear-gradient(180deg,#e5d9ff 0%,#c9b4ef 52%,#a98bd9 100%) !important;
        }
        .skeuo-folder-violet .skeuo-folder-pocket {
          border-top-color: rgba(94,72,151,0.34) !important;
          background: linear-gradient(180deg,#cbb5ef 0%,#aa8dda 100%) !important;
        }
        .skeuo-folder-violet .skeuo-folder-label-card {
          border-color: rgba(127,104,190,0.36) !important;
          background: linear-gradient(180deg,#ffffff 0%,#f0eaff 100%) !important;
        }
        .skeuo-folder-grain { opacity: 0.18 !important; }
        .skeuo-folder-crease { opacity: 0.58 !important; }

        @media (max-width: 1220px) and (min-width: 1024px) {
          .skeuo-hero-grid {
            grid-template-columns: minmax(0, 520px) minmax(400px, 520px) !important;
            gap: 36px !important;
          }
          .skeuo-featured-column { max-width: 520px !important; }
          .skeuo-featured-image { height: 260px !important; }
          .skeuo-photo-card { padding: 1rem !important; }
          .skeuo-photo-mat { padding: 0.85rem !important; }
          .skeuo-hero-folder h1 {
            font-size: clamp(2.55rem, 4.45vw, 4.25rem) !important;
          }
          .skeuo-hero-folder .hero-muted-line {
            font-size: clamp(1.65rem, 2.7vw, 2.45rem) !important;
          }
        }
        @media (max-width: 1023px) {
          .skeuo-hero-wrap { padding-top: 10rem !important; }
          .skeuo-featured-column { max-width: 560px !important; justify-self: center !important; margin-inline: auto !important; }
        }
        @media (max-width: 640px) {
          .skeuo-hero-wrap { padding-top: 12rem !important; }
          .skeuo-hero-folder h1 { font-size: clamp(2.25rem, 12vw, 3.1rem) !important; }
          .skeuo-hero-folder .hero-muted-line { font-size: clamp(1.55rem, 8vw, 2.1rem) !important; }
        }


        .cart-action-button {
          --primary: #ffffff;
          --neutral-1: #f8fafc;
          --neutral-2: #64748b;
          --radius: 16px;
          position: relative;
          min-width: 200px;
          height: 58px;
          cursor: pointer;
          overflow: visible;
          border: none;
          border-radius: var(--radius);
          color: #1f2937;
          font-size: 16px;
          font-weight: 800;
          font-style: normal;
          line-height: 1;
          isolation: isolate;
          box-shadow:
            0 0.5px 0.5px 1px rgba(255, 255, 255, 0.35),
            0 12px 22px rgba(15, 23, 42, 0.16),
            0 4px 5px rgba(15, 23, 42, 0.06);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .cart-action-button--compact {
          min-width: 172px;
          height: 50px;
          font-size: 14px;
        }
        .buy-now-action-button {
          --primary: #ffffff;
          --neutral-1: #363b3b;
          --neutral-2: #272726;
          color: #d8dde5;
          box-shadow:
            0 0.5px 0.5px 1px rgba(255,255,255,0.20),
            0 14px 26px rgba(0,0,0,0.24),
            0 5px 8px rgba(15,23,42,0.10);
        }
        .buy-now-action-button::after {
          background: rgba(255,255,255,0.16);
          box-shadow:
            0 8px 32px rgba(31,38,135,0.24),
            inset 0 -2px 2px rgba(255,255,255,0.30);
        }
        .buy-now-action-button:hover {
          box-shadow:
            0 0 1px 2px rgba(255,255,255,0.25),
            0 18px 34px rgba(0,0,0,0.30),
            0 10px 3px -3px rgba(0,0,0,0.06);
        }
        .buy-now-action-button:hover .cart-button-bg {
          box-shadow: inset 0 0 8px 3px rgba(0,0,0,0.50);
        }
        .buy-now-action-button .cart-button-bg-gradient {
          opacity: 0.34;
        }
        .buy-now-action-button:hover .cart-button-bg-gradient {
          opacity: 0.95;
        }
        .cart-action-button::after {
          content: "";
          position: absolute;
          inset: -6px;
          z-index: 0;
          border-radius: calc(var(--radius) + 6px);
          background: rgba(255, 255, 255, 0.24);
          box-shadow:
            0 8px 28px rgba(31, 38, 135, 0.18),
            inset 0 -2px 2px rgba(255, 255, 255, 0.42);
          transition: inset 0.45s ease 0.12s, background 0.3s ease;
        }
        .cart-action-button:hover::after { inset: -8px; }
        .cart-action-button::before {
          content: "";
          position: absolute;
          inset: 10px;
          z-index: 2;
          border-radius: 999px;
          background: linear-gradient(to top, var(--neutral-1), var(--neutral-2));
          opacity: 0.72;
          filter: blur(0.5px);
          transition: inset 0.3s ease, opacity 0.3s ease;
        }
        .cart-action-button:hover {
          transform: scale(1.02);
          box-shadow:
            0 0 1px 2px rgba(255, 255, 255, 0.34),
            0 18px 30px rgba(15, 23, 42, 0.22),
            0 10px 3px -3px rgba(15, 23, 42, 0.04);
        }
        .cart-action-button:active {
          transform: scale(1);
          box-shadow:
            0 0 1px 2px rgba(255, 255, 255, 0.3),
            0 10px 3px -3px rgba(15, 23, 42, 0.18);
        }
        .cart-button-wrap {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: inherit;
        }
        .cart-button-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: var(--radius);
          background:
            linear-gradient(var(--neutral-1), var(--neutral-2)) padding-box,
            linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.34)) border-box;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .cart-action-button:hover .cart-button-bg {
          transform: scale(1.035, 1.08);
          box-shadow: inset 0 0 8px 3px rgba(15, 23, 42, 0.22);
        }
        .cart-button-bg-spin {
          position: absolute;
          inset: -5px;
          z-index: 1;
          overflow: hidden;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .cart-button-bg-spin::before {
          content: "";
          position: absolute;
          inset: -100%;
          background: conic-gradient(transparent 30%, rgba(255,255,255,0.16) 80%, transparent 100%);
          filter: blur(20px);
          animation: cartSpin 2s linear infinite;
          animation-play-state: paused;
        }
        .cart-action-button:hover .cart-button-bg-spin { opacity: 1; }
        .cart-action-button:hover .cart-button-bg-spin::before { animation-play-state: running; }
        .cart-button-bg-gradient {
          position: absolute;
          inset: -7px;
          z-index: 0;
          overflow: hidden;
          border-radius: calc(var(--radius) + 4px);
          opacity: 0.28;
          filter: blur(10px);
          transition: opacity 0.45s linear;
        }
        .cart-button-bg-gradient::before {
          content: "";
          position: absolute;
          inset: -4px;
          margin: auto;
          aspect-ratio: 1;
          background-image: linear-gradient(90deg, #0d3fe4, #ff52e2, #fd4845, #f7d35b, #50f77d, #25e1e4);
          animation: cartSpin 2s linear infinite;
        }
        .cart-action-button:hover .cart-button-bg-gradient { opacity: 0.88; }
        .cart-state {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding-left: 29px;
        }
        .cart-state p {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
        }
        .cart-state p span {
          display: block;
          opacity: 0;
          animation: cartSlideDown 0.8s ease forwards calc(var(--i) * 0.03s);
        }
        .cart-icon-plus,
        .cart-icon-cart {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        .cart-icon-cart {
          transform: translate(-80px, 8px);
        }
        .cart-icon-cart svg {
          width: auto;
          height: 28px;
        }
        .cart-state--default .cart-icon-plus svg {
          animation: cartPlusIn 0.6s ease forwards;
        }
        .cart-action-button:hover .cart-state--default .cart-icon-plus svg path,
        .cart-action-button:focus .cart-state--default .cart-icon-plus svg path {
          animation: cartRotatePlus 0.6s cubic-bezier(0.5, 1, 0.3, 1.6) forwards;
        }
        .cart-action-button:hover .cart-state--default .cart-icon-plus svg {
          animation: cartScalePlus 0.6s cubic-bezier(0.5, 1, 0.3, 1.6) forwards;
        }
        .cart-action-button:focus .cart-state--default .cart-icon-plus svg {
          animation: cartMovePlus 2s linear forwards;
        }
        .cart-action-button:hover p span {
          opacity: 1;
          animation: cartWave 0.5s ease forwards calc(var(--i) * 0.03s);
        }
        .cart-action-button:focus p span {
          opacity: 1;
          animation: cartDisappear 0.6s ease forwards calc(0.5s + var(--i) * 0.1s);
        }
        .cart-action-button:focus .cart-icon-cart {
          animation: cartFly 2s linear;
        }
        .cart-action-button:focus .cart-icon-cart svg path {
          animation: cartPathFill 2s linear;
        }
        .cart-state--default .cart-icon-cart::before,
        .cart-state--default .cart-icon-cart::after {
          content: "";
          position: absolute;
          top: 8px;
          right: 30px;
          height: 2px;
          color: rgba(128,255,162,0.8);
          background: linear-gradient(to right, transparent, currentColor);
          opacity: 0.5;
          transform-origin: right;
        }
        .cart-state--default .cart-icon-cart::after {
          top: 15px;
          right: 28px;
          opacity: 0.3;
        }
        .cart-action-button:focus .cart-state--default .cart-icon-cart::before,
        .cart-action-button:focus .cart-state--default .cart-icon-cart::after {
          animation: cartTrace 2s linear forwards;
        }
        .cart-state--added {
          display: none;
          color: white;
        }
        .cart-state--added .cart-icon-plus svg {
          stroke-dasharray: 24 24;
          stroke-dashoffset: -24;
        }
        .cart-action-button:focus .cart-state--default {
          position: absolute;
        }
        .cart-action-button:focus .cart-state--added {
          display: flex;
          --primary: lightgreen;
        }
        .cart-action-button:focus .cart-state--added span {
          opacity: 0;
          animation: cartSlideDown 1.2s ease forwards calc(1s + var(--i) * 0.1s);
        }
        .cart-action-button:focus .cart-state--added .cart-icon-plus svg {
          animation: cartCheck 1s cubic-bezier(0.5, -0.15, 0.3, 1.4) forwards 1s;
        }
        .cart-action-button.is-added {
          --neutral-1: #e2e8f0;
          --neutral-2: #475569;
          color: white;
        }
        .cart-action-button.is-added .cart-state--default {
          display: none;
        }
        .cart-action-button.is-added .cart-state--added {
          display: flex;
        }
        .cart-action-button.is-added .cart-state--added span {
          opacity: 1;
          animation: none;
        }
        .cart-action-button.is-added .cart-state--added .cart-icon-plus svg {
          stroke-dashoffset: 0;
        }
        .cart-action-button svg path {
          transition: stroke-width 0.5s ease, stroke 0.5s ease;
        }
        .cart-action-button:hover .cart-icon-plus svg path {
          stroke-width: 4px;
        }
        @keyframes cartSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cartFly {
          0% { transform: translate(-80px, 8px); }
          18% { transform: translate(-20px, 8px); }
          25% { transform: translate(0, 8px) rotate(4deg); }
          31% { transform: translate(10px, 8px) rotate(-25deg); }
          45% { transform: translate(30px, 8px) rotate(0deg); }
          60% { transform: translate(60px, 8px) rotate(0deg); }
          100% { transform: translate(240px, 8px) rotate(-40deg); }
        }
        @keyframes cartPathFill {
          0%, 45% { fill: transparent; }
          55%, 100% { fill: currentColor; }
        }
        @keyframes cartTrace {
          0% { transform: rotate(0deg); width: 20px; opacity: 0.8; filter: blur(3px); }
          10% { transform: rotate(0deg); width: 20px; }
          25% { transform: rotate(-4deg); width: 30px; filter: blur(0); opacity: 0.2; }
          31% { transform: rotate(25deg); width: 5px; opacity: 0.2; filter: blur(2px); }
          45% { transform: rotate(0deg); width: 40px; filter: blur(0); }
          60% { transform: rotate(0deg); width: 50px; filter: blur(0); }
          100% { transform: rotate(40deg); width: 100px; filter: blur(3px); }
        }
        @keyframes cartPlusIn {
          0% { transform: translateX(-60px) translateY(30px) rotate(-100deg) scale(2); opacity: 0; filter: blur(3px); color: lightgreen; }
          100% { transform: translateX(0) translateY(0) rotate(0); opacity: 1; filter: blur(0); }
        }
        @keyframes cartRotatePlus {
          30% { stroke: white; }
          100% { transform: rotate(90deg); }
        }
        @keyframes cartScalePlus {
          30% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes cartMovePlus {
          10%, 18% { transform: translate(0, 0); stroke: white; }
          25% { transform: translate(5px, 0) rotate(-80deg); stroke: #00ff00; filter: blur(0); }
          40% { transform: translate(32px, -15px) rotate(-200deg); filter: blur(2px); }
          55% { transform: translate(55px, 10px) rotate(-360deg); }
          60%, 100% { transform: translate(80px, 10px) rotate(-360deg) scale(0); }
        }
        @keyframes cartWave {
          30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); }
          50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); color: var(--primary); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes cartSlideDown {
          0% { opacity: 0; transform: translateY(20px) translateX(0); color: var(--primary); filter: blur(5px); }
          20% { opacity: 1; transform: translateY(-4px) translateX(-2px) rotate(-10deg); filter: blur(0); }
          50% { opacity: 1; transform: translateY(3px) translateX(3px) rotate(0); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes cartDisappear {
          from { opacity: 1; }
          to { opacity: 0; transform: translateX(5px) translateY(-20px); color: var(--primary); filter: blur(5px); }
        }
        @keyframes cartCheck {
          0% { stroke-dashoffset: -24; transform: scale(4); filter: blur(3px); }
          50% { stroke-dashoffset: -7; }
          100% { transform: scale(1); stroke-dashoffset: 0; }
        }
        @media (max-width: 640px) {
          .cart-action-button {
            width: 100%;
            min-width: 0;
            height: 54px;
          }
        }



        .buy-now-clean-button {
          --buy-radius: 16px;
          position: relative;
          isolation: isolate;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 200px;
          height: 58px;
          overflow: hidden;
          border: 0;
          border-radius: var(--buy-radius);
          color: #f8fafc;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 900;
          line-height: 1;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.14),
            0 16px 28px rgba(15,23,42,0.24),
            inset 0 1px 0 rgba(255,255,255,0.18);
          transform: translateZ(0);
          transition: transform 180ms ease, box-shadow 220ms ease, filter 220ms ease;
        }

        .buy-now-clean-button.cart-action-button--compact {
          min-width: 172px;
          height: 50px;
          font-size: 14px;
        }

        .buy-now-clean-button:hover {
          transform: translateY(-1px) scale(1.018);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.22),
            0 20px 34px rgba(15,23,42,0.30),
            0 0 24px rgba(139,92,246,0.20),
            inset 0 1px 0 rgba(255,255,255,0.24);
        }

        .buy-now-clean-button:active {
          transform: translateY(0) scale(0.99);
        }

        .buy-now-clean-bg {
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: inherit;
          background:
            radial-gradient(circle at 28% 16%, rgba(255,255,255,0.24), transparent 28%),
            linear-gradient(180deg, #343a3a 0%, #232526 54%, #111827 100%);
          box-shadow:
            inset 0 2px 1px rgba(255,255,255,0.16),
            inset 0 -10px 20px rgba(0,0,0,0.34);
        }

        .buy-now-clean-glow {
          position: absolute;
          inset: -8px;
          z-index: 0;
          border-radius: calc(var(--buy-radius) + 8px);
          background: linear-gradient(90deg, #0d3fe4, #ff52e2, #fd4845, #f7d35b, #50f77d, #25e1e4, #0d3fe4);
          background-size: 220% 100%;
          opacity: 0.36;
          filter: blur(12px);
          animation: buyGlowShift 4s linear infinite;
          transition: opacity 220ms ease, filter 220ms ease;
        }

        .buy-now-clean-button:hover .buy-now-clean-glow {
          opacity: 0.78;
          filter: blur(14px);
        }

        .buy-now-clean-shine {
          position: absolute;
          inset: 1px;
          z-index: 2;
          border-radius: calc(var(--buy-radius) - 1px);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.22), transparent 36%),
            linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.12) 45%, transparent 62%);
          transform: translateX(-28%);
          opacity: 0.78;
          pointer-events: none;
        }

        .buy-now-clean-button:hover .buy-now-clean-shine {
          animation: buyButtonSheen 0.8s ease;
        }

        .buy-now-clean-label {
          position: relative;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding-inline: 18px;
          text-shadow: 0 1px 1px rgba(0,0,0,0.35);
        }

        .buy-now-clean-label svg {
          width: 18px;
          height: 18px;
          color: #d1fae5;
          filter: drop-shadow(0 0 8px rgba(74,222,128,0.25));
          transition: transform 200ms ease, color 200ms ease;
        }

        .buy-now-clean-button:hover .buy-now-clean-label svg {
          color: #ffffff;
          transform: translateX(2px) scale(1.08);
        }

        @keyframes buyGlowShift {
          0% { background-position: 0% center; }
          100% { background-position: 220% center; }
        }

        @keyframes buyButtonSheen {
          0% { transform: translateX(-75%); opacity: 0; }
          35% { opacity: 0.85; }
          100% { transform: translateX(75%); opacity: 0; }
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes cardFloatIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes folderPanelIn {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        
        @keyframes folderFlapOpen {
          from {
            opacity: 0.5;
            transform: perspective(1800px) rotateX(-76deg) translateY(-12px) translateZ(24px);
          }
          to {
            opacity: 0.95;
            transform: perspective(1800px) rotateX(0deg) translateY(0) translateZ(24px);
          }
        }

        @keyframes folderContentsIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes heroLineReveal {
          0% {
            opacity: 0;
            transform: translateY(26px);
            filter: blur(8px);
          }
          8% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          82% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(26px);
            filter: blur(8px);
          }
        }

        @keyframes heroGradientShift {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .hero-line {
          opacity: 0;
          will-change: transform, opacity, filter;
          animation-name: heroLineReveal;
          animation-duration: 5s;
          animation-timing-function: cubic-bezier(.22,1,.36,1);
          animation-iteration-count: infinite;
        }

        .hero-line:nth-child(1) {
          animation-delay: 0.06s;
        }

        .hero-line:nth-child(2) {
          animation-delay: 0.22s;
        }

        .hero-line:nth-child(3) {
          animation-delay: 0.38s;
        }

        .hero-accent-text {
          background-image: linear-gradient(90deg, #1e1b4b, #4338ca, #7c3aed, #1e1b4b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation:
            heroLineReveal 5s cubic-bezier(.22,1,.36,1) infinite,
            heroGradientShift 7s linear infinite;
        }

        .hero-muted-line {
          color: rgb(100 116 139);
        }

        .premium-grid-fade {
          background-image: linear-gradient(to bottom, rgba(255,255,255,0.7), rgba(255,255,255,0));
        }

@keyframes heartPop {
          0% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 0 0 rgba(244,63,94,0)); }
          20% { transform: scale(1.18) translateY(-2px) rotate(-6deg); }
          45% { transform: scale(1.34) translateY(-4px) rotate(6deg); filter: drop-shadow(0 12px 22px rgba(244,63,94,0.28)); }
          70% { transform: scale(0.95) translateY(0) rotate(-2deg); }
          100% { transform: scale(1) translateY(0) rotate(0deg); filter: drop-shadow(0 6px 12px rgba(244,63,94,0.14)); }
        }


        @keyframes folderClickBounce {
          0% { transform: scale(1); }
          35% { transform: scale(1.035) translateY(-4px); }
          70% { transform: scale(0.992); }
          100% { transform: scale(1); }
        }

        @keyframes folderWhoosh {
          0% {
            opacity: 0;
            transform: translateX(0) skewX(-18deg);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(240%) skewX(-18deg);
          }
        }

        .folder-click-bounce {
          animation: folderClickBounce 0.34s cubic-bezier(.22,1,.36,1);
        }

        .folder-whoosh {
          animation: folderWhoosh 0.42s cubic-bezier(.22,1,.36,1);
        }

        .heart-pop {
          animation: heartPop 0.5s cubic-bezier(.2,.9,.2,1);
        }

        .heart-press {
          transform-style: preserve-3d;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <style jsx global>{`
        .magnetic-btn {
          position: relative;
          overflow: hidden;
          transition: transform 180ms ease, box-shadow 220ms ease, background-color 180ms ease;
        }

        .magnetic-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255,255,255,0.22), transparent 55%);
          opacity: 0;
          transition: opacity 220ms ease;
          pointer-events: none;
        }

        .magnetic-btn:hover::after {
          opacity: 1;
        }

        .magnetic-btn:hover {
          box-shadow: 0 18px 44px rgba(15,23,42,0.14);
          transform: translateY(-2px) scale(1.03);
        }

        .nav-link,
        .nav-pill {
          position: relative;
        }

        .nav-link {
          transition: transform 180ms ease, background-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
        }

        .nav-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(15,23,42,0.06);
        }

        .nav-pill {
          box-shadow: 0 14px 28px rgba(124,58,237,0.18);
          animation: navGlow 4s ease-in-out infinite;
        }

        @keyframes navGlow {
          0%, 100% { box-shadow: 0 14px 28px rgba(124,58,237,0.18); }
          50% { box-shadow: 0 18px 36px rgba(124,58,237,0.28); }
        }
      `}</style>


      <style jsx global>{`
        /* Compact spacing pass: keeps the tactile/skeuomorphic look, but reduces empty vertical space. */
        .skeuo-toolbar {
          padding-block: 0.7rem !important;
        }

        .skeuo-engraved-plaque {
          padding-block: 0.55rem !important;
        }

        .skeuo-nav-tray {
          padding: 0.42rem !important;
        }

        .skeuo-nav-tray .nav-link,
        .skeuo-nav-tray .nav-pill {
          padding: 0.62rem 1rem !important;
        }

        .skeuo-hero-wrap {
          padding-top: 7.65rem !important;
          padding-bottom: 2.75rem !important;
        }

        @media (min-width: 1024px) {
          .skeuo-hero-grid {
            grid-template-columns: minmax(0, 600px) minmax(420px, 560px) !important;
            gap: 42px !important;
            align-items: center !important;
          }
        }

        .skeuo-hero-folder h1 {
          font-size: clamp(2.65rem, 4.45vw, 4.45rem) !important;
          line-height: 0.96 !important;
        }

        .skeuo-hero-folder .hero-muted-line {
          font-size: clamp(1.65rem, 2.65vw, 2.45rem) !important;
          line-height: 1 !important;
        }

        .skeuo-hero-folder p {
          margin-top: 1rem !important;
          line-height: 1.72 !important;
        }

        .skeuo-hero-folder .mb-6 {
          margin-bottom: 1.15rem !important;
        }

        .skeuo-hero-folder .mt-8 {
          margin-top: 1.35rem !important;
        }

        .skeuo-hero-folder .mt-6 {
          margin-top: 1rem !important;
        }

        .skeuo-hero-folder .mt-10 {
          margin-top: 1.35rem !important;
        }

        .skeuo-folder-label,
        .skeuo-small-label {
          padding: 0.5rem 0.9rem !important;
        }

        .skeuo-counter-tile {
          padding: 1rem !important;
          border-radius: 20px !important;
        }

        .skeuo-counter-tile p:first-child {
          font-size: 1.65rem !important;
        }

        .skeuo-featured-column {
          padding-top: 1.25rem !important;
          max-width: 560px !important;
        }

        .skeuo-featured-case {
          max-width: 560px !important;
          padding: 1rem !important;
          border-radius: 30px !important;
        }

        .skeuo-photo-card {
          padding: 1.05rem !important;
          border-radius: 26px !important;
        }

        .skeuo-photo-card .mb-5 {
          margin-bottom: 0.9rem !important;
        }

        .skeuo-photo-mat {
          padding: 0.85rem !important;
          border-radius: 22px !important;
        }

        .skeuo-featured-image {
          height: 280px !important;
        }

        #find-my-cot {
          padding-bottom: 1rem !important;
        }

        #find-my-cot > div {
          padding: 1.2rem !important;
          border-radius: 28px !important;
        }

        #quarters {
          padding-top: 3rem !important;
          padding-bottom: 3.5rem !important;
          scroll-margin-top: 8.25rem !important;
        }

        #quarters .mb-8 {
          margin-bottom: 1.35rem !important;
        }

        .skeuo-folder-shell {
          min-height: 360px !important;
          padding-top: 34px !important;
        }

        .skeuo-folder-shell.compact {
          min-height: 270px !important;
          padding-top: 28px !important;
        }

        .skeuo-folder-label-card {
          margin: 50px 18px 18px 18px !important;
          padding: 1rem !important;
        }

        .skeuo-folder-shell.compact .skeuo-folder-label-card {
          margin: 36px 14px 14px 14px !important;
          padding: 0.85rem !important;
        }

        .animated-cart-button {
          min-width: 176px !important;
          height: 58px !important;
          font-size: 16px !important;
        }

        .animated-cart-button::after {
          inset: -5px !important;
        }

        .animated-cart-button::before {
          inset: 9px !important;
        }

        @media (max-width: 1220px) and (min-width: 1024px) {
          .skeuo-hero-grid {
            grid-template-columns: minmax(0, 535px) minmax(360px, 500px) !important;
            gap: 32px !important;
          }

          .skeuo-featured-image {
            height: 250px !important;
          }
        }

        @media (max-width: 1023px) {
          .skeuo-hero-wrap {
            padding-top: 9.5rem !important;
            padding-bottom: 2.25rem !important;
          }
        }

        @media (max-width: 640px) {
          .skeuo-hero-wrap {
            padding-top: 11rem !important;
          }

          .skeuo-hero-folder h1 {
            font-size: clamp(2.15rem, 11vw, 2.9rem) !important;
          }

          .skeuo-hero-folder .hero-muted-line {
            font-size: clamp(1.45rem, 7.4vw, 1.95rem) !important;
          }
        }

        /* Premium liquid glass navbar v2: stronger refraction, rim light, and layered glass. */
        header .skeuo-toolbar {
          position: relative !important;
          isolation: isolate !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.68) !important;
          background:
            radial-gradient(circle at 14% 8%, rgba(255,255,255,0.96), transparent 26%),
            radial-gradient(circle at 50% 125%, rgba(124,58,237,0.22), transparent 36%),
            radial-gradient(circle at 96% 18%, rgba(251,191,36,0.18), transparent 34%),
            linear-gradient(135deg, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0.19) 42%, rgba(255,255,255,0.34) 100%) !important;
          -webkit-backdrop-filter: blur(28px) saturate(1.75) contrast(1.05) !important;
          backdrop-filter: blur(28px) saturate(1.75) contrast(1.05) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.96),
            inset 0 -1px 0 rgba(255,255,255,0.35),
            inset 0 0 44px rgba(255,255,255,0.22),
            0 20px 60px rgba(79,70,229,0.14),
            0 12px 30px rgba(80,55,28,0.10) !important;
        }

        header .skeuo-toolbar::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          display: block !important;
          z-index: 0 !important;
          pointer-events: none !important;
          border-radius: inherit !important;
          background:
            linear-gradient(115deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.14) 22%, transparent 38%, rgba(255,255,255,0.20) 58%, rgba(255,255,255,0.48) 100%),
            radial-gradient(ellipse at 32% -20%, rgba(255,255,255,0.92), transparent 36%),
            radial-gradient(ellipse at 74% 115%, rgba(124,58,237,0.16), transparent 42%);
          opacity: 0.92 !important;
        }

        header .skeuo-toolbar::after {
          content: "" !important;
          position: absolute !important;
          inset: 9px !important;
          display: block !important;
          z-index: 0 !important;
          pointer-events: none !important;
          border-radius: 23px !important;
          border: 1px solid rgba(255,255,255,0.56) !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.03)),
            radial-gradient(circle at 54% 5%, rgba(255,255,255,0.46), transparent 34%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.72),
            inset 0 -14px 28px rgba(124,58,237,0.06) !important;
        }

        header .skeuo-toolbar > div:first-child {
          position: relative !important;
          z-index: 2 !important;
        }

        header .skeuo-engraved-plaque {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.62) !important;
          background:
            radial-gradient(circle at 18% 10%, rgba(255,255,255,0.95), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,255,255,0.26)) !important;
          -webkit-backdrop-filter: blur(18px) saturate(1.45) !important;
          backdrop-filter: blur(18px) saturate(1.45) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            inset 0 -1px 0 rgba(255,255,255,0.28),
            0 12px 28px rgba(30,41,59,0.08) !important;
        }

        header .skeuo-engraved-plaque::after {
          content: "" !important;
          position: absolute !important;
          inset: 2px 12px auto 12px !important;
          height: 40% !important;
          border-radius: 999px !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.56), transparent) !important;
          pointer-events: none !important;
        }

        header .skeuo-nav-tray {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.58) !important;
          background:
            radial-gradient(circle at 16% 0%, rgba(255,255,255,0.92), transparent 34%),
            radial-gradient(circle at 50% 110%, rgba(124,58,237,0.14), transparent 45%),
            linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.18)) !important;
          -webkit-backdrop-filter: blur(22px) saturate(1.65) !important;
          backdrop-filter: blur(22px) saturate(1.65) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.88),
            inset 0 -1px 0 rgba(255,255,255,0.24),
            0 12px 30px rgba(79,70,229,0.10) !important;
        }

        header .skeuo-nav-tray::before {
          content: "" !important;
          position: absolute !important;
          inset: -35% 20% auto 20% !important;
          height: 120% !important;
          border-radius: 999px !important;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.62), transparent 68%) !important;
          pointer-events: none !important;
        }

        header .skeuo-nav-tray .nav-link {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid transparent !important;
          background: transparent !important;
          color: rgb(45 55 72) !important;
          text-shadow: 0 1px 0 rgba(255,255,255,0.72) !important;
        }

        header .skeuo-nav-tray .nav-link:hover {
          color: rgb(15 23 42) !important;
          border-color: rgba(255,255,255,0.62) !important;
          background:
            radial-gradient(circle at 25% 0%, rgba(255,255,255,0.92), transparent 46%),
            linear-gradient(180deg, rgba(255,255,255,0.54), rgba(255,255,255,0.24)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.90),
            0 9px 20px rgba(79,70,229,0.09) !important;
        }

        header .skeuo-nav-tray .nav-pill {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.66) !important;
          background:
            radial-gradient(circle at 24% 8%, rgba(255,255,255,0.70), transparent 35%),
            radial-gradient(circle at 84% 100%, rgba(236,72,153,0.34), transparent 45%),
            linear-gradient(180deg, rgba(168,85,247,0.98), rgba(109,40,217,0.98)) !important;
          color: white !important;
          text-shadow: 0 1px 0 rgba(67,24,128,0.34) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.58),
            inset 0 -2px 0 rgba(67,24,128,0.22),
            0 14px 30px rgba(124,58,237,0.30),
            0 0 42px rgba(124,58,237,0.22) !important;
        }

        header .skeuo-nav-tray .nav-pill::before {
          content: "" !important;
          position: absolute !important;
          inset: 1px 3px auto 3px !important;
          height: 45% !important;
          border-radius: inherit !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.54), transparent) !important;
          pointer-events: none !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > a,
        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(255,255,255,0.60) !important;
          border-radius: 18px !important;
          background:
            radial-gradient(circle at 26% -8%, rgba(255,255,255,0.94), transparent 38%),
            radial-gradient(circle at 55% 110%, rgba(124,58,237,0.10), transparent 50%),
            linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.20)) !important;
          -webkit-backdrop-filter: blur(18px) saturate(1.45) !important;
          backdrop-filter: blur(18px) saturate(1.45) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(255,255,255,0.30),
            0 10px 26px rgba(79,70,229,0.10) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          color: rgb(109 40 217) !important;
          background:
            radial-gradient(circle at 35% 8%, rgba(255,255,255,0.90), transparent 38%),
            radial-gradient(circle at 95% 80%, rgba(168,85,247,0.20), transparent 50%),
            linear-gradient(180deg, rgba(248,245,255,0.70), rgba(238,232,255,0.28)) !important;
        }

        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          header .skeuo-toolbar,
          header .skeuo-nav-tray,
          header .skeuo-engraved-plaque {
            background: rgba(255,255,255,0.88) !important;
          }
        }


        /* Buy Now button: adapted from the uploaded dark animated button, scoped so it cannot interfere with Add to Cart. */
        .buy-action-button {
          --primary: #fff;
          --neutral-1: #363b3b;
          --neutral-2: #272726;
          --radius: 10px;
          cursor: pointer;
          border-radius: var(--radius);
          color: #bbb;
          border: none;
          box-shadow:
            0 0.5px 0.5px 1px rgba(255, 255, 255, 0.2),
            0 10px 20px rgba(0, 0, 0, 0.2),
            0 4px 5px 0px rgba(0, 0, 0, 0.05);
          position: relative;
          isolation: isolate;
          overflow: hidden;
          transition: all 0.3s ease;
          min-width: 200px;
          height: 58px;
          font-style: normal;
          font-size: 16px;
          font-weight: 700;
        }
        .buy-action-button.cart-action-button--compact {
          min-width: 172px;
          height: 50px;
          font-size: 14px;
        }
        .buy-action-button.w-full {
          width: 100% !important;
          min-width: 0;
        }
        .buy-button-wrap {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-radius: inherit;
        }
        .buy-action-button::after {
          content: "";
          inset: -7px;
          position: absolute;
          background: rgba(255, 255, 255, 0.2);
          box-shadow:
            0 8px 32px 0 rgba(31, 38, 135, 0.4),
            inset 0 -2px 2px rgba(255, 255, 255, 0.4);
          border-radius: 15px;
          transition: all 0.5s ease 0.2s;
          z-index: 0;
        }
        .buy-action-button:hover::after { inset: -9px; }
        .buy-action-button::before {
          content: "";
          inset: 9px;
          position: absolute;
          background: linear-gradient(to top, var(--neutral-1), var(--neutral-2));
          opacity: 0.7;
          border-radius: 30px;
          filter: blur(0.5px);
          backdrop-filter: blur(6px);
          transition: all 0.3s ease;
          z-index: 2;
        }
        .buy-action-button:hover {
          transform: scale(1.02);
          box-shadow:
            0 0 1px 2px rgba(255, 255, 255, 0.3),
            0 15px 30px rgba(0, 0, 0, 0.3),
            0 10px 3px -3px rgba(0, 0, 0, 0.04);
        }
        .buy-action-button:active {
          transform: scale(1);
          box-shadow:
            0 0 1px 2px rgba(255, 255, 255, 0.3),
            0 10px 3px -3px rgba(0, 0, 0, 0.2);
        }
        .buy-button-bg {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: var(--radius);
          background:
            linear-gradient(var(--neutral-1), var(--neutral-2)) padding-box,
            linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.45)) border-box;
          z-index: 1;
          transition: all 0.4s ease;
        }
        .buy-action-button:hover .buy-button-bg {
          transform: scale(1.04, 1.1);
          box-shadow: inset 0 0 8px 3px rgba(0, 0, 0, 0.5);
        }
        .buy-button-bg-spin {
          position: absolute;
          border-radius: inherit;
          overflow: hidden;
          z-index: 1;
          opacity: 0;
          transition: opacity 0.4s ease;
          inset: -5px;
        }
        .buy-button-bg-spin::before {
          content: "";
          position: absolute;
          inset: -100%;
          filter: blur(20px);
          background: conic-gradient(transparent 30%, rgba(255,255,255,0.1) 80%, transparent 100%);
          animation: buySpin 2s linear infinite;
          animation-play-state: paused;
        }
        @keyframes buySpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .buy-action-button:hover .buy-button-bg-spin { opacity: 1; }
        .buy-action-button:hover .buy-button-bg-spin::before { animation-play-state: running; }
        .buy-button-bg-gradient {
          position: absolute;
          overflow: hidden;
          border-radius: 13px;
          inset: -7px;
          z-index: 0;
          opacity: 0.3;
          transition: all 0.5s linear;
          filter: blur(10px);
        }
        .buy-action-button:hover .buy-button-bg-gradient { opacity: 1; }
        .buy-button-bg-gradient::before {
          content: "";
          position: absolute;
          inset: -4px;
          margin: auto;
          aspect-ratio: 1;
          background-image: linear-gradient(90deg, #0d3fe4, #ff52e2, #fd4845, #f7d35b, #50f77d, #25e1e4);
          animation: buySpin 2s linear infinite;
        }
        .buy-state p {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .buy-state .buy-icon-plus,
        .buy-state .buy-icon-cart {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .buy-state .buy-icon-cart { transform: translate(-80px, 9px); }
        .buy-action-button:focus .buy-state .buy-icon-cart { animation: buyCart 2s linear; }
        .buy-action-button:focus .buy-state .buy-icon-cart svg path { animation: buyCartPath 2s linear; }
        .buy-state .buy-icon-cart svg {
          height: 30px;
          width: auto;
        }
        @keyframes buyCart {
          0% { transform: translate(-80px, 9px); }
          18% { transform: translate(-20px, 9px); }
          25% { transform: translate(0, 9px) rotate(4deg); }
          31% { transform: translate(10px, 9px) rotate(-25deg); }
          45% { transform: translate(30px, 9px) rotate(0deg); }
          60% { transform: translate(60px, 9px) rotate(0deg); }
          100% { transform: translate(240px, 9px) rotate(-40deg); }
        }
        @keyframes buyCartPath {
          0%, 45% { fill: transparent; }
          55%, 100% { fill: currentColor; }
        }
        .buy-state--default .buy-icon-cart::before,
        .buy-state--default .buy-icon-cart::after {
          content: "";
          position: absolute;
          height: 2px;
          top: 8px;
          right: 30px;
          opacity: 0.5;
          color: rgba(128, 255, 162, 0.8);
          background: linear-gradient(to right, transparent, currentColor);
          transform-origin: right;
        }
        .buy-state--default .buy-icon-cart::after {
          top: 15px;
          right: 28px;
          opacity: 0.3;
        }
        .buy-action-button:focus .buy-state--default .buy-icon-cart::before,
        .buy-action-button:focus .buy-state--default .buy-icon-cart::after { animation: buyTrace 2s linear forwards; }
        .buy-action-button:focus .buy-state--default .buy-icon-cart::after { color: rgba(255, 255, 255, 0.4); }
        @keyframes buyTrace {
          0% { transform: rotate(0deg); width: 20px; opacity: 0.8; filter: blur(3px); }
          10% { transform: rotate(0deg); width: 20px; }
          25% { transform: rotate(-4deg); width: 30px; filter: blur(0); opacity: 0.2; }
          31% { transform: rotate(25deg); width: 5px; opacity: 0.2; filter: blur(2px); }
          45% { transform: rotate(0deg); width: 40px; filter: blur(0); }
          60% { transform: rotate(0deg); width: 50px; filter: blur(0); }
          100% { transform: rotate(40deg); width: 100px; filter: blur(3px); }
        }
        .buy-state--default .buy-icon-plus svg { animation: buyPlus 0.6s ease forwards; }
        .buy-state--default .buy-icon-plus svg path { transform-origin: center; }
        .buy-action-button:hover .buy-icon-plus svg path { stroke-width: 4px; }
        @keyframes buyPlus {
          0% { transform: translateX(-60px) translateY(30px) rotate(-100deg) scale(2); opacity: 0; filter: blur(3px); color: lightgreen; }
          100% { transform: translateX(0) translateY(0) rotate(0); opacity: 1; filter: blur(0); }
        }
        .buy-action-button:hover .buy-state--default .buy-icon-plus svg path,
        .buy-action-button:focus .buy-state--default .buy-icon-plus svg path { animation: buyRotatePlus 0.6s cubic-bezier(0.5, 1, 0.3, 1.6) forwards; }
        .buy-action-button:hover .buy-state--default .buy-icon-plus svg { animation: buyScalePlus 0.6s cubic-bezier(0.5, 1, 0.3, 1.6) forwards; }
        .buy-action-button:focus .buy-state--default .buy-icon-plus svg { animation: buyMovePlus 2s linear forwards; }
        @keyframes buyRotatePlus {
          30% { stroke: white; }
          100% { transform: rotate(90deg); }
        }
        @keyframes buyScalePlus {
          30% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes buyMovePlus {
          10%, 18% { transform: translate(0px, 0px); stroke: white; }
          25% { transform: translate(5px, 0px) rotate(-80deg); stroke: #00ff00; filter: blur(0); }
          40% { transform: translate(32px, -15px) rotate(-200deg); filter: blur(2px); }
          55% { transform: translate(55px, 10px) rotate(-360deg); }
          60%, 100% { transform: translate(80px, 10px) rotate(-360deg) scale(0); }
        }
        .buy-state p span {
          display: block;
          opacity: 0;
          animation: buySlideDown 0.8s ease forwards calc(var(--i) * 0.03s);
        }
        .buy-action-button:hover p span {
          opacity: 1;
          animation: buyWave 0.5s ease forwards calc(var(--i) * 0.03s);
        }
        .buy-action-button:focus p span {
          opacity: 1;
          animation: buyDisappear 0.6s ease forwards calc(0.5s + var(--i) * 0.1s);
        }
        @keyframes buyWave {
          30% { opacity: 1; transform: translateY(4px) translateX(0) rotate(0); }
          50% { opacity: 1; transform: translateY(-3px) translateX(0) rotate(0); color: var(--primary); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes buySlideDown {
          0% { opacity: 0; transform: translateY(20px) translateX(0px); color: var(--primary); filter: blur(5px); }
          20% { opacity: 1; transform: translateY(-4px) translateX(-2px) rotate(-10deg); filter: blur(0); }
          50% { opacity: 1; transform: translateY(3px) translateX(3px) rotate(0); }
          100% { opacity: 1; transform: translateY(0) translateX(0) rotate(0); }
        }
        @keyframes buyDisappear {
          from { opacity: 1; }
          to { opacity: 0; transform: translateX(5px) translateY(-20px); color: var(--primary); filter: blur(5px); }
        }
        .buy-action-button svg path { transition: all 0.5s ease; }
        .buy-state {
          padding-left: 29px;
          display: flex;
          position: relative;
        }
        .buy-state--default span:nth-child(3) { margin-right: 5px; }
        .buy-state--added {
          display: none;
          color: white;
        }
        .buy-state--added .buy-icon-plus svg {
          stroke-dasharray: 24 24;
          stroke-dashoffset: -24;
        }
        .buy-action-button:focus .buy-state--default { position: absolute; }
        .buy-action-button:focus .buy-state--added {
          display: flex;
          --primary: lightgreen;
        }
        .buy-action-button:focus .buy-state--added span {
          opacity: 0;
          animation: buySlideDown 1.2s ease forwards calc(1s + var(--i) * 0.1s);
        }
        .buy-action-button:focus .buy-state--added .buy-icon-plus svg { animation: buyCheck 1s cubic-bezier(0.5, -0.15, 0.3, 1.4) forwards 1s; }
        @keyframes buyCheck {
          0% { stroke-dashoffset: -24; transform: scale(4); filter: blur(3px); }
          50% { stroke-dashoffset: -7; }
          100% { transform: scale(1); stroke-dashoffset: 0; }
        }
        /* Skeuomorphic top panel polish: raised molded ivory toolbar, recessed nav tray, tactile pills. */
        header .skeuo-toolbar {
          position: relative !important;
          isolation: isolate !important;
          overflow: hidden !important;
          border: 1px solid rgba(186, 164, 132, 0.48) !important;
          background:
            radial-gradient(circle at 10% 0%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.66) 27%, transparent 42%),
            radial-gradient(circle at 82% 22%, rgba(255,232,171,0.42), transparent 38%),
            linear-gradient(180deg, rgba(255,253,248,0.94) 0%, rgba(246,238,224,0.91) 54%, rgba(232,218,196,0.92) 100%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(1.18) !important;
          backdrop-filter: blur(18px) saturate(1.18) !important;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.96),
            inset 0 -2px 0 rgba(159,125,82,0.16),
            inset 0 -18px 30px rgba(141,100,50,0.07),
            0 2px 0 rgba(255,255,255,0.62),
            0 18px 44px rgba(88,64,38,0.18),
            0 6px 18px rgba(124,58,237,0.09) !important;
        }

        header .skeuo-toolbar::before {
          content: "" !important;
          position: absolute !important;
          z-index: 0 !important;
          inset: 5px 8px auto 8px !important;
          height: 47% !important;
          border-radius: 24px 24px 18px 18px !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.14)) !important;
          opacity: 0.92 !important;
        }

        header .skeuo-toolbar::after {
          content: "" !important;
          position: absolute !important;
          z-index: 0 !important;
          inset: 8px !important;
          border-radius: 22px !important;
          pointer-events: none !important;
          border: 1px solid rgba(255,255,255,0.72) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            inset 0 -10px 18px rgba(121,85,43,0.055) !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), transparent 45%) !important;
        }

        header .skeuo-toolbar > div:first-child {
          position: relative !important;
          z-index: 2 !important;
        }

        header .skeuo-engraved-plaque {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(206,190,168,0.74) !important;
          background:
            radial-gradient(circle at 18% 12%, rgba(255,255,255,0.98), transparent 38%),
            linear-gradient(180deg, rgba(255,255,255,0.90), rgba(244,239,231,0.82)) !important;
          -webkit-backdrop-filter: blur(10px) saturate(1.05) !important;
          backdrop-filter: blur(10px) saturate(1.05) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -2px 0 rgba(149,119,82,0.08),
            0 10px 18px rgba(80,61,43,0.12),
            0 1px 0 rgba(255,255,255,0.76) !important;
        }

        header .skeuo-engraved-plaque::before {
          content: "" !important;
          position: absolute !important;
          inset: 2px 10px auto 10px !important;
          height: 38% !important;
          border-radius: 999px !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.03)) !important;
        }

        header .skeuo-engraved-plaque img {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.70),
            0 1px 0 rgba(255,255,255,0.92),
            0 8px 16px rgba(48,36,26,0.20) !important;
        }

        header .skeuo-nav-tray {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(199,177,150,0.62) !important;
          background:
            linear-gradient(180deg, rgba(238,226,208,0.76), rgba(255,251,244,0.78) 40%, rgba(255,255,255,0.70)) !important;
          -webkit-backdrop-filter: blur(12px) saturate(1.08) !important;
          backdrop-filter: blur(12px) saturate(1.08) !important;
          box-shadow:
            inset 0 3px 7px rgba(92,69,44,0.11),
            inset 0 -1px 0 rgba(255,255,255,0.82),
            0 1px 0 rgba(255,255,255,0.82),
            0 10px 22px rgba(71,50,29,0.08) !important;
        }

        header .skeuo-nav-tray::before {
          content: "" !important;
          position: absolute !important;
          inset: 3px 8px auto 8px !important;
          height: 36% !important;
          border-radius: 999px !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,255,255,0.03)) !important;
        }

        header .skeuo-nav-tray .nav-link,
        header .skeuo-nav-tray .nav-pill {
          position: relative !important;
          z-index: 1 !important;
        }

        header .skeuo-nav-tray .nav-link {
          border: 1px solid transparent !important;
          background: transparent !important;
          color: rgb(51 65 85) !important;
          text-shadow: 0 1px 0 rgba(255,255,255,0.82) !important;
        }

        header .skeuo-nav-tray .nav-link:hover {
          color: rgb(15 23 42) !important;
          border-color: rgba(209,188,160,0.62) !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(242,235,224,0.76)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.95),
            inset 0 -1px 0 rgba(151,114,66,0.08),
            0 7px 13px rgba(86,64,39,0.10) !important;
        }

        header .skeuo-nav-tray .nav-pill {
          border: 1px solid rgba(192,150,255,0.72) !important;
          background:
            radial-gradient(circle at 28% 8%, rgba(255,255,255,0.64), transparent 34%),
            linear-gradient(180deg, #a855f7 0%, #7c3aed 56%, #5b21b6 100%) !important;
          color: white !important;
          text-shadow: 0 1px 0 rgba(52,16,105,0.56) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.58),
            inset 0 -3px 0 rgba(54,17,99,0.24),
            0 2px 0 rgba(88,28,135,0.36),
            0 10px 22px rgba(124,58,237,0.26),
            0 0 28px rgba(168,85,247,0.18) !important;
        }

        header .skeuo-nav-tray .nav-pill::before {
          content: "" !important;
          position: absolute !important;
          inset: 2px 5px auto 5px !important;
          height: 42% !important;
          border-radius: inherit !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.56), transparent) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > a,
        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          position: relative !important;
          overflow: hidden !important;
          border: 1px solid rgba(214,196,170,0.72) !important;
          background:
            radial-gradient(circle at 28% 4%, rgba(255,255,255,0.95), transparent 38%),
            linear-gradient(180deg, rgba(255,255,255,0.88), rgba(240,232,219,0.80)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -2px 0 rgba(143,109,69,0.08),
            0 10px 18px rgba(78,56,35,0.12),
            0 1px 0 rgba(255,255,255,0.82) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > a::before,
        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div::before {
          content: "" !important;
          position: absolute !important;
          inset: 2px 7px auto 7px !important;
          height: 42% !important;
          border-radius: 999px !important;
          pointer-events: none !important;
          background: linear-gradient(180deg, rgba(255,255,255,0.62), transparent) !important;
        }

        header .skeuo-toolbar > div:first-child > div:nth-child(3) > div {
          color: rgb(109 40 217) !important;
          background:
            radial-gradient(circle at 30% 6%, rgba(255,255,255,0.96), transparent 38%),
            radial-gradient(circle at 92% 92%, rgba(236,72,153,0.20), transparent 46%),
            linear-gradient(180deg, rgba(252,249,255,0.90), rgba(239,232,255,0.76)) !important;
        }




        /* Cleaned skeuomorphic navbar without decorative loose shapes */
        header .skeuo-toolbar::before,
        header .skeuo-toolbar::after,
        header .skeuo-engraved-plaque::before,
        header .skeuo-engraved-plaque::after {
          content: none !important;
          display: none !important;
        }

        header .skeuo-toolbar {
          overflow: hidden !important;
          border: 1px solid rgba(194, 173, 146, 0.62) !important;
          border-radius: 30px !important;
          background:
            linear-gradient(180deg, rgba(255,253,248,0.96) 0%, rgba(248,241,230,0.94) 56%, rgba(232,218,196,0.92) 100%) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -8px 18px rgba(130,96,50,0.09),
            0 2px 0 rgba(255,255,255,0.70),
            0 18px 34px rgba(82,62,38,0.16) !important;
        }

        header .skeuo-engraved-plaque {
          border-radius: 22px !important;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,242,234,0.94)) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.98),
            inset 0 -5px 12px rgba(80,60,40,0.055),
            0 10px 22px rgba(69,52,33,0.10) !important;
        }

      `}</style>

    </>
  )
}

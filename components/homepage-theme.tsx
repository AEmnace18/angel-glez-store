"use client"

function ThemeCartIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.7" />
      <circle cx="17" cy="19" r="1.7" />
    </svg>
  )
}

function ThemeHeartIcon({ className = "h-4 w-4", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path
        d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StoreHeader({ cartCount = 0, likedCount = 0 }: { cartCount?: number; likedCount?: number }) {
  return (
    <header className="agt-store-header sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-5">
      <div className="mx-auto max-w-7xl">
        <div className="agt-toolbar rounded-[28px] px-3 py-3 md:px-5 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <a
              href="/"
              className="agt-brand-plaque group flex min-w-0 items-center gap-3 rounded-[22px] px-3 py-2.5 transition duration-300 hover:-translate-y-0.5"
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

            <nav className="agt-nav-tray hidden items-center gap-2 rounded-[22px] p-2 md:flex">
              <a href="/#quarters" className="agt-nav-link rounded-xl px-4 py-2.5 text-sm font-semibold transition">
                Quarters
              </a>
              <a href="/#find-my-cot" className="agt-nav-pill rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition">
                Find My COT
              </a>
              <a href="/shop" className="agt-nav-link rounded-xl px-4 py-2.5 text-sm font-semibold transition">
                Shop
              </a>
              <a href="/purchases" className="agt-nav-link rounded-xl px-4 py-2.5 text-sm font-semibold transition">
                Purchases
              </a>
              <a href="/admin-login" className="agt-nav-link rounded-xl px-4 py-2.5 text-sm font-semibold transition">
                Admin
              </a>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <a href="/cart" className="agt-header-button flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5">
                <ThemeCartIcon className="h-4 w-4" />
                <span>Cart {cartCount}</span>
              </a>

              <div className="agt-header-button agt-heart-pill flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-bold text-violet-700">
                <ThemeHeartIcon className="h-4 w-4" filled />
                <span>{likedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <a href="/cart" className="agt-header-button flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold text-slate-900">
                <ThemeCartIcon className="h-4 w-4" />
                <span>{cartCount}</span>
              </a>
              <div className="agt-header-button agt-heart-pill flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold text-violet-700">
                <ThemeHeartIcon className="h-4 w-4" filled />
                <span>{likedCount}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 md:hidden">
            <div className="agt-nav-tray grid grid-cols-5 gap-2 rounded-[24px] p-2">
              <a href="/#quarters" className="agt-nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold transition">Qtrs</a>
              <a href="/#find-my-cot" className="agt-nav-pill rounded-2xl px-2 py-2 text-center text-xs font-semibold text-white transition">Finder</a>
              <a href="/shop" className="agt-nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold transition">Shop</a>
              <a href="/purchases" className="agt-nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold transition">Files</a>
              <a href="/admin-login" className="agt-nav-link rounded-2xl px-2 py-2 text-center text-xs font-semibold transition">Admin</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export function HomepageThemeStyles() {
  return (
    <style>{`
      :root {
        --agt-ink: #0f172a;
        --agt-muted: #64748b;
        --agt-paper: rgba(255, 253, 248, 0.94);
        --agt-paper-deep: rgba(246, 238, 224, 0.92);
        --agt-border: rgba(194, 173, 146, 0.62);
        --agt-violet: #7c3aed;
        --agt-violet-dark: #5b21b6;
      }

      .agt-page {
        position: relative;
        min-height: 100vh;
        color: var(--agt-ink);
        background:
          radial-gradient(circle at 5% 0%, rgba(124, 58, 237, 0.13), transparent 26%),
          radial-gradient(circle at 94% 10%, rgba(250, 204, 21, 0.20), transparent 28%),
          linear-gradient(180deg, #fffaf1 0%, #f3eadb 48%, #fbf7ee 100%) !important;
      }

      .agt-page::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        opacity: 0.45;
        background-image:
          linear-gradient(rgba(120, 95, 68, 0.065) 1px, transparent 1px),
          linear-gradient(90deg, rgba(120, 95, 68, 0.05) 1px, transparent 1px);
        background-size: 32px 32px;
        mask-image: linear-gradient(180deg, black, rgba(0,0,0,0.66), transparent 92%);
      }

      .agt-page > * {
        position: relative;
        z-index: 1;
      }

      .agt-toolbar {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        border: 1px solid var(--agt-border);
        background:
          linear-gradient(180deg, rgba(255,253,248,0.96) 0%, rgba(248,241,230,0.94) 56%, rgba(232,218,196,0.92) 100%);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.98),
          inset 0 -8px 18px rgba(130,96,50,0.09),
          0 2px 0 rgba(255,255,255,0.70),
          0 18px 34px rgba(82,62,38,0.16);
        -webkit-backdrop-filter: blur(18px) saturate(1.08);
        backdrop-filter: blur(18px) saturate(1.08);
      }

      .agt-brand-plaque,
      .agt-nav-tray,
      .agt-header-button {
        border: 1px solid rgba(205,190,169,0.75);
        background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,242,234,0.94));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.98),
          inset 0 -5px 12px rgba(80,60,40,0.055),
          0 10px 22px rgba(69,52,33,0.10);
      }

      .agt-nav-tray {
        background: linear-gradient(180deg, rgba(238,226,208,0.76), rgba(255,251,244,0.78) 40%, rgba(255,255,255,0.70));
        box-shadow:
          inset 0 3px 7px rgba(92,69,44,0.11),
          inset 0 -1px 0 rgba(255,255,255,0.82),
          0 1px 0 rgba(255,255,255,0.82),
          0 10px 22px rgba(71,50,29,0.08);
      }

      .agt-nav-link {
        color: rgb(51 65 85);
        text-shadow: 0 1px 0 rgba(255,255,255,0.82);
      }

      .agt-nav-link:hover {
        color: rgb(15 23 42);
        background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(242,235,224,0.76));
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.95),
          inset 0 -1px 0 rgba(151,114,66,0.08),
          0 7px 13px rgba(86,64,39,0.10);
      }

      .agt-nav-pill {
        border: 1px solid rgba(192,150,255,0.72);
        background:
          radial-gradient(circle at 28% 8%, rgba(255,255,255,0.64), transparent 34%),
          linear-gradient(180deg, #a855f7 0%, #7c3aed 56%, #5b21b6 100%);
        text-shadow: 0 1px 0 rgba(52,16,105,0.56);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.58),
          inset 0 -3px 0 rgba(54,17,99,0.24),
          0 2px 0 rgba(88,28,135,0.36),
          0 10px 22px rgba(124,58,237,0.26),
          0 0 28px rgba(168,85,247,0.18);
      }

      .agt-heart-pill {
        border-color: rgba(196,181,253,0.65);
        background:
          radial-gradient(circle at 30% 6%, rgba(255,255,255,0.96), transparent 38%),
          radial-gradient(circle at 92% 92%, rgba(236,72,153,0.20), transparent 46%),
          linear-gradient(180deg, rgba(252,249,255,0.90), rgba(239,232,255,0.76));
      }

      .agt-page .agt-surface,
      .agt-page .admin-card,
      .agt-page section[class*="bg-white"],
      .agt-page aside > div[class*="bg-white"],
      .agt-page div[class*="bg-white/90"],
      .agt-page div[class*="bg-white/92"],
      .agt-page div[class*="bg-white/95"] {
        border-color: rgba(206, 190, 168, 0.72) !important;
        background:
          radial-gradient(circle at 12% 8%, rgba(255,255,255,0.94), transparent 34%),
          linear-gradient(180deg, rgba(255,253,248,0.94), rgba(245,236,220,0.90)) !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.96),
          inset 0 -10px 22px rgba(130,96,50,0.055),
          0 24px 56px rgba(75,56,37,0.12) !important;
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
      }

      .agt-page input,
      .agt-page select,
      .agt-page textarea {
        border-color: rgba(205,190,169,0.72) !important;
        background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,243,235,0.90)) !important;
        box-shadow:
          inset 0 2px 5px rgba(92,69,44,0.08),
          0 1px 0 rgba(255,255,255,0.85) !important;
      }

      .agt-page input:focus,
      .agt-page select:focus,
      .agt-page textarea:focus {
        border-color: rgba(124,58,237,0.55) !important;
        box-shadow:
          inset 0 2px 5px rgba(92,69,44,0.06),
          0 0 0 4px rgba(124,58,237,0.12) !important;
      }

      .agt-page .bg-violet-600,
      .agt-page .from-violet-600 {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.46),
          inset 0 -3px 0 rgba(54,17,99,0.25),
          0 10px 22px rgba(124,58,237,0.22) !important;
      }

      .agt-page .rounded-2xl,
      .agt-page .rounded-3xl,
      .agt-page .rounded-\[28px\],
      .agt-page .rounded-\[30px\],
      .agt-page .rounded-\[32px\],
      .agt-page .rounded-\[34px\],
      .agt-page .rounded-\[36px\] {
        transform: translateZ(0);
      }

      @media (max-width: 768px) {
        .agt-store-header { padding-left: 0.75rem; padding-right: 0.75rem; }
        .agt-toolbar { border-radius: 24px; }
        .agt-brand-plaque p:first-of-type { font-size: 1rem; }
      }
    `}</style>
  )
}

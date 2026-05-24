"use client"

export function PremiumMotionStyles() {
  return (
    <style>{`
      @keyframes premiumFadeUp {
        0% {
          opacity: 0;
          transform: translateY(18px) scale(0.985);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes premiumSoftPop {
        0% {
          opacity: 0;
          transform: translateY(8px) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes premiumPulseRing {
        0% {
          box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.34);
        }
        70% {
          box-shadow: 0 0 0 12px rgba(139, 92, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
        }
      }

      @keyframes premiumShimmer {
        0% {
          transform: translateX(-140%) skewX(-12deg);
        }
        100% {
          transform: translateX(140%) skewX(-12deg);
        }
      }

      @keyframes premiumFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-9px);
        }
      }

      @keyframes premiumSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .premium-page {
        position: relative;
        overflow-x: hidden;
      }

      .premium-page::before,
      .premium-page::after {
        content: "";
        pointer-events: none;
        position: fixed;
        z-index: 0;
        border-radius: 999px;
        filter: blur(72px);
        opacity: 0.65;
        animation: premiumFloat 6s ease-in-out infinite;
      }

      .premium-page::before {
        top: 7rem;
        left: 8%;
        width: 14rem;
        height: 14rem;
        background: rgba(139, 92, 246, 0.18);
      }

      .premium-page::after {
        right: 7%;
        top: 18rem;
        width: 16rem;
        height: 16rem;
        background: rgba(16, 185, 129, 0.16);
        animation-delay: 1.15s;
      }

      .premium-page > * {
        position: relative;
        z-index: 1;
      }

      .premium-page section,
      .premium-page aside,
      .premium-page article {
        animation: premiumFadeUp 460ms ease-out both;
      }

      .premium-page section:nth-of-type(2) {
        animation-delay: 90ms;
      }

      .premium-page section:nth-of-type(3) {
        animation-delay: 150ms;
      }

      .premium-page article {
        transition:
          transform 260ms ease,
          box-shadow 260ms ease,
          border-color 260ms ease,
          background-color 260ms ease;
      }

      .premium-page article:hover {
        transform: translateY(-5px);
        box-shadow: 0 28px 80px rgba(15, 23, 42, 0.13);
      }

      .premium-page button,
      .premium-page a[href],
      .premium-page label {
        transition:
          transform 180ms ease,
          box-shadow 230ms ease,
          border-color 230ms ease,
          background-color 230ms ease,
          color 230ms ease,
          opacity 230ms ease,
          filter 230ms ease;
      }

      .premium-page button:not(:disabled):hover,
      .premium-page a[href]:hover,
      .premium-page label:hover {
        transform: translateY(-2px);
      }

      .premium-page button:not(:disabled):active,
      .premium-page a[href]:active,
      .premium-page label:active {
        transform: translateY(0) scale(0.97);
      }

      .premium-page button:disabled {
        cursor: not-allowed;
      }

      .premium-page input,
      .premium-page textarea,
      .premium-page select {
        transition:
          border-color 230ms ease,
          box-shadow 230ms ease,
          background-color 230ms ease,
          transform 230ms ease;
      }

      .premium-page input:focus,
      .premium-page textarea:focus,
      .premium-page select:focus {
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12);
        transform: translateY(-1px);
      }

      .premium-page input[type="file"] {
        cursor: pointer;
      }

      .premium-page img {
        transition:
          transform 260ms ease,
          filter 260ms ease;
      }

      .premium-page article:hover img,
      .premium-page a:hover img,
      .premium-page label:hover img {
        transform: scale(1.035);
      }

      .premium-page button[class*="bg-violet-600"],
      .premium-page button[class*="bg-emerald-600"],
      .premium-page button[class*="bg-slate-900"],
      .premium-page a[class*="bg-violet-600"],
      .premium-page a[class*="bg-emerald-600"],
      .premium-page a[class*="bg-slate-900"] {
        position: relative;
        overflow: hidden;
      }

      .premium-page button[class*="bg-violet-600"]::after,
      .premium-page button[class*="bg-emerald-600"]::after,
      .premium-page button[class*="bg-slate-900"]::after,
      .premium-page a[class*="bg-violet-600"]::after,
      .premium-page a[class*="bg-emerald-600"]::after,
      .premium-page a[class*="bg-slate-900"]::after {
        content: "";
        pointer-events: none;
        position: absolute;
        inset: 0;
        transform: translateX(-140%) skewX(-12deg);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.30),
          transparent
        );
      }

      .premium-page button[class*="bg-violet-600"]:hover::after,
      .premium-page button[class*="bg-emerald-600"]:hover::after,
      .premium-page button[class*="bg-slate-900"]:hover::after,
      .premium-page a[class*="bg-violet-600"]:hover::after,
      .premium-page a[class*="bg-emerald-600"]:hover::after,
      .premium-page a[class*="bg-slate-900"]:hover::after {
        animation: premiumShimmer 850ms ease-out;
      }

      .premium-page button[class*="shadow-lg"],
      .premium-page a[class*="shadow-lg"] {
        animation: premiumPulseRing 700ms ease-out;
      }

      .premium-pop {
        animation: premiumSoftPop 280ms ease-out both;
      }

      .premium-spin {
        animation: premiumSpin 800ms linear infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .premium-page::before,
        .premium-page::after,
        .premium-page section,
        .premium-page aside,
        .premium-page article,
        .premium-page button[class*="shadow-lg"],
        .premium-pop,
        .premium-spin {
          animation: none !important;
        }

        .premium-page *,
        .premium-page *::before,
        .premium-page *::after {
          transition: none !important;
        }

        .premium-page button:not(:disabled):hover,
        .premium-page a[href]:hover,
        .premium-page label:hover,
        .premium-page button:not(:disabled):active,
        .premium-page a[href]:active,
        .premium-page label:active,
        .premium-page article:hover,
        .premium-page input:focus,
        .premium-page textarea:focus,
        .premium-page select:focus,
        .premium-page article:hover img,
        .premium-page a:hover img,
        .premium-page label:hover img {
          transform: none !important;
        }
      }
    `}</style>
  )
}

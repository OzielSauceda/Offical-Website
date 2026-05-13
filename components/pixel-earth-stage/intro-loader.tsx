"use client";

// "TUNING ARENA" intro loader. Masks the StageCanvas mount + texture/shader
// compilation flash. Self-contained: no scene or canvas modifications.

import { CSSProperties, useEffect, useState } from "react";

import { Major_Mono_Display, VT323 } from "next/font/google";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});
const monoDisplay = Major_Mono_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const MIN_DISPLAY_MS = 1500;
const MAX_WAIT_MS = 6000;
const POST_CANVAS_BUFFER_MS = 320;
const FADE_OUT_MS = 600;

export function IntroLoader() {
  const [ready, setReady] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const start = performance.now();
    let raf = 0;
    let cancelled = false;
    let scheduled = false;

    function check() {
      if (cancelled) return;
      const elapsed = performance.now() - start;
      const canvasMounted = document.querySelectorAll("canvas").length > 0;
      const minMet = elapsed >= MIN_DISPLAY_MS;
      const timedOut = elapsed >= MAX_WAIT_MS;

      if (((minMet && canvasMounted) || timedOut) && !scheduled) {
        scheduled = true;
        // Small post-canvas buffer so the first frame paints before we fade.
        window.setTimeout(() => {
          if (!cancelled) setReady(true);
        }, POST_CANVAS_BUFFER_MS);
        return;
      }
      raf = requestAnimationFrame(check);
    }
    raf = requestAnimationFrame(check);

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setReady(true);
    }
    window.addEventListener("keydown", onEscape);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setRemoved(true), FADE_OUT_MS + 60);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (removed) return null;

  return (
    <div
      aria-hidden="true"
      data-state={ready ? "out" : "in"}
      className="intro-loader"
    >
      <style>{LOADER_CSS}</style>

      <div className="intro-loader__bg" />
      <div className="intro-loader__halos" />
      <div className="intro-loader__grain" />
      <div className="intro-loader__scan" />
      <div className="intro-loader__vignette" />

      <div className={`intro-loader__corner intro-loader__corner--tl ${vt323.className}`}>
        <span className="intro-loader__corner-mark">▮</span>
        STAGE.SYS &nbsp;//&nbsp; OZIEL.ARENA
      </div>

      <div className={`intro-loader__corner intro-loader__corner--tr ${vt323.className}`}>
        <span className="intro-loader__live-dot" />
        TRANSMITTING
      </div>

      <div className="intro-loader__stage">
        <div className="intro-loader__dial">
          <svg viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
            <defs>
              <linearGradient id="introNeon" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a8b6ff" />
                <stop offset="100%" stopColor="#ff8aa0" />
              </linearGradient>
              <radialGradient id="introCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            <g className="intro-loader__ticks">
              {Array.from({ length: 60 }).map((_, i) => {
                const big = i % 5 === 0;
                return (
                  <line
                    key={i}
                    x1="120"
                    y1={big ? 8 : 12}
                    x2="120"
                    y2={big ? 22 : 18}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={big ? 1.4 : 0.8}
                    transform={`rotate(${i * 6} 120 120)`}
                  />
                );
              })}
            </g>

            <circle
              cx="120"
              cy="120"
              r="92"
              fill="none"
              stroke="rgba(168,182,255,0.22)"
              strokeWidth="1"
            />

            <g className="intro-loader__cursor">
              <circle
                cx="120"
                cy="120"
                r="92"
                fill="none"
                stroke="rgba(255,138,160,0.32)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray="48 530"
                style={{ filter: "blur(7px)" }}
              />
              <circle
                cx="120"
                cy="120"
                r="92"
                fill="none"
                stroke="url(#introNeon)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="48 530"
              />
            </g>

            <circle
              cx="120"
              cy="120"
              r="62"
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
              strokeDasharray="2 5"
              className="intro-loader__inner-ring"
            />
            <circle
              cx="120"
              cy="120"
              r="42"
              fill="none"
              stroke="rgba(168,182,255,0.10)"
              strokeWidth="1"
              strokeDasharray="1 3"
              className="intro-loader__inner-ring-2"
            />

            <circle cx="120" cy="120" r="22" fill="url(#introCore)" opacity="0.45" />
            <circle cx="120" cy="120" r="2.6" fill="#ffffff" className="intro-loader__pulse" />
          </svg>
        </div>

        <div className={`intro-loader__wordmark ${monoDisplay.className}`} aria-label="Oziel">
          {"OZIEL".split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 90}ms` } as CSSProperties}>
              {ch}
            </span>
          ))}
        </div>

        <div className={`intro-loader__subtitle ${vt323.className}`}>
          <span className="intro-loader__caret">›</span>
          tuning&nbsp;&nbsp;arena&nbsp;&nbsp;signal
          <span className="intro-loader__blink">_</span>
        </div>

        <div className="intro-loader__bar" role="presentation">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="intro-loader__bar-seg"
              style={{ animationDelay: `${i * 95 + 250}ms` } as CSSProperties}
            />
          ))}
        </div>
      </div>

      <div className={`intro-loader__corner intro-loader__corner--bl ${vt323.className}`}>
        ch.0 · 22.05khz · stable
      </div>

      <div className={`intro-loader__corner intro-loader__corner--br intro-loader__hint ${vt323.className}`}>
        [esc] bypass
      </div>
    </div>
  );
}

const LOADER_CSS = `
  .intro-loader {
    position: fixed;
    inset: 0;
    z-index: 9999;
    color: rgba(255, 255, 255, 0.92);
    opacity: 1;
    transition: opacity ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity;
    isolation: isolate;
  }
  .intro-loader[data-state="out"] {
    opacity: 0;
    pointer-events: none;
  }
  .intro-loader[data-state="out"] .intro-loader__stage {
    transform: scale(1.03);
    transition: transform ${FADE_OUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .intro-loader__bg,
  .intro-loader__halos,
  .intro-loader__grain,
  .intro-loader__scan,
  .intro-loader__vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .intro-loader__bg { background: #04030a; }

  .intro-loader__halos {
    background:
      radial-gradient(ellipse 65% 45% at 50% 45%, rgba(168, 182, 255, 0.14), transparent 70%),
      radial-gradient(ellipse 38% 32% at 28% 72%, rgba(255, 138, 160, 0.11), transparent 70%),
      radial-gradient(ellipse 32% 28% at 72% 24%, rgba(157, 109, 255, 0.09), transparent 70%);
    animation: introDrift 18s ease-in-out infinite alternate;
  }
  @keyframes introDrift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(-18px, 12px); }
  }

  .intro-loader__grain {
    background-image:
      radial-gradient(rgba(255,255,255,0.55) 0.7px, transparent 0.7px),
      radial-gradient(rgba(168,182,255,0.45) 0.5px, transparent 0.5px);
    background-size: 220px 220px, 110px 110px;
    background-position: 0 0, 55px 55px;
    opacity: 0.22;
    mix-blend-mode: screen;
  }

  .intro-loader__scan {
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 2px,
      rgba(255, 255, 255, 0.022) 2px,
      rgba(255, 255, 255, 0.022) 3px
    );
    mix-blend-mode: overlay;
  }

  .intro-loader__vignette {
    background: radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%);
  }

  .intro-loader__corner {
    position: absolute;
    color: rgba(255, 255, 255, 0.55);
    font-size: 14px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.6em;
    text-shadow: 0 0 10px rgba(0,0,0,0.7);
    white-space: nowrap;
  }
  .intro-loader__corner--tl { top: 22px; left: 28px; }
  .intro-loader__corner--tr { top: 22px; right: 28px; }
  .intro-loader__corner--bl { bottom: 22px; left: 28px; }
  .intro-loader__corner--br { bottom: 22px; right: 28px; }

  .intro-loader__corner-mark {
    color: rgba(168, 182, 255, 0.95);
    animation: introBlink 1.4s steps(2) infinite;
  }
  @keyframes introBlink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.2; }
  }

  .intro-loader__live-dot {
    width: 7px;
    height: 7px;
    background: #ff8aa0;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(255,138,160,0.9);
    animation: introLive 1.2s ease-in-out infinite;
  }
  @keyframes introLive {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.85); }
  }

  .intro-loader__stage {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    will-change: transform;
  }

  .intro-loader__dial {
    filter: drop-shadow(0 0 28px rgba(168, 182, 255, 0.22));
    animation: introDialIn 900ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes introDialIn {
    0% { opacity: 0; transform: scale(0.86) rotate(-8deg); }
    100% { opacity: 1; transform: scale(1) rotate(0); }
  }

  .intro-loader__ticks {
    transform-origin: 120px 120px;
    animation: introSpin 28s linear infinite;
  }
  .intro-loader__cursor {
    transform-origin: 120px 120px;
    animation: introSpin 4s linear infinite reverse;
  }
  .intro-loader__inner-ring {
    transform-origin: 120px 120px;
    animation: introSpin 16s linear infinite;
  }
  .intro-loader__inner-ring-2 {
    transform-origin: 120px 120px;
    animation: introSpin 9s linear infinite reverse;
  }
  @keyframes introSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .intro-loader__pulse {
    animation: introHeartbeat 1.6s ease-in-out infinite;
    transform-origin: 120px 120px;
    transform-box: fill-box;
  }
  @keyframes introHeartbeat {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(2.4); opacity: 0.45; }
  }

  .intro-loader__wordmark {
    margin-top: 42px;
    font-size: 40px;
    letter-spacing: 0.55em;
    padding-left: 0.55em;
    color: rgba(255, 255, 255, 0.97);
    text-shadow:
      0 0 16px rgba(168, 182, 255, 0.55),
      0 0 36px rgba(255, 138, 160, 0.22);
  }
  .intro-loader__wordmark span {
    display: inline-block;
    opacity: 0;
    transform: translateY(10px);
    animation: introLetterIn 720ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes introLetterIn {
    to { opacity: 1; transform: translateY(0); }
  }

  .intro-loader__subtitle {
    margin-top: 16px;
    font-size: 19px;
    letter-spacing: 0.35em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 0.5em;
    animation: introFadeUp 700ms 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes introFadeUp {
    0% { opacity: 0; transform: translateY(6px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .intro-loader__caret { color: #ff8aa0; }
  .intro-loader__blink {
    animation: introCursor 1.0s steps(2) infinite;
    margin-left: 2px;
    color: rgba(255, 255, 255, 0.7);
  }
  @keyframes introCursor {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .intro-loader__bar {
    margin-top: 26px;
    display: flex;
    gap: 4px;
    padding: 5px;
    border: 1px solid rgba(255,255,255,0.13);
    background: rgba(255,255,255,0.02);
    box-shadow:
      inset 0 0 18px rgba(168, 182, 255, 0.06),
      0 0 24px rgba(0,0,0,0.55);
  }
  .intro-loader__bar-seg {
    width: 13px;
    height: 9px;
    background: linear-gradient(90deg, #a8b6ff, #ff8aa0);
    box-shadow: 0 0 7px rgba(168, 182, 255, 0.65);
    opacity: 0;
    animation: introSegFill 260ms forwards;
  }
  @keyframes introSegFill {
    to { opacity: 1; }
  }

  .intro-loader__hint {
    opacity: 0;
    animation: introFadeUp 500ms 1100ms forwards;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.28em;
  }

  @media (max-width: 640px) {
    .intro-loader__corner {
      font-size: 11px;
      letter-spacing: 0.22em;
    }
    .intro-loader__corner--tl, .intro-loader__corner--tr,
    .intro-loader__corner--bl, .intro-loader__corner--br {
      top: 14px; bottom: 14px;
      left: 14px; right: 14px;
    }
    .intro-loader__corner--tl, .intro-loader__corner--tr { bottom: auto; }
    .intro-loader__corner--bl, .intro-loader__corner--br { top: auto; }
    .intro-loader__dial svg { width: 200px; height: 200px; }
    .intro-loader__wordmark {
      font-size: 30px;
      letter-spacing: 0.42em;
      padding-left: 0.42em;
      margin-top: 30px;
    }
    .intro-loader__subtitle { font-size: 15px; letter-spacing: 0.25em; margin-top: 12px; }
    .intro-loader__bar-seg { width: 10px; height: 7px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .intro-loader,
    .intro-loader * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
    .intro-loader__wordmark span { animation-duration: 200ms !important; }
  }
`;

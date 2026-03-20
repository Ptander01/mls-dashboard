import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Replace this URL with your hosted video once uploaded to Vercel Blob,
 * Cloudflare R2, or another CDN.  During local development you can point
 * it at a file served from `public/`.
 */
const SPLASH_VIDEO_URL = "https://lgwwk3igzcagstag.public.blob.vercel-storage.com/splash-optimized.mp4";

/**
 * Static fallback image shown while the video loads or if it fails.
 * This file IS committed to the repo (~66 KB).
 */
import splashFallback from "../assets/splash-fallback.webp";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SplashIntro() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(() => {
    // Only show the splash once per browser session
    return sessionStorage.getItem("splashSeen") !== "true";
  });
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  /** Called when the video has buffered enough to play through. */
  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  /** Called when the video finishes playing. */
  const handleEnded = useCallback(() => {
    dismiss();
  }, []);

  /** Called if the video source fails to load. */
  const handleError = useCallback(() => {
    setVideoFailed(true);
    // Show the static fallback for 2 seconds, then fade out
    setTimeout(() => dismiss(), 2000);
  }, []);

  /** Dismiss the splash overlay and mark it as seen. */
  const dismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("splashSeen", "true");
  }, []);

  // If the splash was already seen this session, render nothing.
  if (!visible && !videoReady) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1a1a2e]"
        >
          {/* ---- Video layer ---- */}
          {!videoFailed && (
            <video
              ref={videoRef}
              src={SPLASH_VIDEO_URL}
              autoPlay
              muted
              playsInline
              preload="auto"
              onCanPlayThrough={handleCanPlay}
              onEnded={handleEnded}
              onError={handleError}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* ---- Static fallback (shown while loading or on error) ---- */}
          {(!videoReady || videoFailed) && (
            <img
              src={splashFallback}
              alt="MLS — A Deeper Look"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* ---- Skip button ---- */}
          <button
            onClick={dismiss}
            className="absolute bottom-8 right-8 rounded-full bg-white/10 px-5 py-2
                       text-sm font-medium tracking-wide text-white/70
                       backdrop-blur-sm transition-colors hover:bg-white/20
                       hover:text-white focus:outline-none focus:ring-2
                       focus:ring-white/30"
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

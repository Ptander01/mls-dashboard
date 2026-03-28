import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import splashFallback from "../assets/splash-fallback.webp";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SPLASH_VIDEO_URL =
  "https://lgwwk3igzcagstag.public.blob.vercel-storage.com/splash-optimized.mp4";

// ---------------------------------------------------------------------------
// Loading Spinner
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
      {/* Minimalist ring spinner */}
      <div
        className="w-8 h-8 rounded-full border-2 border-white/20"
        style={{
          borderTopColor: "rgba(0, 212, 255, 0.8)",
          animation: "splash-spin 1s linear infinite",
        }}
      />
      <span className="text-xs font-mono text-white/40 tracking-widest uppercase">
        Loading
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SplashIntro() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    // Only show the splash once per browser session
    return sessionStorage.getItem("splashSeen") !== "true";
  });
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  /** Dismiss the splash overlay and mark it as seen. */
  const dismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("splashSeen", "true");
  }, []);

  /** Called when the video has buffered enough to play through. */
  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  /** Called when the video finishes playing. */
  const handleEnded = useCallback(() => {
    dismiss();
  }, [dismiss]);

  /** Called if the video source fails to load. */
  const handleError = useCallback(() => {
    setVideoFailed(true);
    // Show the static fallback for 2 seconds, then fade out
    setTimeout(() => dismiss(), 2000);
  }, [dismiss]);

  // If reduced motion is preferred, skip splash entirely
  if (prefersReducedMotion) {
    if (visible) {
      sessionStorage.setItem("splashSeen", "true");
    }
    return null;
  }

  // If the splash was already seen this session, render nothing.
  if (!visible) return null;

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
          {/* ---- Video layer with crossfade ---- */}
          {!videoFailed && (
            <motion.video
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
              initial={{ opacity: 0 }}
              animate={{ opacity: videoReady ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          )}

          {/* ---- Static fallback with crossfade (shown while loading or on error) ---- */}
          <motion.img
            src={splashFallback}
            alt="MLS — A Deeper Look"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 1 }}
            animate={{ opacity: videoReady && !videoFailed ? 0 : 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />

          {/* ---- Loading spinner (visible while video is buffering) ---- */}
          <AnimatePresence>
            {!videoReady && !videoFailed && (
              <motion.div
                key="spinner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <LoadingSpinner />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Skip button with smooth hover/fade ---- */}
          <motion.button
            onClick={dismiss}
            className="absolute bottom-8 right-8 z-10 rounded-full bg-white/10 px-5 py-2
                       text-sm font-medium tracking-wide text-white/70
                       backdrop-blur-sm transition-colors hover:bg-white/20
                       hover:text-white focus:outline-none focus:ring-2
                       focus:ring-white/30 min-h-[44px] min-w-[44px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

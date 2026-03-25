/**
 * useAiCommentary.ts — React Hook for AI-Generated Team Commentary
 *
 * Manages the async lifecycle of AI commentary generation:
 *   - Loading state with abort support
 *   - In-memory + localStorage cache keyed by teamId + maxWeek + seasonYear
 *   - Automatic fallback to rule-based narrative on error
 *   - Deduplication of concurrent requests for the same team
 *
 * Usage:
 *   const { commentary, isLoading, isAi, error } = useAiCommentary(
 *     teamId, teams, matches, players, teamBudgets, totalWeeks, seasonYear, fallbackNarrative
 *   );
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { generateHolisticCommentary } from "@/lib/aiNarrativeEngine";
import type { Team, Player, Match, TeamBudget } from "@/lib/mlsData";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface AiCommentaryState {
  /** The commentary text to display (AI or fallback) */
  commentary: string;
  /** Whether the AI request is in progress */
  isLoading: boolean;
  /** Whether the displayed commentary is from AI (true) or rule-based fallback (false) */
  isAi: boolean;
  /** Error message if the AI request failed (null if no error) */
  error: string | null;
}

// ═══════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════

/** In-memory cache for the current session (fastest) */
const memoryCache = new Map<string, { commentary: string; timestamp: number }>();

/** Cache TTL: 30 minutes */
const CACHE_TTL_MS = 30 * 60 * 1000;

/** localStorage key prefix */
const LS_PREFIX = "mls_ai_commentary_";

function buildCacheKey(
  teamId: string,
  totalWeeks: number,
  seasonYear: number
): string {
  return `${teamId}_w${totalWeeks}_s${seasonYear}`;
}

function getCached(key: string): string | null {
  // Check memory cache first
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
    return mem.commentary;
  }

  // Check localStorage
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        // Promote to memory cache
        memoryCache.set(key, parsed);
        return parsed.commentary;
      }
      // Expired — clean up
      localStorage.removeItem(`${LS_PREFIX}${key}`);
    }
  } catch {
    // localStorage unavailable or corrupted — ignore
  }

  return null;
}

function setCache(key: string, commentary: string): void {
  const entry = { commentary, timestamp: Date.now() };

  // Memory cache
  memoryCache.set(key, entry);

  // localStorage (best-effort)
  try {
    localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Quota exceeded or unavailable — memory cache still works
  }
}

// ═══════════════════════════════════════════
// IN-FLIGHT DEDUPLICATION
// ═══════════════════════════════════════════

const inflightRequests = new Map<string, Promise<string>>();

// ═══════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════

export function useAiCommentary(
  teamId: string,
  teams: Team[],
  matches: Match[],
  players: Player[],
  teamBudgets: Record<string, TeamBudget>,
  totalWeeks: number,
  seasonYear: number,
  fallbackNarrative: string
): AiCommentaryState {
  const [state, setState] = useState<AiCommentaryState>({
    commentary: fallbackNarrative,
    isLoading: false,
    isAi: false,
    error: null,
  });

  // Track the current request to handle component unmount / team switches
  const abortRef = useRef(false);
  const currentKeyRef = useRef<string>("");

  useEffect(() => {
    if (!teamId) {
      setState({
        commentary: fallbackNarrative,
        isLoading: false,
        isAi: false,
        error: null,
      });
      return;
    }

    const cacheKey = buildCacheKey(teamId, totalWeeks, seasonYear);
    currentKeyRef.current = cacheKey;
    abortRef.current = false;

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      setState({
        commentary: cached,
        isLoading: false,
        isAi: true,
        error: null,
      });
      return;
    }

    // Start loading — show fallback while loading
    setState({
      commentary: fallbackNarrative,
      isLoading: true,
      isAi: false,
      error: null,
    });

    // Deduplicate: if there's already a request in flight for this key, reuse it
    let requestPromise = inflightRequests.get(cacheKey);
    if (!requestPromise) {
      requestPromise = generateHolisticCommentary(
        teamId,
        teams,
        matches,
        players,
        teamBudgets,
        totalWeeks,
        seasonYear
      );
      inflightRequests.set(cacheKey, requestPromise);
    }

    requestPromise
      .then((commentary) => {
        inflightRequests.delete(cacheKey);

        // Only update if this is still the active request
        if (abortRef.current || currentKeyRef.current !== cacheKey) return;

        setCache(cacheKey, commentary);
        setState({
          commentary,
          isLoading: false,
          isAi: true,
          error: null,
        });
      })
      .catch((err) => {
        inflightRequests.delete(cacheKey);

        if (abortRef.current || currentKeyRef.current !== cacheKey) return;

        console.warn(`[AI Commentary] Failed for ${teamId}:`, err.message);
        setState({
          commentary: fallbackNarrative,
          isLoading: false,
          isAi: false,
          error: err.message || "AI commentary unavailable",
        });
      });

    return () => {
      abortRef.current = true;
    };
    // We intentionally only re-run when the cache key inputs change,
    // not on every matches/players reference change (those are stable per season)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, totalWeeks, seasonYear, fallbackNarrative]);

  return state;
}

/**
 * InViewChart — Lazy-render wrapper using IntersectionObserver.
 *
 * Charts below the fold only mount when scrolled into view.
 * Shows a lightweight placeholder until visible, then renders children.
 * Once rendered, the chart stays mounted (no unmount on scroll-away).
 */

import { useRef, useState, useEffect, ReactNode } from 'react';

interface InViewChartProps {
  children: ReactNode;
  /** Minimum height for the placeholder (default 200) */
  minHeight?: number;
  /** Root margin for earlier triggering (default '100px') */
  rootMargin?: string;
  className?: string;
}

export default function InViewChart({
  children,
  minHeight = 200,
  rootMargin = '100px',
  className = '',
}: InViewChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver isn't available, render immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, stay mounted
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        children
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ minHeight }}
        >
          <div className="skeleton-shimmer w-full rounded-lg" style={{ height: minHeight }} />
        </div>
      )}
    </div>
  );
}

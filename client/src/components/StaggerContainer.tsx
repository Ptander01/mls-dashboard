/**
 * StaggerContainer — Cascading entrance animation wrapper.
 *
 * Wraps children in framer-motion stagger variants so chart cards
 * fade in + translate up with an 80ms delay between each child.
 * Respects prefers-reduced-motion by skipping animations.
 */

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface StaggerContainerProps {
  children: ReactNode;
  /** Stagger delay in seconds between each child (default 0.08) */
  stagger?: number;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
      delayChildren: 0.05,
    },
  }),
};

const containerVariantsReduced = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    },
  },
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
    },
  },
};

export const staggerItemVariantsReduced = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.01,
    },
  },
};

export default function StaggerContainer({
  children,
  stagger = 0.08,
  className = "",
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? containerVariantsReduced : containerVariants}
      initial="hidden"
      animate="visible"
      custom={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Convenience wrapper for individual stagger items */
export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? staggerItemVariantsReduced : staggerItemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

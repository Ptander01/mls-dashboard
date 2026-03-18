/**
 * StaggerContainer — Cascading entrance animation wrapper.
 *
 * Wraps children in framer-motion stagger variants so chart cards
 * fade in + translate up with an 80ms delay between each child.
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

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

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
    },
  },
};

export default function StaggerContainer({
  children,
  stagger = 0.08,
  className = '',
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={containerVariants}
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
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

import { ReactNode } from 'react';

interface NeuCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'raised' | 'flat' | 'pressed' | 'concave';
  glow?: 'cyan' | 'amber' | 'emerald' | 'none';
  animate?: boolean;
  delay?: number;
  /** Allow content to overflow the card boundary (used by Gravitational Pull ABSOLUTE mode) */
  overflowVisible?: boolean;
}

export default function NeuCard({ children, className = '', variant = 'raised', glow = 'none', animate = true, delay = 0, overflowVisible = false }: NeuCardProps) {
  const variantClass = {
    raised: 'neu-raised',
    flat: 'neu-flat',
    pressed: 'neu-pressed',
    concave: 'neu-concave',
  }[variant];

  const glowClass = glow !== 'none' ? `glow-${glow}` : '';
  const overflowClass = overflowVisible ? 'overflow-visible' : 'overflow-hidden';

  return (
    <div
      className={`rounded-xl ${overflowClass} ${variantClass} ${glowClass} ${animate ? 'animate-float-in' : ''} ${className}`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

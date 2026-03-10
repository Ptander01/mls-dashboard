import { ReactNode } from 'react';

interface NeuCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'raised' | 'flat' | 'pressed' | 'concave';
  glow?: 'cyan' | 'amber' | 'emerald' | 'none';
  animate?: boolean;
  delay?: number;
}

export default function NeuCard({ children, className = '', variant = 'raised', glow = 'none', animate = true, delay = 0 }: NeuCardProps) {
  const variantClass = {
    raised: 'neu-raised',
    flat: 'neu-flat',
    pressed: 'neu-pressed',
    concave: 'neu-concave',
  }[variant];

  const glowClass = glow !== 'none' ? `glow-${glow}` : '';

  return (
    <div
      className={`rounded-xl overflow-hidden ${variantClass} ${glowClass} ${animate ? 'animate-float-in' : ''} ${className}`}
      style={animate ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

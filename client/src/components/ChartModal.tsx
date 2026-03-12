import { ReactNode, useEffect, useCallback } from 'react';
import { X, Maximize2 } from 'lucide-react';

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function ChartModal({ isOpen, onClose, title, children }: ChartModalProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Lock scroll on BOTH html and body to prevent background scrolling
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop — covers everything */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Scrollable content area — this is the ONLY thing that scrolls */}
      <div
        className="relative flex-1 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-center min-h-full py-8 px-4">
          {/* Modal card */}
          <div
            className="relative w-[95vw] neu-raised rounded-2xl overflow-hidden"
            style={{
              animation: 'modal-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5"
              style={{ background: 'var(--card-bg, var(--background))' }}
            >
              <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
                {title}
              </h2>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="p-2 rounded-lg neu-raised hover:text-cyan transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MaximizeButtonProps {
  onClick: () => void;
  className?: string;
}

export function MaximizeButton({ onClick, className = '' }: MaximizeButtonProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg text-muted-foreground hover:text-cyan hover:bg-white/5 transition-all ${className}`}
      title="Expand chart"
    >
      <Maximize2 size={13} />
    </button>
  );
}

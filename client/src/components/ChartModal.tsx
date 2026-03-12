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
      className="fixed inset-0 z-[9999]"
      onClick={onClose}
      style={{
        isolation: 'isolate',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Backdrop — covers everything */}
      <div
        className="backdrop-blur-sm"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
        }}
      />

      {/* Scrollable content area */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '2rem 1rem',
        }}
      >
        {/* Modal card */}
        <div
          className="neu-raised rounded-2xl"
          style={{
            position: 'relative',
            width: '95vw',
            maxWidth: '95vw',
            overflow: 'hidden',
            animation: 'modal-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header */}
          <div
            className="border-b border-white/5"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              background: 'var(--card-bg, var(--background))',
            }}
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
          <div style={{ padding: '1.5rem' }}>
            {children}
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

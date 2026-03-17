import { ReactNode, useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

  const modalCardRef = useRef<HTMLDivElement>(null);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      setAnimationDone(false);

      const timer = setTimeout(() => {
        setAnimationDone(true);
        window.dispatchEvent(new Event('resize'));
      }, 400);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEsc);
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      };
    } else {
      setAnimationDone(false);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  useEffect(() => {
    if (!isOpen || !modalCardRef.current) return;

    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });

    observer.observe(modalCardRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  // Use createPortal to render at document.body, bypassing any ancestor
  // transforms that would break position: fixed (e.g. tab animation wrappers
  // with translateY(0px) still create a containing block).
  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="backdrop-blur-sm"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
        }}
      />

      {/* Modal card — fixed inset with padding, guaranteed to fit viewport */}
      <div
        ref={modalCardRef}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl"
        style={{
          position: 'fixed',
          top: '2rem',
          left: '2rem',
          right: '2rem',
          bottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          background: 'var(--neu-bg-raised)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header — pinned at top */}
        <div
          className="border-b border-white/5"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            background: 'var(--card-bg, var(--background))',
            borderRadius: '1rem 1rem 0 0',
          }}
        >
          <h2 className="text-base font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
            {title}
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 rounded-lg hover:text-cyan transition-colors"
            style={{
              background: 'var(--neu-bg-raised)',
              boxShadow: '2px 2px 6px var(--neu-shadow-dark), -2px -2px 6px var(--neu-shadow-light)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable, takes all remaining space */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1.25rem',
            minHeight: 0,
            borderRadius: '0 0 1rem 1rem',
          }}
          key={animationDone ? 'ready' : 'animating'}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
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

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
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      onClick={onClose}
    >
      {/* Backdrop — fixed so it stays behind everything */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Scroll container — allows the modal to scroll when content exceeds viewport */}
      <div className="min-h-full flex items-start justify-center py-6 px-4">
        {/* Modal */}
        <div
          className="relative w-[95vw] max-h-[92vh] neu-raised rounded-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
          style={{
            animation: 'modal-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header — sticky at top of modal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <h2 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Space Grotesk' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg neu-raised hover:text-cyan transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content — scrollable within the modal */}
          <div className="flex-1 p-6 overflow-y-auto overflow-x-auto">
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

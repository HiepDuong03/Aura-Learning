import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

let openPortalCount = 0;
let previousBodyOverflow = '';

interface ModalPortalProps {
  children: React.ReactNode;
  onClose?: () => void;
  lockScroll?: boolean;
}

/**
 * Renders overlays directly into document.body so fixed positioning is ALWAYS
 * anchored to the browser viewport (immune to ancestor transforms/overflow/stacking contexts).
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({
  children,
  onClose,
  lockScroll = true
}) => {
  useEffect(() => {
    if (!lockScroll || typeof document === 'undefined') return;
    if (openPortalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openPortalCount += 1;

    return () => {
      openPortalCount = Math.max(0, openPortalCount - 1);
      if (openPortalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [lockScroll]);

  useEffect(() => {
    if (!onClose || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ResetCaseDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before a case file is reopened or reset, since that wipes attempts and board state. */
export default function ResetCaseDialog({ open, onConfirm, onCancel }: ResetCaseDialogProps) {
  // Mounted only while open
  if (!open) return null;
  return createPortal(<Dialog onConfirm={onConfirm} onCancel={onCancel} />, document.body);
}

function Dialog({ onConfirm, onCancel }: Omit<ResetCaseDialogProps, 'open'>) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Safe default: focus lands on CANCEL; Escape dismisses
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[rgba(10,8,6,0.62)]" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-case-title"
        aria-describedby="reset-case-text"
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-[#FDFBF7] shadow-2xl rounded-lg border border-[#D0C4A8] max-w-sm p-6 text-[#2b2016]">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#8B0000]
          border-2 border-double border-[#8B0000] rounded-sm">
          <AlertTriangle size={11} aria-hidden /> WARNING {'//'} CASE RE-EXAMINATION
        </span>
        <h2 id="reset-case-title" className="mt-4 font-mono text-[15px] font-bold tracking-[0.08em] uppercase">
          Reopen this case file?
        </h2>
        <p id="reset-case-text" className="mt-2 text-[13.5px] leading-relaxed text-[#4a3b2c]">
          Are you sure you want to reopen this case file? Current attempt progress and board state for this node will be reset.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 font-mono text-[12px] font-bold tracking-[0.12em] text-[#4e3629] bg-[#f6efdc]
              border border-[#D0C4A8] rounded-sm hover:bg-[#efe4c8] cursor-pointer transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76b852]">
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 font-mono text-[12px] font-bold tracking-[0.12em] text-white
              bg-[#8B0000] border border-[#5e0000] rounded-sm shadow-[0_2px_0_rgba(0,0,0,0.3)] hover:bg-[#700000] cursor-pointer transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#76b852]">
            <RotateCcw size={13} aria-hidden /> CONFIRM RESET
          </button>
        </div>
      </div>
    </div>
  );
}

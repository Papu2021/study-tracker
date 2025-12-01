import React from 'react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-[90vw] sm:max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 shadow-sm ${isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-brand-100 dark:bg-brand-900/30'}`}>
            <AlertCircle className={`h-7 w-7 ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-brand-600 dark:text-brand-400'}`} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
            {message}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex gap-3 border-t border-slate-100 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant={isDestructive ? 'danger' : 'primary'} 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className="flex-1 shadow-md"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
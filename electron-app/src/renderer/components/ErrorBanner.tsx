// src/renderer/components/ErrorBanner.tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 flex justify-between items-center z-[9999] relative animate-slide-down">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <span>{message}</span>
      </div>
      <button 
        onClick={onDismiss}
        className="hover:bg-red-200 rounded p-1 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

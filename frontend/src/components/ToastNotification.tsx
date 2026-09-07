import React from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function ToastNotification() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        // Define color scheme based on toast type
        let leftBorderColor = 'border-l-white';
        let Icon = Info;
        let iconColor = 'text-white';

        if (toast.type === 'success') {
          leftBorderColor = 'border-l-[#16a34a]';
          Icon = CheckCircle;
          iconColor = 'text-[#16a34a]';
        } else if (toast.type === 'error') {
          leftBorderColor = 'border-l-[#dc2626]';
          Icon = AlertCircle;
          iconColor = 'text-[#dc2626]';
        } else if (toast.type === 'warning') {
          leftBorderColor = 'border-l-[#d97706]';
          Icon = AlertTriangle;
          iconColor = 'text-[#d97706]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 bg-[#0f0f0f] border border-[#1e1e1e] border-l-4 ${leftBorderColor} rounded-[4px] shadow-2xl transition-all duration-200 animate-slide-in`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColor} mt-0.5`} />
            <div className="flex-1 text-sm text-white font-medium break-words leading-tight">
              {toast.message}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#6b7280] hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

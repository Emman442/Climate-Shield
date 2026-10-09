import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastMessage } from '../lib/contract/types';

interface AppContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  dismissToast: (id: string) => void;

}

const AppContext = createContext<AppContextType | undefined>(undefined);


export function AppProvider({ children }: { children: React.ReactNode }) {
  
  const [role, setRole] = useState<'admin' | 'farmer' | null>(() => {
    const savedRole = localStorage.getItem('cs_wallet_role');
    return (savedRole as 'admin' | 'farmer') || null;
  });
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);




  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
 
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

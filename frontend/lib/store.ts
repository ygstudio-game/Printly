import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  token: string | null;
  userId: string | null;
  isGuest: boolean;
  userName: string | null;  
  currentShopId: string | null;
  currentPrinterId: string | null;
  uploadedFile: {
    fileKey: string;
    fileName: string;
  } | null;
  setAuth: (data: { token: string; userId: string; name: string; isGuest: boolean }) => void;
  setShop: (shopId: string) => void;
  setPrinter: (printerId: string) => void;
  setUploadedFile: (file: { fileKey: string; fileName: string }) => void;
  clearUploadedFile: () => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      userName: null,  
      userId: null,
      isGuest: true,
      currentShopId: null,
      currentPrinterId: null,
      uploadedFile: null,

          setAuth: (data) => set({ 
        token: data.token, 
        userId: data.userId,
        userName: data.name, // ✅ Store name
        isGuest: data.isGuest 
      }),

      setShop: (shopId) => 
        set({ currentShopId: shopId }),

      setPrinter: (printerId) => 
        set({ currentPrinterId: printerId }),

      setUploadedFile: (file) => 
        set({ uploadedFile: file }),

      clearUploadedFile: () => 
        set({ uploadedFile: null }),

      logout: () => 
        set({ 
          token: null, 
        userName: null, 
          userId: null, 
          isGuest: true,
          currentShopId: null,
          currentPrinterId: null,
          uploadedFile: null
        })
    }),
    {
      name: 'printly-storage'
    }
  )
);

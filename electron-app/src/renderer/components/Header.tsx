// src/renderer/components/Header.tsx
import React from 'react';
import { RefreshCw, LogOut, Settings as SettingsIcon, Printer as PrinterIcon, Clock } from 'lucide-react';

interface HeaderProps {
  shopName: string;
  ownerName: string;
  wsStatus: string;
  printerCount: number;
  onShowHistory: () => void;  
  onSettingsClick: () => void;
  onPrintersClick: () => void;
  onRefreshClick: () => void;
  onLogoutClick: () => void;
}

export default function Header({
  shopName,
  ownerName,
  wsStatus,
  printerCount,
  onSettingsClick,
  onPrintersClick,
 onShowHistory,
  onRefreshClick,
  onLogoutClick
}: HeaderProps) {
  return (
    <header className="bg-slate-800 text-white p-4 shadow-md">
      <div className="flex justify-between items-center">
        {/* Logo & Shop Name */}
        <div>
          <h1 className="text-xl font-bold">🖨️ PRINTLY</h1>
          <p className="text-sm text-slate-300">{shopName || 'Loading...'}</p>
        </div>

        {/* Welcome Message */}
        <div className="text-center">
          <p className="text-sm text-slate-400">Welcome,</p>
          <p className="font-semibold">{ownerName || 'Owner'}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            title="Shop Settings"
          >
            <SettingsIcon size={18} />
            <span className="text-sm font-medium">Settings</span>
          </button>

          {/* Printers */}
          <button
            onClick={onPrintersClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="Manage Printers"
          >
            <PrinterIcon size={18} />
            <span className="text-sm font-medium">
              {printerCount} Printer{printerCount !== 1 ? 's' : ''}
            </span>
          </button>

          {/* WebSocket Status */}
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                wsStatus === 'connected' 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm capitalize">{wsStatus}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefreshClick}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh jobs"
          >
            <RefreshCw size={20} />
          </button>
        <button
          onClick={onShowHistory}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Clock className="w-5 h-5" />
          <span className="font-medium">History</span>
        </button>
          {/* Logout */}
          <button
            onClick={onLogoutClick}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

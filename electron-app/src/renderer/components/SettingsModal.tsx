// src/renderer/components/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Save, Settings as SettingsIcon, Loader2 } from 'lucide-react';

interface GlobalPricing {
  bwPerPage: number;
  colorPerPage: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

export default function SettingsModal({ isOpen, onClose, shopId }: SettingsModalProps) {
  const [pricing, setPricing] = useState<GlobalPricing>({
    bwPerPage: 5,
    colorPerPage: 10
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      
      // Load settings from backend
      const settings = await window.electron.invoke('get-shop-settings', shopId);
      
      if (settings && settings.pricing) {
        setPricing(settings.pricing);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);
      setError(null);

      const result = await window.electron.invoke('update-shop-settings', {
        shopId,
        pricing
      });

      if (result.success) {
        await window.electron.showConfirmationDialog({
          title: 'Success',
          message: 'Settings saved successfully!',
          buttons: ['OK']
        });
        onClose();
      } else {
        setError(result.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9500] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-800 text-white">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon />
              Shop Settings
            </h2>
            <p className="text-sm text-slate-300 mt-1">Configure global pricing</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-slate-300">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">
                  Global Pricing (applies to all printers)
                </h3>

                {/* B&W Pricing */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Black & White (₹/page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={pricing.bwPerPage}
                      onChange={(e) => setPricing({ ...pricing, bwPerPage: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold"
                      min="0"
                      step="0.5"
                      placeholder="5.00"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Price per page for black & white printing</p>
                </div>

                {/* Color Pricing */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color (₹/page)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      value={pricing.colorPerPage}
                      onChange={(e) => setPricing({ ...pricing, colorPerPage: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg font-semibold"
                      min="0"
                      step="0.5"
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Price per page for color printing</p>
                </div>

                {/* Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Example Calculation</h4>
                  <div className="text-sm space-y-1 text-blue-800">
                    <p>• 10 pages B&W = ₹{(pricing.bwPerPage * 10).toFixed(2)}</p>
                    <p>• 5 pages Color = ₹{(pricing.colorPerPage * 5).toFixed(2)}</p>
                    <p className="pt-2 border-t border-blue-300 font-semibold">
                      Total = ₹{(pricing.bwPerPage * 10 + pricing.colorPerPage * 5).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

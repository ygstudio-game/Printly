// src/renderer/components/PrinterManagement.tsx
import React from 'react';
import { Loader2, RefreshCw, X, Printer as PrinterIcon, CheckCircle2, Edit2, Save, XCircle } from 'lucide-react';
import type { SystemPrinter } from '../../types/printer';

interface PrinterManagementProps {
  isOpen: boolean;
  onClose: () => void;
  printers: SystemPrinter[];
  selectedPrinters: Set<string>;
  editingPrinter: string | null;
  editedCapabilities: any;
  loadingPrinters: boolean;
  sendingPrinters: boolean;
  onToggleSelection: (printerId: string) => void;
  onStartEdit: (printerId: string, e: React.MouseEvent) => void;
  onSaveEdit: (printerId: string, e: React.MouseEvent) => void;
  onCancelEdit: (e: React.MouseEvent) => void;
  onToggleColor: (printerId: string) => void;
  onToggleDuplex: (printerId: string) => void;
  onTogglePaperSize: (printerId: string, size: string) => void;
  onClearCache: () => void;
  onSendToBackend: () => void;
  availablePaperSizes: string[];
}

export default function PrinterManagement({
  isOpen,
  onClose,
  printers,
  selectedPrinters,
  editingPrinter,
  editedCapabilities,
  loadingPrinters,
  sendingPrinters,
  onToggleSelection,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onToggleColor,
  onToggleDuplex,
  onTogglePaperSize,
  onClearCache,
  onSendToBackend,
  availablePaperSizes
}: PrinterManagementProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-800 text-white">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <PrinterIcon />
              Printer Management
            </h2>
            <p className="text-sm text-slate-300 mt-1">Configure and select printers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClearCache}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2"
              disabled={loadingPrinters}
            >
              <RefreshCw size={16} className={loadingPrinters ? 'animate-spin' : ''} />
              Clear Cache
            </button>
            <button onClick={onClose} className="text-white hover:bg-slate-700 rounded p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Loading or Printer List */}
        {loadingPrinters ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-slate-700">Detecting Printers...</p>
              <p className="text-sm text-slate-500 mt-2">This may take a few seconds</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 overflow-y-auto flex-1">
              {printers.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <PrinterIcon className="mx-auto h-16 w-16 mb-4 text-slate-300" />
                  <p className="text-xl font-medium">No Printers Found</p>
                  <p>Please check your printer connections</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {printers.map((printer) => (
                    <div
                      key={printer.printerId}
                      onClick={() => editingPrinter !== printer.printerId && onToggleSelection(printer.printerId)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPrinters.has(printer.printerId)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      } ${editingPrinter === printer.printerId ? 'ring-2 ring-purple-400' : ''}`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <PrinterIcon className={selectedPrinters.has(printer.printerId) ? 'text-blue-600' : 'text-slate-600'} size={20} />
                          <h3 className="font-bold text-lg">{printer.displayName}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingPrinter === printer.printerId ? (
                            <>
                              <button
                                onClick={(e) => onSaveEdit(printer.printerId, e)}
                                className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                title="Save"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={(e) => onCancelEdit(e)}
                                className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Cancel"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => onStartEdit(printer.printerId, e)}
                              className="p-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                              title="Edit Capabilities"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {selectedPrinters.has(printer.printerId) && !editingPrinter && (
                            <CheckCircle2 className="text-blue-600" size={24} />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-3 text-sm">
                        <p className="truncate text-slate-600">
                          <span className="font-medium">Name:</span> {printer.printerName}
                        </p>

                        {editingPrinter === printer.printerId ? (
                          <div className="space-y-3 bg-purple-50 p-3 rounded-lg border border-purple-200" onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editedCapabilities[printer.printerId]?.supportsColor || false}
                                onChange={() => onToggleColor(printer.printerId)}
                                className="w-4 h-4"
                              />
                              <span className="font-medium">Supports Color Printing</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editedCapabilities[printer.printerId]?.supportsDuplex || false}
                                onChange={() => onToggleDuplex(printer.printerId)}
                                className="w-4 h-4"
                              />
                              <span className="font-medium">Supports Duplex (Two-Sided)</span>
                            </label>

                            <div>
                              <p className="font-medium mb-2">Paper Sizes:</p>
                              <div className="flex flex-wrap gap-2">
                                {availablePaperSizes.map(size => (
                                  <label key={size} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editedCapabilities[printer.printerId]?.paperSizes.includes(size) || false}
                                      onChange={() => onTogglePaperSize(printer.printerId, size)}
                                      className="w-3 h-3"
                                    />
                                    <span className="text-xs">{size}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {printer.capabilities.supportsColor && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">🌈 Color</span>
                              )}
                              {printer.capabilities.supportsDuplex && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">🔄 Duplex</span>
                              )}
                              {printer.capabilities.isDefault && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">⭐ Default</span>
                              )}
                            </div>

                            <p className="text-slate-600">
                              <span className="font-medium">Paper:</span> {printer.capabilities.paperSizes.slice(0, 3).join(', ')}
                              {printer.capabilities.paperSizes.length > 3 && ` +${printer.capabilities.paperSizes.length - 3} more`}
                            </p>
                          </>
                        )}

                        <p className="text-xs text-slate-400 pt-2">
                          {printer.systemInfo.os} • {printer.systemInfo.hostname}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t bg-slate-50 flex justify-between items-center">
              <p className="text-sm text-slate-600">
                {selectedPrinters.size} printer{selectedPrinters.size !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onSendToBackend}
                  disabled={sendingPrinters || selectedPrinters.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingPrinters ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Sending...
                    </>
                  ) : (
                    'Send to Backend'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

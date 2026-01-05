// electron-app/src/renderer/components/PrintPreview.tsx
import React, { useState, useEffect } from 'react';
import { X, Printer, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface PrintPreviewProps {
  pdfPath: string;
  job: any;
  onPrint: (updatedSettings: any) => void;
  onCancel: () => void;
}

export default function PrintPreview({ pdfPath, job, onPrint, onCancel }: PrintPreviewProps) {
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    printerName: job.printerName,
    copies: job.settings.copies || 1,
    colorMode: job.settings.colorMode || 'bw',
    paperSize: job.settings.paperSize || 'A4',
    orientation: job.settings.orientation || 'portrait',
    duplex: job.settings.duplex || false,
    pageRanges: job.settings.pageRanges === 'all' ? '' : job.settings.pageRanges,
    pagesPerSheet: 1,
    scale: 'fit',
    scalePercent: 100,
    margins: 'default' // default, none, narrow, moderate, wide
  });
  const [convertedPdfPath, setConvertedPdfPath] = useState<string>(pdfPath);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(job.settings.totalPages || 1);
  const [zoom, setZoom] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // ✅ State for shop pricing
  const [shopPricing, setShopPricing] = useState({
    bwPerPage: 5,   // Default fallback
    colorPerPage: 10 // Default fallback
  });

  // Load available printers and shop info
  useEffect(() => {
    loadPrinters();
    loadShopInfo(); // ✅ Fetch shop details
    convertToPdfIfNeeded();
  }, []);

  async function loadPrinters() {
    try {
      const printers = await window.electron.getAllPrinters();
      setAvailablePrinters(printers);
      
      // ✅ Set default printer if not already set
      if (!settings.printerName && printers.length > 0) {
        const defaultPrinter = printers.find(p => p.capabilities.isDefault) || printers[0];
        setSettings(prev => ({
          ...prev,
          printerName: defaultPrinter.printerName
        }));
        console.log('✅ Set default printer:', defaultPrinter.printerName);
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  }

  // ✅ Fetch shop info to get accurate pricing
  async function loadShopInfo() {
    try {
      // Prioritize pricing passed directly in the job object if available
      if (job.shopPricing) {
        setShopPricing({
          bwPerPage: job.shopPricing.bwPerPage || 5,
          colorPerPage: job.shopPricing.colorPerPage || 10
        });
        return;
      }

      // Otherwise, try to fetch from backend/local store
      const shopInfo = await window.electron.getShopInfo();
      if (shopInfo && shopInfo.pricing) {
         setShopPricing({
            bwPerPage: shopInfo.pricing.bwPerPage || 5,
            colorPerPage: shopInfo.pricing.colorPerPage || 10
         });
      }
    } catch (error) {
      console.warn('Could not load shop pricing, using defaults:', error);
    }
  }
  
  async function convertToPdfIfNeeded() {
    const fileExt = pdfPath.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'pdf') {
      setConvertedPdfPath(pdfPath);
      setIsConverting(false);
      return;
    }

    try {
      setIsConverting(true);
      console.log('Converting file:', pdfPath, 'Type:', fileExt);
      
      let fileType = 'pdf';
      if (['docx', 'doc'].includes(fileExt || '')) {
        fileType = 'docx';
      } else if (['jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        fileType = 'image';
      }

      console.log('Calling convertToPdf with:', { pdfPath, fileType });
      
      const convertedPath = await window.electron.convertToPdf(pdfPath, fileType);
      
      console.log('✅ Conversion successful:', convertedPath);
      setConvertedPdfPath(convertedPath);
      setIframeKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to convert file:', error);
      // Fallback: Try to display original file
      setConvertedPdfPath(pdfPath);
    } finally {
      setIsConverting(false);
    }
  }

  // ✅ Use Shop Pricing for Calculation
  useEffect(() => {
    const pricePerPage = settings.colorMode === 'color' ? shopPricing.colorPerPage : shopPricing.bwPerPage;
    const effectivePages = Math.ceil(totalPages / settings.pagesPerSheet);
    const cost = effectivePages * settings.copies * pricePerPage;
    setEstimatedCost(Math.round(cost));
  }, [settings, totalPages, shopPricing]); // specific dependencies

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    console.log(settings)
    try {
      await onPrint({
        ...settings,
        pageRanges: settings.pageRanges || 'all',
        convertedPdfPath: convertedPdfPath 
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Margin presets (in mm)
  const marginPresets = {
    none: { top: 0, right: 0, bottom: 0, left: 0 },
    narrow: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
    default: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
    moderate: { top: 25.4, right: 19, bottom: 25.4, left: 19 },
    wide: { top: 25.4, right: 50.8, bottom: 25.4, left: 50.8 }
  };

  // Paper size dimensions (mm)
  const paperSizes = {
    A4: { width: 210, height: 297 },
    Letter: { width: 216, height: 279 },
    Legal: { width: 216, height: 356 },
    A3: { width: 297, height: 420 },
    A5: { width: 148, height: 210 }
  };

  // Get current paper dimensions
  const getCurrentPaperSize = () => {
    const size = paperSizes[settings.paperSize as keyof typeof paperSizes] || paperSizes.A4;
    return settings.orientation === 'landscape' 
      ? { width: size.height, height: size.width }
      : size;
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Generate pages per sheet preview
  const renderPagesPerSheetPreview = () => {
    const layouts = {
      1: ['1'],
      2: ['1', '2'],
      4: ['1', '2', '3', '4'],
      6: ['1', '2', '3', '4', '5', '6'],
      9: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      16: Array.from({ length: 16 }, (_, i) => (i + 1).toString())
    };

    const pages = layouts[settings.pagesPerSheet as keyof typeof layouts] || ['1'];
    const gridCols = settings.pagesPerSheet === 2 ? 2 : 
                     settings.pagesPerSheet === 4 ? 2 :
                     settings.pagesPerSheet === 6 ? 2 :
                     settings.pagesPerSheet === 9 ? 3 : 4;

    return (
      <div 
        className={`grid gap-0.5 bg-gray-300 p-1 rounded`}
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {pages.map((page, i) => (
          <div key={i} className="bg-white aspect-[210/297] flex items-center justify-center text-xs text-gray-400">
            {page}
          </div>
        ))}
      </div>
    );
  };

  // Render paper size with margins visualization
  const renderPaperPreview = () => {
    const paper = getCurrentPaperSize();
    const margins = marginPresets[settings.margins as keyof typeof marginPresets];
    const scale = 0.4; // Scale for preview

    return (
      <div className="relative bg-gray-100 p-4 rounded">
        <div 
          className="relative bg-white shadow-sm mx-auto"
          style={{ 
            width: `${paper.width * scale}px`,
            height: `${paper.height * scale}px`
          }}
        >
          {/* Margin visualization */}
          <div 
            className="absolute border-2 border-dashed border-blue-400"
            style={{
              top: `${margins.top * scale}px`,
              left: `${margins.left * scale}px`,
              right: `${margins.right * scale}px`,
              bottom: `${margins.bottom * scale}px`
            }}
          >
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
              Content Area
            </div>
          </div>
          
          {/* Margin labels */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-500">
            {margins.top}mm
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -left-10 text-xs text-gray-500">
            {margins.left}mm
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-300 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded"
            disabled={isPrinting}
          >
            <X size={20} />
          </button>
          <div className="h-8 w-px bg-gray-300" />
          <h1 className="font-semibold text-lg">{job.fileName}</h1>
              {/* ✅ Show converting status */}
          {isConverting && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <RefreshCw size={16} className="animate-spin" />
              <span>Converting to PDF...</span>
            </div>
          )}
      
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Estimated: <span className="font-bold text-gray-900">₹{estimatedCost.toFixed(2)}</span>
          </div>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {isPrinting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer size={18} />
                Print
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Settings */}
        <div className="w-80 bg-white border-r border-gray-300 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Printer Selection - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Printer</label>
              <select
                value={settings.printerName}
                onChange={(e) => updateSetting('printerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                {availablePrinters.map(printer => (
                  <option key={printer.printerId} value={printer.printerName}>
                    {printer.displayName}
                    {printer.capabilities.isDefault && ' (Default)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Copies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Copies</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSetting('copies', Math.max(1, settings.copies - 1))}
                  className="w-10 h-10 border border-gray-300 rounded hover:bg-gray-50"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={settings.copies}
                  onChange={(e) => updateSetting('copies', parseInt(e.target.value) || 1)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-center"
                />
                <button
                  onClick={() => updateSetting('copies', settings.copies + 1)}
                  className="w-10 h-10 border border-gray-300 rounded hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Layout with Visual Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => updateSetting('orientation', 'portrait')}
                  className={`p-3 border-2 rounded transition-all ${
                    settings.orientation === 'portrait'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="w-full h-16 bg-white border border-gray-300 rounded mb-2" />
                  <div className="text-xs text-center">Portrait</div>
                </button>
                <button
                  onClick={() => updateSetting('orientation', 'landscape')}
                  className={`p-3 border-2 rounded transition-all ${
                    settings.orientation === 'landscape'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="w-full h-12 bg-white border border-gray-300 rounded mb-2" />
                  <div className="text-xs text-center">Landscape</div>
                </button>
              </div>
            </div>

            {/* Pages Per Sheet with Visual Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pages per sheet</label>
              <select
                value={settings.pagesPerSheet}
                onChange={(e) => updateSetting('pagesPerSheet', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded mb-3"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={9}>9</option>
                <option value={16}>16</option>
              </select>
              
              {/* Visual Preview */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="text-xs text-gray-600 mb-2">Preview:</div>
                {renderPagesPerSheetPreview()}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="color"
                    checked={settings.colorMode === 'color'}
                    onChange={() => updateSetting('colorMode', 'color')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Color (₹{shopPricing.colorPerPage}/page)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="color"
                    checked={settings.colorMode === 'bw'}
                    onChange={() => updateSetting('colorMode', 'bw')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Black and white (₹{shopPricing.bwPerPage}/page)</span>
                </label>
              </div>
            </div>

            {/* Two-sided */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Two-sided</label>
              <select
                value={settings.duplex ? 'longEdge' : 'off'}
                onChange={(e) => updateSetting('duplex', e.target.value !== 'off')}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="off">Off</option>
                <option value="longEdge">Long edge</option>
                <option value="shortEdge">Short edge</option>
              </select>
            </div>

            {/* Pages with Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pages</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!settings.pageRanges}
                    onChange={() => updateSetting('pageRanges', '')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">All ({totalPages} pages)</span>
                </label>
                <label className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!!settings.pageRanges}
                      onChange={() => updateSetting('pageRanges', '1')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Custom</span>
                  </div>
                  <input
                    type="text"
                    value={settings.pageRanges}
                    onChange={(e) => updateSetting('pageRanges', e.target.value)}
                    placeholder="e.g. 1-5, 8, 11-13"
                    className="ml-6 px-3 py-2 border border-gray-300 rounded text-sm"
                    disabled={!settings.pageRanges}
                  />
                </label>
              </div>
            </div>

            {/* More Settings */}
            <details className="border-t border-gray-200 pt-4">
              <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                More settings
              </summary>
              <div className="mt-4 space-y-4">
                {/* Paper Size with Visual Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paper size</label>
                  <select
                    value={settings.paperSize}
                    onChange={(e) => updateSetting('paperSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">Letter (8.5 × 11 in)</option>
                    <option value="Legal">Legal (8.5 × 14 in)</option>
                    <option value="A3">A3 (297 × 420 mm)</option>
                    <option value="A5">A5 (148 × 210 mm)</option>
                  </select>
                  
                  {/* Paper Size Preview */}
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="text-xs text-gray-600 mb-2">Paper preview:</div>
                    <div className="flex justify-center">
                      <div 
                        className="bg-white border border-gray-400 shadow-sm"
                        style={{
                          width: `${getCurrentPaperSize().width * 0.3}px`,
                          height: `${getCurrentPaperSize().height * 0.3}px`,
                          maxWidth: '100px',
                          maxHeight: '150px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Margins with Visual Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Margins</label>
                  <select
                    value={settings.margins}
                    onChange={(e) => updateSetting('margins', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
                  >
                    <option value="none">None</option>
                    <option value="narrow">Narrow (12.7 mm)</option>
                    <option value="default">Default (25.4 mm)</option>
                    <option value="moderate">Moderate</option>
                    <option value="wide">Wide (50.8 mm)</option>
                  </select>
                  
                  {/* Margin Preview */}
                  {renderPaperPreview()}
                </div>

                {/* Scale with Real-time Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scale</label>
                  <select
                    value={settings.scale}
                    onChange={(e) => {
                      updateSetting('scale', e.target.value);
                      if (e.target.value !== 'custom') {
                        updateSetting('scalePercent', 100);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="fit">Fit to page</option>
                    <option value="actual">Actual size</option>
                    <option value="shrink">Shrink oversized pages</option>
                    <option value="custom">Custom scale</option>
                  </select>
                  {settings.scale === 'custom' && (
                    <div className="mt-3">
                      <input
                        type="range"
                        min="25"
                        max="400"
                        value={settings.scalePercent}
                        onChange={(e) => updateSetting('scalePercent', parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>25%</span>
                        <span className="font-semibold text-blue-600">{settings.scalePercent}%</span>
                        <span>400%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Center - PDF Preview */}
        <div className="flex-1 flex flex-col bg-gray-200">
          {/* Preview Toolbar */}
          <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-center"
                />
                <span className="mx-2">of {totalPages}</span>
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-gray-700 rounded disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <ZoomIn size={20} />
              </button>
            </div>
          </div>

          {/* PDF Viewer with Real-time Scale Preview */}
          <div className="flex-1 overflow-auto p-8 flex justify-center">
            <div 
              className="bg-white shadow-lg"
              style={{ 
                transform: `scale(${zoom}) scale(${settings.scale === 'custom' ? settings.scalePercent / 100 : 1})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s',
                filter: settings.colorMode === 'bw' ? 'grayscale(100%)' : 'none'
              }}
            >
                {/* ✅ Use converted PDF path */}
                <iframe
                  key={iframeKey}
                  src={`file://${convertedPdfPath}#page=${currentPage}`}
                  className="w-[800px] h-[1100px] border-none"
                  title="PDF Preview"
                />
            </div>
          </div>
        </div>
      </div>

      {/* Printing Overlay */}
      {isPrinting && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-xl text-center">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Printing document...</h3>
            <p className="text-sm text-gray-600">Job #{job.jobNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}

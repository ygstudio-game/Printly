'use client';

import { useState, useCallback, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone, FileRejection } from 'react-dropzone';
import { extractFileInfo } from '@/lib/fileInfo';
import { getShopPrinters } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, Upload, CheckCircle, Copy, Files, 
  ArrowLeft, FileText, Smartphone, ChevronRight, X 
} from 'lucide-react';
import type { Printer } from '@/types/printer';

interface UploadPageProps {
  params: Promise<{ shopId: string }>;
}

interface FileInfo {
  totalPages: number;
  fileType: string;
  dimensions?: { width: number; height: number };
}

export default function UploadPage({ params }: UploadPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printerId = searchParams.get('printerId');
  const { shopId } = use(params);
  
  // State
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingInfo, setExtractingInfo] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [fileKey, setFileKey] = useState<string>('');
  
  // Settings
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [duplex, setDuplex] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Load Printer
  useEffect(() => {
    if (printerId) loadPrinterDetails();
  }, [printerId]);

  // Calculate Cost
  useEffect(() => {
    if (!printer) return;
    const pages = fileInfo?.totalPages || 1; 
    const rate = colorMode === 'color' ? printer.pricing.colorPerPage : printer.pricing.bwPerPage;
    setEstimatedCost(Math.round(rate! * pages * copies));
  }, [printer, fileInfo, colorMode, copies]);

  async function loadPrinterDetails() {
    try {
      const printers = await getShopPrinters(shopId);
      const selectedPrinter = printers.find(p => p._id === printerId);
      if (selectedPrinter) {
        setPrinter(selectedPrinter);
        if (!selectedPrinter.capabilities.supportsColor) setColorMode('bw');
        if (selectedPrinter.capabilities.paperSizes.length > 0) {
          setPaperSize(selectedPrinter.capabilities.paperSizes[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load printer:', error);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      setError('Invalid file. Max 50MB. PDF, DOCX, JPG, PNG only.');
      return;
    }
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setError(null);
    setUploadComplete(false);
    
    try {
      // 1. Analyze
      setExtractingInfo(true);
      const info = await extractFileInfo(file);
      setFileInfo(info);
      setExtractingInfo(false);

      // 2. Upload
      setUploading(true);
      setUploadProgress(10);
      
      const response = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          shopId,
          printerId
        })
      });
      
      if (!response.ok) throw new Error('Failed to init upload');
      const data = await response.json();
      setFileKey(data.fileKey);
      
      setUploadProgress(40);
      
      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      
      // Force complete state
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadComplete(true);
      }, 600); 
      
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploading(false);
      setExtractingInfo(false);
    }
  }, [shopId, printerId]);

  function handleProceed() {
    if (!fileInfo || !fileKey || !uploadedFile) return;

    const queryParams = new URLSearchParams({
      printerId: printerId || '',
      fileKey,
      fileName: uploadedFile.name,
      totalPages: fileInfo.totalPages.toString(),
      fileType: fileInfo.fileType,
      copies: copies.toString(),
      colorMode,
      paperSize,
      duplex: duplex.toString(),
      orientation,
      estimatedCost: estimatedCost.toString()
    });

    router.push(`/shop/${shopId}/settings?${queryParams.toString()}`);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg','.png','.jpeg'] },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading || extractingInfo
  });

  if (!printerId) return null;

  // Show settings if uploading OR complete
  const showSettings = (uploading || uploadComplete) && printer;
  // Show bottom bar as soon as a file is dropped
  const showBottomBar = !!uploadedFile && !!printer;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Mobile Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 text-slate-500 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="ml-2 flex-1">
           <h1 className="font-bold text-slate-900 leading-tight">Upload Document</h1>
           {printer && <p className="text-xs text-slate-500 truncate">{printer.displayName}</p>}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Upload Zone */}
        <div 
          {...getRootProps()} 
          className={`
            relative overflow-hidden rounded-3xl transition-all duration-300 min-h-[220px] flex flex-col items-center justify-center bg-white shadow-sm border-2
            ${isDragActive ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' : 'border-dashed border-slate-200'}
            ${uploadComplete ? 'border-solid border-green-500 bg-green-50/20' : ''}
          `}
        >
          <input {...getInputProps()} />

          {extractingInfo ? (
            <div className="animate-in fade-in zoom-in duration-300 text-center">
              <div className="bg-blue-50 p-4 rounded-full inline-block mb-4">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="font-bold text-slate-900 text-lg">Analyzing...</p>
              <p className="text-sm text-slate-500">Checking page count</p>
            </div>
          ) : uploading ? (
            <div className="w-full max-w-[240px] text-center animate-in fade-in zoom-in duration-300">
              <div className="bg-blue-50 p-4 rounded-full inline-block mb-4">
                 <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
              </div>
              <p className="font-bold text-slate-900 text-lg mb-4">Uploading {uploadProgress}%</p>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden w-full">
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-4 animate-pulse">You can configure settings below while waiting</p>
            </div>
          ) : uploadComplete ? (
             <div className="text-center animate-in fade-in zoom-in duration-300 w-full p-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm ring-4 ring-green-50">
                   <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Upload Complete</h3>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 max-w-full truncate mb-6">
                   <FileText size={14} className="text-blue-500 shrink-0" />
                   <span className="truncate">{uploadedFile?.name}</span>
                </div>
                
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={(e) => { e.stopPropagation(); window.location.reload(); }} 
                   className="text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 rounded-full px-4"
                >
                   <X className="w-4 h-4 mr-1.5" /> Change File
                </Button>
             </div>
          ) : (
             <div className="text-center p-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform shadow-sm">
                   <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Tap to Upload</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6 max-w-[220px] mx-auto leading-relaxed">
                   Upload your PDF, DOCX, or Images to start printing.
                </p>
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 px-6">
                   Browse Files
                </Button>
             </div>
          )}
        </div>

        {/* Settings Panel (Visible during AND after upload) */}
        {showSettings && (
           <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-8">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-lg font-bold text-slate-900">Print Settings</h2>
                 {fileInfo && (
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md animate-in fade-in">
                        {fileInfo.totalPages} Pages Detected
                    </span>
                 )}
              </div>

              {/* Copies Stepper */}
              <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
                 <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Copy size={20} /></div>
                       <Label className="font-bold text-slate-700">Copies</Label>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                       <button onClick={() => setCopies(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
                          <span className="text-xl font-bold text-slate-600">-</span>
                       </button>
                       <span className="w-10 text-center font-bold text-lg text-slate-900">{copies}</span>
                       <button onClick={() => setCopies(c => c + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
                          <span className="text-xl font-bold text-slate-600">+</span>
                       </button>
                    </div>
                 </div>
              </Card>

              {/* Color Mode Cards */}
              {printer.capabilities.supportsColor && (
                 <div className="space-y-2">
                    <Label className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wider">Color Mode</Label>
                    <RadioGroup value={colorMode} onValueChange={(v: any) => setColorMode(v)} className="grid grid-cols-2 gap-3">
                       <Label 
                          htmlFor="bw" 
                          className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                             colorMode === 'bw' 
                             ? 'border-slate-800 bg-slate-50 shadow-md' 
                             : 'border-white bg-white shadow-sm'
                          }`}
                       >
                          <RadioGroupItem value="bw" id="bw" className="sr-only" />
                          <div className="w-10 h-10 rounded-full bg-slate-800 mb-2 shadow-sm" />
                          <span className="font-bold text-slate-900">Black & White</span>
                          <span className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded-full mt-1 border border-slate-100">
                             ₹{printer.pricing.bwPerPage}/pg
                          </span>
                       </Label>

                       <Label 
                          htmlFor="color" 
                          className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                             colorMode === 'color' 
                             ? 'border-blue-500 bg-blue-50 shadow-md' 
                             : 'border-white bg-white shadow-sm'
                          }`}
                       >
                          <RadioGroupItem value="color" id="color" className="sr-only" />
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-orange-400 to-blue-500 mb-2 shadow-sm" />
                          <span className="font-bold text-slate-900">Color</span>
                          <span className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded-full mt-1 border border-slate-100">
                             ₹{printer.pricing.colorPerPage}/pg
                          </span>
                       </Label>
                    </RadioGroup>
                 </div>
              )}

              {/* Layout Options */}
              <div className="space-y-2">
                 <Label className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wider">Layout Options</Label>
                 <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white p-4 space-y-5 rounded-2xl">
                    {/* Paper Size */}
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="bg-orange-50 p-2 rounded-xl text-orange-600"><Files size={20} /></div>
                          <span className="font-bold text-slate-700">Paper Size</span>
                       </div>
                       <Select value={paperSize} onValueChange={setPaperSize}>
                          <SelectTrigger className="w-[110px] bg-slate-50 border-slate-200 rounded-xl font-semibold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white z-50 shadow-xl rounded-xl border-slate-100">
                             {printer.capabilities.paperSizes.map(s => (
                                <SelectItem key={s} value={s} className="font-medium focus:bg-slate-50 cursor-pointer py-3">{s}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Orientation Toggle */}
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600"><Smartphone size={20} className={orientation === 'landscape' ? 'rotate-90' : ''} /></div>
                          <span className="font-bold text-slate-700">Orientation</span>
                       </div>
                       <div className="flex bg-slate-100 p-1 rounded-xl h-10">
                          <button 
                             onClick={() => setOrientation('portrait')}
                             className={`px-3 rounded-lg text-xs font-bold transition-all ${orientation === 'portrait' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                             Portrait
                          </button>
                          <button 
                             onClick={() => setOrientation('landscape')}
                             className={`px-3 rounded-lg text-xs font-bold transition-all ${orientation === 'landscape' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                             Landscape
                          </button>
                       </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Duplex Toggle */}
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl transition-colors ${duplex ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                             <Files size={20} />
                          </div>
                          <div>
                             <span className="font-bold text-slate-700 block">Double-Sided</span>
                             <span className="text-xs text-slate-400 font-medium">Print on both sides</span>
                          </div>
                       </div>
                       <Switch 
                          checked={duplex} 
                          onCheckedChange={setDuplex}
                          disabled={!printer.capabilities.supportsDuplex}
                          className="data-[state=checked]:bg-green-500 scale-110"
                       />
                    </div>
                 </Card>
              </div>
           </div>
        )}
      </div>

      {/* Floating Action Bar - Shown when file is selected */}
      {showBottomBar && (
         <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe z-50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-full duration-500">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
               <div>
                  <p className="text-2xl font-bold text-slate-900">₹{estimatedCost}</p>
                  <p className="text-xs font-medium text-slate-500">Total Estimate</p>
               </div>
               <Button 
                  onClick={handleProceed} 
                  disabled={!uploadComplete}
                  className={`
                    rounded-2xl h-14 px-8 font-bold text-base flex-1 max-w-[200px] transition-all
                    ${uploadComplete 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-300 hover:bg-slate-800 active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                  `}
               >
                  {uploadComplete ? (
                    <>Next <ChevronRight className="ml-1 w-5 h-5" /></>
                  ) : (
                    <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Uploading...</>
                  )}
               </Button>
            </div>
         </div>
      )}
    </div>
  );
}

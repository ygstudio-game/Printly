'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getShopPrinters, createJob } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Loader2, 
  Minus, 
  Plus, 
  FileText, 
  Copy, 
  Files,
  ChevronRight,
  Receipt,
  Check,
  CreditCard
} from 'lucide-react';
import type { Printer } from '@/types/printer';

interface Props {
  params: Promise<{ shopId: string }>;
}

export default function SettingsPage({ params }: Props) {
  const { shopId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useStore();

  const [loading, setLoading] = useState(false);
  const [printer, setPrinter] = useState<Printer | null>(null);

  // Params
  const fileKey = searchParams.get('fileKey');
  const fileName = searchParams.get('fileName');
  const printerId = searchParams.get('printerId');
  const totalPagesParam = searchParams.get('totalPages');
  const fileType = searchParams.get('fileType');
  
  // Pre-fill
  const initialCopies = parseInt(searchParams.get('copies') || '1');
  const initialColor = (searchParams.get('colorMode') as 'bw' | 'color') || 'bw';
  const initialPaper = searchParams.get('paperSize') || 'A4';
  const initialDuplex = searchParams.get('duplex') === 'true';
  const initialOrientation = (searchParams.get('orientation') as 'portrait' | 'landscape') || 'portrait';

  // State
  const [copies, setCopies] = useState(initialCopies);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>(initialColor);
  const [paperSize, setPaperSize] = useState(initialPaper);
  const [duplex, setDuplex] = useState(initialDuplex);
  const [pageRanges, setPageRanges] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  const [totalPages] = useState(parseInt(totalPagesParam || '1'));
  const [cost, setCost] = useState(0);

  useEffect(() => {
    if (!fileKey || !printerId) {
      router.push(`/shop/${shopId}`);
    } else {
      loadPrinterDetails();
    }
  }, [fileKey, printerId]);

  useEffect(() => {
    calculateCost();
  }, [copies, colorMode, paperSize, duplex, pageRanges, printer, totalPages]);

  async function loadPrinterDetails() {
    try {
      const printers = await getShopPrinters(shopId);
      const selectedPrinter = printers.find(p => p._id === printerId);
      
      if (selectedPrinter) {
        setPrinter(selectedPrinter);
        if (!selectedPrinter.capabilities.supportsColor && colorMode === 'color') {
          setColorMode('bw');
        }
      } else {
        throw new Error('Printer not found');
      }
    } catch (error) {
      console.error('❌ Failed to load printer:', error);
      toast.error('Failed to load printer details');
      router.push(`/shop/${shopId}`);
    }
  }

  function parsePageRanges(rangeString: string, maxPages: number): number[] {
    if (!rangeString.trim()) return Array.from({ length: maxPages }, (_, i) => i + 1);
    
    const pages = new Set<number>();
    const parts = rangeString.split(',').map(s => s.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr.trim());
        const end = parseInt(endStr.trim());

        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= Math.min(end, maxPages); i++) {
            pages.add(i);
          }
        }
      } else {
        const pageNum = parseInt(part.trim());
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= maxPages) {
          pages.add(pageNum);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  function calculateCost() {
    if (!printer) return;
    const pricePerPage = colorMode === 'color' 
      ? (printer.pricing?.colorPerPage || 10)
      : (printer.pricing?.bwPerPage || 5);
    const pagesToPrint = parsePageRanges(pageRanges, totalPages).length;
    setCost(Math.round(pagesToPrint * copies * pricePerPage));
  }

  async function handleSubmit() {
    if (!printer) return;
    setLoading(true);
    try {
      const jobData = {
        userId,
        shopId,
        printerId,
        fileKey,
        fileName,
        estimatedCost: cost,
        settings: {
          colorMode,
          paperSize,
          copies,
          duplex,
          pageRanges: pageRanges || 'all',
          orientation,
          totalPages: parsePageRanges(pageRanges, totalPages).length,
        },
      };

      const { jobNumber } = await createJob(jobData);
      toast.success('Job submitted!', { description: `Your job number is ${jobNumber}` });
      router.push(`/jobs/${jobNumber}`);
    } catch (error) {
      toast.error('Failed to submit job');
    } finally {
      setLoading(false);
    }
  }

  if (!printer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  const pagesToPrint = parsePageRanges(pageRanges, totalPages).length;
  const pricePerPage = colorMode === 'color' ? printer.pricing.colorPerPage : printer.pricing.bwPerPage;

  return (
    <div className="min-h-screen bg-slate-50 pb-40"> 
      
      {/* Mobile Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 text-slate-500 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="ml-2 flex-1">
           <h1 className="font-bold text-slate-900 leading-tight">Review Settings</h1>
           <p className="text-xs text-slate-500 truncate">{fileName}</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Document Info */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
           <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                 <FileText size={24} />
              </div>
              <div>
                 <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{fileName}</h3>
                 <p className="text-xs text-slate-500 mt-0.5">
                    {totalPages} Pages • {fileType?.toUpperCase()} • {printer.displayName}
                 </p>
              </div>
           </div>
        </Card>

        {/* Copies */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white overflow-hidden">
           <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Copy size={20} /></div>
                 <Label className="font-bold text-slate-700">Copies</Label>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                 <button onClick={() => setCopies(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
                    <Minus size={16} />
                 </button>
                 <span className="w-10 text-center font-bold text-lg text-slate-900">{copies}</span>
                 <button onClick={() => setCopies(c => Math.min(99, c + 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-100 active:scale-95 transition-transform">
                    <Plus size={16} />
                 </button>
              </div>
           </div>
        </Card>

        {/* Color Mode */}
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

        {/* Advanced Settings */}
        <div className="space-y-2">
           <Label className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wider">Layout Options</Label>
           <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white p-4 space-y-5 rounded-2xl">
              
              {/* Paper & Orientation */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Paper Size</Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                       <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          {printer?.capabilities.paperSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <div>
                    <Label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Orientation</Label>
                    <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
                       <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="h-px bg-slate-100 w-full" />

              {/* Duplex */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${duplex ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                       <Files size={20} />
                    </div>
                    <div>
                       <span className="font-bold text-slate-700 block">Double-Sided</span>
                       <span className="text-xs text-slate-400 font-medium">
                          {printer.capabilities.supportsDuplex ? 'Print on both sides' : 'Not supported'}
                       </span>
                    </div>
                 </div>
                 <Switch 
                    checked={duplex} 
                    onCheckedChange={setDuplex}
                    disabled={!printer.capabilities.supportsDuplex}
                    className="data-[state=checked]:bg-green-500 scale-110"
                 />
              </div>

              <div className="h-px bg-slate-100 w-full" />

              {/* Page Selection */}
              <div>
                 <Label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Page Range</Label>
                 <Input 
                    value={pageRanges} 
                    onChange={(e) => setPageRanges(e.target.value)} 
                    placeholder={`e.g. 1-5, 8 (Default: All ${totalPages} pages)`}
                    className="bg-slate-50 border-slate-200"
                 />
                 <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                       Leave blank for all pages
                    </p>
                    {pageRanges && (
                       <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Selected: {pagesToPrint} pages
                       </span>
                    )}
                 </div>
              </div>
           </Card>
        </div>

        {/* Complete Order Summary */}
        <div className="space-y-2 pt-4">
            <Label className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wider">Order Summary</Label>
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-white p-5 rounded-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -z-0 opacity-50" />
                
                <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-3">
                        <span className="text-slate-600">Pages x Copies</span>
                        <span className="font-semibold text-slate-900">{pagesToPrint} x {copies}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 pb-3">
                        <span className="text-slate-600">Cost per page ({colorMode === 'color' ? 'Color' : 'B&W'})</span>
                        <span className="font-semibold text-slate-900">₹{pricePerPage}</span>
                    </div>
                    
                    {/* Settings Snapshot */}
                    <div className="flex flex-wrap gap-2 pt-1 pb-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-xs text-slate-600">
                           {paperSize}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-xs text-slate-600 capitalize">
                           {orientation}
                        </span>
                        {duplex && (
                           <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 border border-green-100 text-xs text-green-700 gap-1">
                              <Check size={10} /> Double-sided
                           </span>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-slate-900 text-lg">Total Payable</span>
                        <span className="font-bold text-2xl text-blue-600">₹{cost}</span>
                    </div>
                </div>
            </Card>
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe z-50 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
         <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
               <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Total</span>
               <span className="text-2xl font-black text-slate-900 leading-none">₹{cost}</span>
            </div>
            <Button 
               onClick={handleSubmit} 
               disabled={loading || pagesToPrint === 0}
               className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 px-8 shadow-lg shadow-slate-300 active:scale-95 transition-all font-bold text-base flex-1 max-w-[240px]"
            >
               {loading ? (
                  <Loader2 className="animate-spin" />
               ) : (
                  <div className="flex items-center gap-2">
                     <CreditCard size={18} />
                     <span>Pay & Print</span>
                     <ChevronRight size={18} className="opacity-80" />
                  </div>
               )}
            </Button>
         </div>
      </div>
    </div>
  );
}

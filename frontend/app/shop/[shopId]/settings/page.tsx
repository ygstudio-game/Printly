// app/shop/[shopId]/settings/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { getShopPrinters, createJob } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Palette, 
  Copy, 
  Files,
  RotateCw,
  Printer as PrinterIcon,
  IndianRupee
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

  const fileKey = searchParams.get('fileKey');
  const fileName = searchParams.get('fileName');
  const printerId = searchParams.get('printerId');
  const totalPagesParam = searchParams.get('totalPages');
  const fileType = searchParams.get('fileType');

  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [duplex, setDuplex] = useState(false);
  const [pageRanges, setPageRanges] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
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
        
        if (!selectedPrinter.capabilities.supportsColor) {
          setColorMode('bw');
        }
        
        if (selectedPrinter.capabilities.paperSizes.length > 0) {
          setPaperSize(selectedPrinter.capabilities.paperSizes[0]);
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
    const totalCost = pagesToPrint * copies * pricePerPage;
    setCost(totalCost);
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

      toast.success('Job submitted!', {
        description: `Your job number is ${jobNumber}`,
      });
      
      router.push(`/jobs/${jobNumber}`);
    } catch (error) {
      toast.error('Failed to submit job');
    } finally {
      setLoading(false);
    }
  }

  if (!printer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading printer settings...</p>
        </div>
      </div>
    );
  }

  const pagesToPrint = parsePageRanges(pageRanges, totalPages).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Configure Print Settings</h1>
              <p className="text-sm text-slate-600">{fileName}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Info Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Document Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-600 text-xs mb-1">Total Pages</p>
                    <p className="font-bold text-slate-900 text-lg">{totalPages}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-600 text-xs mb-1">File Type</p>
                    <p className="font-bold text-slate-900 text-lg">{fileType?.toUpperCase()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-600 text-xs mb-1">Printer</p>
                    <p className="font-semibold text-slate-900 text-sm truncate">{printer.displayName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Number of Copies */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Copy className="w-5 h-5 text-blue-600" />
                  Number of Copies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label className="text-base text-slate-700">Copies to print</Label>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setCopies(c => Math.max(1, c - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-20">
                      <Input 
                        type="number" 
                        value={copies} 
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-center text-lg font-semibold"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setCopies(c => Math.min(99, c + 1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Mode */}
            {printer.capabilities.supportsColor && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-600" />
                    Color Mode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={colorMode}
                    onValueChange={(value: 'bw' | 'color') => setColorMode(value)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="relative">
                      <RadioGroupItem value="bw" id="bw" className="peer sr-only" />
                      <Label 
                        htmlFor="bw"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-600" />
                        </div>
                        <span className="font-semibold text-slate-900">Black & White</span>
                        <span className="text-sm text-slate-600 mt-1">₹{printer.pricing.bwPerPage}/page</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="color" id="color" className="peer sr-only" />
                      <Label 
                        htmlFor="color"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400 flex items-center justify-center mb-2" />
                        <span className="font-semibold text-slate-900">Color</span>
                        <span className="text-sm text-slate-600 mt-1">₹{printer.pricing.colorPerPage}/page</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Page Layout */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Files className="w-5 h-5 text-blue-600" />
                  Page Layout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paper Size */}
                <div>
                  <Label htmlFor="paper-size" className="text-base text-slate-700 mb-2 block">Paper Size</Label>
                  <Select value={paperSize} onValueChange={setPaperSize}>
                    <SelectTrigger id="paper-size" className="h-11">
                      <SelectValue placeholder="Select paper size" />
                    </SelectTrigger>
                    <SelectContent>
                      {printer.capabilities.paperSizes.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Orientation */}
                <div>
                  <Label className="text-base text-slate-700 mb-3 block">Orientation</Label>
                  <RadioGroup 
                    value={orientation}
                    onValueChange={(value: 'portrait' | 'landscape') => setOrientation(value)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="relative">
                      <RadioGroupItem value="portrait" id="portrait" className="peer sr-only" />
                      <Label 
                        htmlFor="portrait"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="w-12 h-16 border-2 border-slate-400 rounded mb-2" />
                        <span className="font-medium text-slate-900">Portrait</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="landscape" id="landscape" className="peer sr-only" />
                      <Label 
                        htmlFor="landscape"
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div className="w-16 h-12 border-2 border-slate-400 rounded mb-2 flex items-center justify-center">
                          <RotateCw className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-medium text-slate-900">Landscape</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Duplex */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="duplex" className="text-base text-slate-900 font-medium">
                      Double-sided printing
                    </Label>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {printer.capabilities.supportsDuplex ? 'Save paper by printing on both sides' : 'Not supported by this printer'}
                    </p>
                  </div>
                  <Switch 
                    id="duplex"
                    checked={duplex}
                    onCheckedChange={setDuplex}
                    disabled={!printer.capabilities.supportsDuplex}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Page Range */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Files className="w-5 h-5 text-blue-600" />
                  Page Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="page-ranges" className="text-base text-slate-700 mb-2 block">
                    Custom Page Range (Optional)
                  </Label>
                  <Input 
                    id="page-ranges" 
                    placeholder={`e.g., 1-5, 8, 10-${totalPages}`}
                    value={pageRanges}
                    className="h-11"
                    onChange={(e) => setPageRanges(e.target.value)}
                  />
                  <p className="text-sm text-slate-500 mt-2 flex items-start gap-2">
                    <span>💡</span>
                    <span>Leave blank to print all {totalPages} pages. Use commas and hyphens (e.g., 1-3,5,7-9)</span>
                  </p>
                </div>

                {/* Pages indicator */}
                {pageRanges && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>{pagesToPrint}</strong> page{pagesToPrint !== 1 ? 's' : ''} will be printed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-1">
            <Card className="border-slate-200 shadow-lg sticky top-24">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <PrinterIcon className="w-5 h-5 text-blue-600" />
                  Print Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Summary Items */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pages to print:</span>
                    <span className="font-semibold text-slate-900">{pagesToPrint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Copies:</span>
                    <span className="font-semibold text-slate-900">{copies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Color mode:</span>
                    <span className="font-semibold text-slate-900">{colorMode === 'color' ? 'Color' : 'B&W'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Orientation:</span>
                    <span className="font-semibold text-slate-900 capitalize">{orientation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paper size:</span>
                    <span className="font-semibold text-slate-900">{paperSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duplex:</span>
                    <span className="font-semibold text-slate-900">{duplex ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Price per page:</span>
                    <span className="font-medium text-slate-900">
                      ₹{colorMode === 'color' ? printer.pricing.colorPerPage : printer.pricing.bwPerPage}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600">Total sheets:</span>
                    <span className="font-medium text-slate-900">{pagesToPrint * copies}</span>
                  </div>
                  
                  {/* Total Cost */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm mb-1">Total Cost</p>
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-6 h-6" />
                          <span className="text-3xl font-bold">{cost.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <PrinterIcon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading || pagesToPrint === 0}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <PrinterIcon className="mr-2 h-5 w-5" />
                      Submit Print Job
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-slate-500">
                  Your document will be ready for pickup shortly after submission
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

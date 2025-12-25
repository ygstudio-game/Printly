// app/shop/[shopId]/upload/page.tsx
'use client';

import { useState, useCallback, use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone, FileRejection, Accept } from 'react-dropzone';
import { extractFileInfo } from '@/lib/fileInfo';
import { getShopPrinters } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Upload, 
  CheckCircle,
  Palette,
  Copy,
  Files,
  RotateCw,
  Minus,
  Plus,
  ArrowLeft
} from 'lucide-react';
import type { Printer } from '@/types/printer';

interface UploadPageProps {
  params: Promise<{ shopId: string }>;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  fileName: string;
}

interface FileInfo {
  totalPages: number;
  fileType: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export default function UploadPage({ params }: UploadPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printerId = searchParams.get('printerId');
  const { shopId } = use(params);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingInfo, setExtractingInfo] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [fileKey, setFileKey] = useState<string>('');
  
  // Printer info
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [loadingPrinter, setLoadingPrinter] = useState(true);
  
  // Print settings (user can configure while uploading)
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [paperSize, setPaperSize] = useState('A4');
  const [duplex, setDuplex] = useState(false);
  const [pageRanges, setPageRanges] = useState('');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Load printer details on mount
  useEffect(() => {
    if (printerId) {
      loadPrinterDetails();
    }
  }, [printerId]);

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
      }
    } catch (error) {
      console.error('Failed to load printer:', error);
    } finally {
      setLoadingPrinter(false);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (rejection.errors[0].code === 'file-invalid-type') {
        setError('Invalid file type. Please upload PDF, DOCX, JPG, or PNG.');
      } else {
        setError(rejection.errors[0].message);
      }
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFile(file);
    setError(null);
    setUploadComplete(false);
    
    try {
      // ✅ Step 1: Extract file info (in parallel with upload preparation)
      setExtractingInfo(true);
      const info = await extractFileInfo(file);
      setFileInfo(info);
      setExtractingInfo(false);
      console.log('📄 File Info:', info);

      // ✅ Step 2: Start upload
      setUploading(true);
      setUploadProgress(10);
      
      const response = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          shopId: shopId,
          printerId: printerId
        })
      });
      
      if (!response.ok) throw new Error('Failed to get upload URL');
      
      const data: UploadUrlResponse = await response.json();
      setFileKey(data.fileKey);
      setUploadProgress(30);
      
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      
      if (!uploadResponse.ok) throw new Error('Failed to upload file');
      
      setUploadProgress(100);
      setUploadComplete(true);
      
      console.log('✅ Upload complete! User can now submit settings.');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
      setExtractingInfo(false);
    }
  }, [shopId, printerId]);

  function handleProceedToCheckout() {
    if (!fileInfo || !fileKey || !uploadedFile) return;

    const queryParams = new URLSearchParams({
      printerId: printerId || '',
      fileKey: fileKey,
      fileName: uploadedFile.name,
      totalPages: fileInfo.totalPages.toString(),
      fileType: fileInfo.fileType,
      // ✅ Pass pre-configured settings
      copies: copies.toString(),
      colorMode,
      paperSize,
      duplex: duplex.toString(),
      pageRanges,
      orientation
    });

    if (fileInfo.dimensions) {
      queryParams.append('width', fileInfo.dimensions.width.toString());
      queryParams.append('height', fileInfo.dimensions.height.toString());
    }

    router.push(`/shop/${shopId}/settings?${queryParams.toString()}`);
  }

  const acceptedFileTypes: Accept = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png']
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    disabled: uploading || extractingInfo || uploadComplete
  });

  if (!printerId) {
    router.push(`/shop/${shopId}`);
    return null;
  }

  const showSettings = (uploading || uploadComplete) && fileInfo && printer;
  const canProceed = uploadComplete && fileInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Upload Area */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Document</h1>
            <p className="text-slate-600 mb-6">
              Upload your file and configure print settings
            </p>

            <Card className="border-slate-200 shadow-lg">
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'}
                    ${uploading || extractingInfo || uploadComplete ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input {...getInputProps()} />
                  
                  {extractingInfo ? (
                    <div>
                      <Loader2 className="animate-spin h-16 w-16 mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium text-slate-900">Analyzing document...</p>
                      <p className="text-sm text-slate-600 mt-1">Extracting page count and details</p>
                    </div>
                  ) : uploading ? (
                    <div>
                      <Loader2 className="animate-spin h-16 w-16 mx-auto mb-4 text-blue-600" />
                      <p className="text-lg font-medium text-slate-900 mb-3">Uploading...</p>
                      <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-600">{uploadProgress}%</p>
                      {fileInfo && (
                        <p className="text-sm text-blue-600 mt-3">
                          💡 Configure print settings on the right while we upload
                        </p>
                      )}
                    </div>
                  ) : uploadComplete ? (
                    <div>
                      <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                      </div>
                      <p className="text-lg font-semibold text-slate-900">Upload Complete!</p>
                      <p className="text-sm text-slate-600 mt-2">{uploadedFile?.name}</p>
                      {fileInfo && (
                        <div className="mt-4 inline-block bg-slate-100 rounded-lg px-4 py-2">
                          <p className="text-sm text-slate-700">
                            📄 {fileInfo.totalPages} pages • {fileInfo.fileType.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                      {isDragActive ? (
                        <p className="text-lg font-medium text-blue-600">Drop file here...</p>
                      ) : (
                        <>
                          <p className="text-lg font-medium text-slate-900 mb-2">
                            Drop file here or click to browse
                          </p>
                          <p className="text-sm text-slate-600 mb-1">PDF, DOCX, JPG, PNG</p>
                          <p className="text-sm text-slate-500">Maximum size: 50MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {!uploadComplete && !uploading && !extractingInfo && (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="w-full"
                    >
                      📂 Browse Files
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => alert('Camera feature coming soon!')}
                      className="w-full"
                    >
                      📷 Take Photo
                    </Button>
                  </div>
                )}

                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onDrop([e.target.files[0]], []);
                    }
                  }}
                  className="hidden"
                />
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="mt-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  💡 Quick Tips
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Configure settings while your file uploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>PDF format provides best print quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Files are automatically deleted after printing</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Right: Settings Panel (shown during/after upload) */}
          <div>
            {showSettings ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Print Settings</h2>
                  <p className="text-slate-600">
                    {uploadComplete ? 'Review and adjust your settings' : 'Configure while we upload'}
                  </p>
                </div>

                {/* Copies */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Copy className="w-5 h-5 text-blue-600" />
                      Copies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Number of copies</Label>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setCopies(c => Math.max(1, c - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input 
                          type="number" 
                          value={copies} 
                          onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 text-center font-semibold"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setCopies(c => c + 1)}
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
                          <RadioGroupItem value="bw" id="bw-upload" className="peer sr-only" />
                          <Label 
                            htmlFor="bw-upload"
                            className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-600 mb-2" />
                            <span className="font-medium">B&W</span>
                            <span className="text-xs text-slate-600">₹{printer.pricing.bwPerPage}/page</span>
                          </Label>
                        </div>
                        <div className="relative">
                          <RadioGroupItem value="color" id="color-upload" className="peer sr-only" />
                          <Label 
                            htmlFor="color-upload"
                            className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400 mb-2" />
                            <span className="font-medium">Color</span>
                            <span className="text-xs text-slate-600">₹{printer.pricing.colorPerPage}/page</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                )}

                {/* Orientation */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RotateCw className="w-5 h-5 text-blue-600" />
                      Orientation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={orientation}
                      onValueChange={(value: 'portrait' | 'landscape') => setOrientation(value)}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="relative">
                        <RadioGroupItem value="portrait" id="portrait-upload" className="peer sr-only" />
                        <Label 
                          htmlFor="portrait-upload"
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                        >
                          <div className="w-10 h-14 border-2 border-slate-400 rounded mb-2" />
                          <span className="font-medium">Portrait</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="landscape" id="landscape-upload" className="peer sr-only" />
                        <Label 
                          htmlFor="landscape-upload"
                          className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
                        >
                          <div className="w-14 h-10 border-2 border-slate-400 rounded mb-2" />
                          <span className="font-medium">Landscape</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Paper & Duplex */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Files className="w-5 h-5 text-blue-600" />
                      Paper Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm mb-2 block">Paper Size</Label>
                      <Select value={paperSize} onValueChange={setPaperSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {printer.capabilities.paperSizes.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <Label htmlFor="duplex-upload" className="text-sm">
                        Double-sided
                      </Label>
                      <Switch 
                        id="duplex-upload"
                        checked={duplex}
                        onCheckedChange={setDuplex}
                        disabled={!printer.capabilities.supportsDuplex}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Proceed Button */}
                {canProceed && (
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleProceedToCheckout}
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Review & Submit
                  </Button>
                )}
              </div>
            ) : (
              <Card className="border-slate-200 shadow-sm h-full flex items-center justify-center p-12">
                <div className="text-center">
                  {loadingPrinter ? (
                    <>
                      <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <p className="text-slate-600">Loading printer settings...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">Upload a file to configure print settings</p>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

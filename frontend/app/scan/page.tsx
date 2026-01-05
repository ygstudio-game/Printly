'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, Store, MapPin, Loader2, QrCode, Search, ChevronLeft } from 'lucide-react';
import { apiCall } from '@/lib/api';

interface Shop {
  _id: string;
  shopId: string;
  shopName: string;
  location: {
    address: string;
    city: string;
  };
  status: string;
}

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerDivRef = useRef<HTMLDivElement>(null); // Ref for the div element
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const isMounted = useRef(false);

  // Load initial data
  useEffect(() => {
    isMounted.current = true;
    const saved = localStorage.getItem('lastShopSearch');
    if (saved) setManualCode(saved);

    loadShops();
    
    // Delay startScanning slightly to ensure DOM is ready
    const timer = setTimeout(() => {
      startScanning();
    }, 100);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      stopScanning(); // Cleanup on unmount
    };
  }, []);

  useEffect(() => {
    if (manualCode) localStorage.setItem('lastShopSearch', manualCode);
  }, [manualCode]);

  async function loadShops() {
    try {
      const data = await apiCall<Shop[]>('/shops');
      if (isMounted.current) {
        setShops(data.filter(s => s.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to load shops:', error);
    } finally {
      if (isMounted.current) setLoadingShops(false);
    }
  }

  // ✅ ROBUST SCANNER INITIALIZATION
  async function startScanning() {
    // 1. Check if element exists
    if (!readerDivRef.current) return;
    
    // 2. Prevent duplicate instances if ref exists
    if (scannerRef.current) {
      // If already scanning, do nothing. If stopped, maybe clear and restart?
      // For safety, let's just return to avoid "double camera"
      return; 
    }

    try {
      const html5QrCode = new Html5Qrcode("reader"); // Use string ID matching the div
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        undefined
      );
      
      if (isMounted.current) setScanning(true);
      console.log('✅ Scanner started');
    } catch (err) {
      console.warn('Scanner start error (might be permission or duplicate):', err);
      // Clean up ref if start failed so we can try again potentially
      scannerRef.current = null;
      if (isMounted.current) setScanning(false);
    }
  }

  // ✅ ROBUST CLEANUP
  async function stopScanning() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
        console.log('✅ Scanner stopped');
      }
      // Also clear the scanner so new instance can be created later
      scanner.clear(); 
    } catch (e) {
      console.warn("Stop error:", e);
    } finally {
      scannerRef.current = null;
      if (isMounted.current) setScanning(false);
    }
  }

  function handleScan(qrData: string) {
    console.log('📷 Scanned:', qrData);
    stopScanning();
    
    // Extract shopId from URL (handles full URLs or just ID)
    // Matches: /shop/xyz or just xyz (if user generated simple QR)
    let shopId = qrData;
    const match = qrData.match(/\/shop\/([^\/\?]+)/);
    if (match) {
      shopId = match[1];
    }

    if (shopId) {
      router.push(`/shop/${shopId}`);
    } else {
      alert('Invalid QR code format. Please scan a valid shop QR.');
      // Restart scanning after alert closes
      setTimeout(startScanning, 500);
    }
  }

  function handleManualSubmit() {
    const code = manualCode.trim();
    if (code) router.push(`/shop/${code}`);
  }

  const filteredShops = shops.filter(shop =>
    shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center gap-3">
             <Button 
               variant="ghost" 
               size="icon" 
               onClick={() => router.back()} 
               className="-ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
             >
               <ChevronLeft className="w-6 h-6" />
             </Button>
             <div>
                <h1 className="text-lg font-bold text-slate-900">Scan QR Code</h1>
             </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Scanner Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-6 pb-0 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                 <QrCode size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Find a Shop</h2>
              <p className="text-sm text-slate-500 mb-6">
                Point your camera at the shop's QR code to start printing instantly.
              </p>
           </div>

           {/* Camera Viewport */}
           <div className="relative px-4 pb-4">
              <div 
                id="reader" 
                ref={readerDivRef}
                className="rounded-2xl overflow-hidden bg-slate-900 aspect-square w-full shadow-inner relative z-10"
              />
              
              {/* Overlay for better UX when scanning */}
              {scanning && (
                <div className="absolute top-4 left-4 right-4 bottom-4 pointer-events-none z-20 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-white/50 rounded-2xl relative">
                     <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -mt-1 -ml-1"></div>
                     <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -mt-1 -mr-1"></div>
                     <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -mb-1 -ml-1"></div>
                     <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl -mb-1 -mr-1"></div>
                  </div>
                </div>
              )}
           </div>

           {/* Manual Entry */}
           <div className="px-6 py-6 bg-slate-50 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                 Or enter code manually
              </label>
              <div className="flex gap-2">
                 <Input
                   placeholder="e.g. print-shop-01"
                   value={manualCode}
                   onChange={(e) => setManualCode(e.target.value)}
                   onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                   className="bg-white border-slate-200 focus:border-blue-500"
                 />
                 <Button onClick={handleManualSubmit} disabled={!manualCode.trim()} className="bg-slate-900 text-white hover:bg-slate-800">
                   Go
                 </Button>
              </div>
           </div>
        </div>

        {/* Nearby Shops List */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                 <Store size={18} className="text-blue-600" />
                 Nearby Shops
              </h3>
              {loadingShops && <Loader2 size={16} className="animate-spin text-slate-400" />}
           </div>

           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                 type="text" 
                 placeholder="Search by name or city..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
           </div>

           {loadingShops ? (
              <div className="text-center py-10">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                 </div>
                 <p className="text-sm text-slate-500">Locating print shops...</p>
              </div>
           ) : filteredShops.length > 0 ? (
              <div className="grid gap-3">
                 {filteredShops.map((shop) => (
                    <div
                       key={shop._id}
                       onClick={() => router.push(`/shop/${shop.shopId}`)}
                       className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between"
                    >
                       <div>
                          <h4 className="font-bold text-slate-900">{shop.shopName}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                             <MapPin size={12} className="text-slate-400" />
                             {shop.location.city}
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <ChevronLeft size={16} className="rotate-180" />
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                 <Store size={32} className="mx-auto mb-2 text-slate-300" />
                 <p className="text-sm text-slate-500">No shops found matching "{searchQuery}"</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

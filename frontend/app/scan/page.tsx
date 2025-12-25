'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, Store, MapPin, Loader2 } from 'lucide-react';
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
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Load saved input and shops on mount
  useEffect(() => {
    // Restore saved input
    const saved = localStorage.getItem('lastShopSearch');
    if (saved) {
      setManualCode(saved);
    }

    // Load shops
    loadShops();

    // Start scanner
    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  // ✅ Save input to localStorage
  useEffect(() => {
    if (manualCode) {
      localStorage.setItem('lastShopSearch', manualCode);
    }
  }, [manualCode]);

  // ✅ Load available shops
  async function loadShops() {
    try {
      const data = await apiCall<Shop[]>('/shops');
      setShops(data.filter(s => s.status === 'active'));
    } catch (error) {
      console.error('Failed to load shops:', error);
    } finally {
      setLoadingShops(false);
    }
  }

  // ✅ Fixed scanner with proper cleanup
  async function startScanning() {
    // Prevent duplicate scanners
    if (scannerRef.current || scanning) {
      console.log('Scanner already running');
      return;
    }

    try {
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
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

      setScanning(true);
      console.log('✅ Scanner started');
    } catch (err: any) {
      console.error('Scanner error:', err);
      // Fallback to manual entry if camera fails
      setScanning(false);
    }
  }

  // ✅ Proper cleanup
  async function stopScanning() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
  if (scanner.isScanning) {
        await scanner.stop();
        console.log('✅ Scanner stopped');
      }
    } catch (e) {
      console.warn("Stop error:", e);
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  }

  function handleScan(qrData: string) {
    console.log('📷 Scanned:', qrData);
    stopScanning();
    
    // Extract shopId from URL
    const match = qrData.match(/\/shop\/([^\/\?]+)/);
    if (match) {
      const shopId = match[1];
      router.push(`/shop/${shopId}`);
    } else {
      alert('Invalid QR code. Please scan a shop QR code.');
      startScanning();
    }
  }

  function handleManualSubmit() {
    const code = manualCode.trim();
    if (code) {
      router.push(`/shop/${code}`);
    }
  }

  function navigateToShop(shopId: string) {
    router.push(`/shop/${shopId}`);
  }

  // ✅ Filter shops by search
  const filteredShops = shops.filter(shop =>
    shop.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Scanner Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <Camera className="h-12 w-12 mx-auto mb-2 text-blue-600" />
              <h1 className="text-2xl font-bold">Scan Shop QR Code</h1>
              <p className="text-slate-600 mt-2">
                Position the QR code within the frame
              </p>
            </div>

            {/* Scanner */}
            <div 
              id="reader" 
              className="rounded-lg overflow-hidden border-2 border-blue-200 mb-4"
            />

            {scanning && (
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-800">
                  💡 Hold your phone steady and ensure good lighting
                </p>
              </div>
            )}

            {/* Manual Entry */}
            <div className="mt-6">
              <div className="text-center text-sm text-slate-600 mb-3">
                Or enter shop code manually
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., ram-xerox-pune"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                />
                <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                  Go
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Shops */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Available Shops
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <Input
              placeholder="Search shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />

            {/* Shop List */}
            {loadingShops ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shops found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredShops.map((shop) => (
                  <div
                    key={shop._id}
                    onClick={() => navigateToShop(shop.shopId)}
                    className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <h3 className="font-semibold text-lg">{shop.shopName}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{shop.location.address}, {shop.location.city}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// app/shop/[shopId]/page.tsx

'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getShop, getShopPrinters, createGuestUser } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Printer as PrinterIcon, MapPin, Clock, Star, User } from 'lucide-react';
import type { Shop, Printer } from '@/types/printer';

interface Props {
  params: Promise<{ shopId: string }>;  
}

export default function ShopPage({ params }: Props) {
  const router = useRouter();
  const { token, userName, setAuth, setShop, setPrinter } = useStore();
  const { shopId } = use(params);

  const [shop, setShopData] = useState<Shop | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false); // ✅ Add state for name input
  const [guestName, setGuestName] = useState(''); // ✅ Add state for guest name

  useEffect(() => {
    initUser();
    loadShopData();
  }, [shopId]);

  async function initUser() {
    if (!token) {
      // ✅ Show name input for new guests
      setShowNameInput(true);
    }
  }

  async function handleCreateGuest() {
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      const deviceId = getDeviceId();
      const data = await createGuestUser(deviceId, guestName.trim());
      
      setAuth({
        token: data.token,
        userId: data.userId,
        name: data.name,
        isGuest: data.isGuest
      });

      setShowNameInput(false);
      toast.success(`Welcome, ${data.name}!`);
    } catch (error) {
      console.error('Failed to create guest user:', error);
      toast.error('Failed to continue. Please try again.');
    }
  }

  function getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  async function loadShopData() {
    try {
      setLoading(true);
      const [shopData, printersData] = await Promise.all([
        getShop(shopId),
        getShopPrinters(shopId),
      ]);

      setShopData(shopData);
      setPrinters(printersData);
      setShop(shopId);

      const onlinePrinter = printersData.find(p => p.status === 'online');
      if (onlinePrinter) {
        setSelectedPrinter(onlinePrinter._id);
      }
    } catch (error) {
      toast.error('Failed to load shop data', {
        description: 'Please try again later',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    if (!selectedPrinter) {
      toast.warning('Select a printer', {
        description: 'Please select a printer to continue',
      });
      return;
    }

    setPrinter(selectedPrinter);
    router.push(`/shop/${shopId}/upload?printerId=${selectedPrinter}`);
  }

  // ✅ Show name input modal for guests
  if (showNameInput) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Welcome to Printly
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="guestName">What should we call you?</Label>
              <Input
                id="guestName"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateGuest()}
                className="mt-2"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleCreateGuest}
              className="w-full"
              disabled={!guestName.trim()}
            >
              Continue
            </Button>
            <p className="text-xs text-gray-500 text-center">
              We'll use this to personalize your experience
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg mb-4">Shop not found</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  // ... rest of component stays the same
  return (
  <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Shop Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{shop.shopName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{shop.location.address}, {shop.location.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Open: {shop.timings.open} - {shop.timings.close}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{shop.rating}/5 ({shop.totalReviews} reviews)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Printers */}
        <h2 className="text-xl font-semibold mb-4">Select Printer</h2>

        {printers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-slate-600">No printers available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 mb-6">
            {printers.map((printer) => (
              <Card
                key={printer._id}
                className={`cursor-pointer transition-all ${
                  selectedPrinter === printer._id
                    ? 'ring-2 ring-blue-600 border-blue-600'
                    : 'hover:shadow-md'
                } ${printer.status !== 'online' ? 'opacity-50' : ''}`}
                onClick={() => printer.status === 'online' && setSelectedPrinter(printer._id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <PrinterIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{printer.displayName}</h3>
                        <p className="text-sm text-slate-600 mb-3">{printer.printerName}</p>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <span className="text-slate-600">Status:</span>
                            <span className={`ml-2 font-medium ${
                              printer.status === 'online' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {printer.status === 'online' && '🟢 Online'}
                              {printer.status === 'offline' && '🔴 Offline'}
                              {printer.status === 'busy' && '🟡 Busy'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Color:</span>
                            <span className="ml-2">
                              {printer.capabilities.supportsColor ? '✅ Yes' : '❌ No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Duplex:</span>
                            <span className="ml-2">
                              {printer.capabilities.supportsDuplex ? '✅ Yes' : '❌ No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Paper:</span>
                            <span className="ml-2">{printer.capabilities.paperSizes.join(', ')}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm font-medium">
                            B&W: ₹{printer.pricing.bwPerPage}/page
                            {printer.capabilities.supportsColor && printer.pricing.colorPerPage && (
                              <span className="ml-4">
                                Color: ₹{printer.pricing.colorPerPage}/page
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedPrinter === printer._id && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full"
          disabled={!selectedPrinter}
          onClick={handleContinue}
        >
          Continue to Upload
        </Button>
      </div>
    </div>
  );
}

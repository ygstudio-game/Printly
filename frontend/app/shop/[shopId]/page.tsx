'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getShop, getShopPrinters, createGuestUser } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, Printer as PrinterIcon, MapPin, 
  Clock, Star, User, Loader2, CheckCircle2, 
  AlertCircle, Check
} from 'lucide-react';
import type { Shop, Printer } from '@/types/printer';

interface Props {
  params: Promise<{ shopId: string }>;
}

export default function ShopPage({ params }: Props) {
  const router = useRouter();
  const { token, setAuth, setShop, setPrinter } = useStore();
  const { shopId } = use(params);

  const [shop, setShopData] = useState<Shop | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    // Only init user check on client side to avoid hydration mismatch
    const checkAuth = () => {
       if (!token) {
          setShowNameInput(true);
       }
    };
    checkAuth();
    loadShopData();
  }, [shopId, token]);

  async function handleCreateGuest() {
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setCreatingUser(true);
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
    } finally {
      setCreatingUser(false);
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

      // Auto-select first online printer
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

  // Name Input Modal (Overlay)
  if (showNameInput) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
          <div className="bg-blue-600 h-2 w-full"></div>
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
               <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                  <User size={32} />
               </div>
               <h2 className="text-2xl font-bold text-slate-900">Welcome to Printly</h2>
               <p className="text-slate-500">We just need your name to identify your print jobs.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guestName" className="text-slate-700 font-semibold">Your Name</Label>
                <Input
                  id="guestName"
                  placeholder="e.g. Rahul Sharma"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGuest()}
                  className="h-12 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
              <Button 
                onClick={handleCreateGuest}
                className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                disabled={!guestName.trim() || creatingUser}
              >
                {creatingUser ? <Loader2 className="animate-spin mr-2" /> : null}
                Continue
              </Button>
            </div>
            <p className="text-xs text-center text-slate-400">
              By continuing, you agree to our Terms of Service.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading shop details...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center p-8 border-dashed">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Shop Not Found</h2>
          <p className="text-slate-500 mb-6">The shop you scanned doesn't exist or is currently unavailable.</p>
          <Button onClick={() => router.push('/')} variant="outline">Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')} 
            className="-ml-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            <span className="font-medium">Back</span>
          </Button>
          <div className="ml-auto flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                {shop.shopName.charAt(0)}
             </div>
             <span className="font-semibold text-sm hidden sm:inline-block">{shop.shopName}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        
        {/* Shop Info Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>
           
           <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">{shop.shopName}</h1>
           
           <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                 <MapPin size={16} className="text-blue-500" />
                 <span className="truncate max-w-[200px]">{shop.location.address}, {shop.location.city}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                 <Clock size={16} className="text-blue-500" />
                 <span>{shop.timings.open} - {shop.timings.close}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                 <Star size={16} className="fill-yellow-400 text-yellow-400" />
                 <span className="font-medium text-slate-900">{shop.rating}</span>
                 <span className="text-slate-400">({shop.totalReviews})</span>
              </div>
           </div>
        </div>

        {/* Printer Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-lg font-bold text-slate-900">Select Printer</h2>
             <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
               {printers.filter(p => p.status === 'online').length} Available
             </span>
          </div>

          {printers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <PrinterIcon className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">No printers available at this shop.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {printers.map((printer) => {
                const isSelected = selectedPrinter === printer._id;
                const isOnline = printer.status === 'online';

                return (
                  <div
                    key={printer._id}
                    onClick={() => isOnline && setSelectedPrinter(printer._id)}
                    className={`
                      relative p-5 rounded-2xl border-2 transition-all cursor-pointer group
                      ${isSelected 
                        ? 'border-blue-600 bg-blue-50/50 shadow-md' 
                        : 'border-white bg-white shadow-sm hover:border-blue-200 hover:shadow-md'
                      }
                      ${!isOnline && 'opacity-60 cursor-not-allowed grayscale'}
                    `}
                  >
                    {/* Selection Indicator */}
                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'
                    }`}>
                       {isSelected && <Check size={14} className="text-white" />}
                    </div>

                    <div className="flex items-start gap-4 pr-8">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
                          isSelected ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-500'
                       }`}>
                          🖨️
                       </div>
                       
                       <div>
                          <h3 className={`font-bold text-base mb-0.5 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                             {printer.displayName}
                          </h3>
                          <div className="flex items-center gap-2 mb-3">
                             <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                isOnline 
                                   ? 'bg-green-100 text-green-700' 
                                   : 'bg-red-100 text-red-700'
                             }`}>
                                {isOnline ? 'Online' : 'Offline'}
                             </span>
                             {printer.capabilities.supportsColor && (
                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                   Color
                                </span>
                             )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                             <div>
                                <span className="block text-[10px] uppercase text-slate-400 font-bold">B&W</span>
                                <span className="text-slate-900">₹{printer.pricing.bwPerPage}</span>
                             </div>
                             {printer.capabilities.supportsColor && (
                                <div>
                                   <span className="block text-[10px] uppercase text-slate-400 font-bold">Color</span>
                                   <span className="text-slate-900">₹{printer.pricing.colorPerPage}</span>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 md:p-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <div className="container mx-auto max-w-3xl flex items-center justify-between gap-4">
            <div className="hidden md:block">
               <p className="text-sm font-medium text-slate-900">
                  {selectedPrinter ? 'Printer selected' : 'Please select a printer'}
               </p>
               <p className="text-xs text-slate-500">Next: Upload your documents</p>
            </div>
            <Button 
              size="lg" 
              className="w-full md:w-auto md:min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-200 transition-transform active:scale-95"
              disabled={!selectedPrinter}
              onClick={handleContinue}
            >
              Continue to Upload
            </Button>
         </div>
      </div>
    </div>
  );
}

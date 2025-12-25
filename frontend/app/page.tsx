'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Upload, Scan, CreditCard, Clock } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">PRINTLY</span>
            </div>
            <Button 
  onClick={() => router.push('/scan')}
            variant="ghost">Find Shops</Button>
            <Button
  onClick={() => router.push('/history')}
  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
>
  <Clock className="w-5 h-5" />
  <span>View History</span>
</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 text-slate-900">
          Print Anywhere, Anytime
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          No app. No signup. Just scan, upload, and print.
          Your documents printed in minutes.
        </p>
        <Button 
          size="lg" 
          className="text-lg px-8 py-6"
          onClick={() => router.push('/scan')}
        >
          <Scan className="mr-2 h-5 w-5" />
          Scan QR Code to Start
        </Button>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scan className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">1. Scan QR Code</h3>
              <p className="text-slate-600 text-sm">
                Find the QR code at any print shop
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">2. Upload File</h3>
              <p className="text-slate-600 text-sm">
                Select your document from your device
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Printer className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">3. Configure</h3>
              <p className="text-slate-600 text-sm">
                Choose color, copies, and paper size
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">4. Pay & Collect</h3>
              <p className="text-slate-600 text-sm">
                Pay at counter and get your prints
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">
            Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">₹2</div>
                  <div className="text-slate-600">per page</div>
                  <div className="mt-4 font-semibold">Black & White</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">₹10</div>
                  <div className="text-slate-600">per page</div>
                  <div className="mt-4 font-semibold">Color</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-slate-600">
          <p>© 2025 PRINTLY. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

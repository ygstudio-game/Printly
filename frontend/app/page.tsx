'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Upload, Scan, CreditCard, Clock, ChevronRight, QrCode } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform duration-300">
              <Printer className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
              PRINTLY
            </span>
          </div>
          
          <div className="flex items-center gap-2">
             <Button
              onClick={() => router.push('/history')}
              variant="ghost"
              size="sm"
              className="hidden md:flex items-center gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>History</span>
            </Button>
            <Button 
              onClick={() => router.push('/scan')}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all hover:shadow-blue-300 rounded-full px-4"
            >
              Scan
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Padding for Sticky Header */}
      <div className="pt-20 pb-20 px-4 md:px-0">

        {/* Hero Section */}
        <section className="container mx-auto max-w-4xl text-center py-12 md:py-24 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 mb-4 animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            No App Required. No Signup.
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
            Print Anywhere, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Anytime.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Just scan the QR code at any Printly-enabled shop, upload your file, and pay. 
            <span className="hidden md:inline"> Your documents printed in minutes.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 rounded-2xl transition-all hover:scale-105 active:scale-95"
              onClick={() => router.push('/scan')}
            >
              <QrCode className="mr-2 h-5 w-5" />
              Scan QR to Start
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="w-full sm:w-auto h-14 px-8 text-lg font-medium border-2 hover:bg-slate-50 text-slate-700 rounded-2xl"
              onClick={() => router.push('/history')}
            >
              <Clock className="mr-2 h-5 w-5" />
              View History
            </Button>
          </div>
        </section>

        {/* How It Works Grid */}
        <section className="container mx-auto max-w-6xl py-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full opacity-80"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-100 rounded-3xl transform rotate-3 transition-transform group-hover:rotate-6 opacity-40 group-hover:opacity-60"></div>
              <Card className="relative h-full border-0 shadow-lg group-hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 px-6 text-center flex flex-col items-center h-full">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-blue-600">
                    <Scan className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-slate-900">1. Scan QR</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Locate the Printly QR code at the shop counter or entrance.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-green-100 rounded-3xl transform -rotate-2 transition-transform group-hover:-rotate-4 opacity-40 group-hover:opacity-60"></div>
              <Card className="relative h-full border-0 shadow-lg group-hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 px-6 text-center flex flex-col items-center h-full">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-green-600">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-slate-900">2. Upload File</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Select any PDF, Image, or Doc from your mobile device.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-purple-100 rounded-3xl transform rotate-2 transition-transform group-hover:rotate-4 opacity-40 group-hover:opacity-60"></div>
              <Card className="relative h-full border-0 shadow-lg group-hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 px-6 text-center flex flex-col items-center h-full">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-purple-600">
                    <Printer className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-slate-900">3. Configure</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Choose B&W or Color, copies, and paper size easily.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Step 4 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-orange-100 rounded-3xl transform -rotate-3 transition-transform group-hover:-rotate-6 opacity-40 group-hover:opacity-60"></div>
              <Card className="relative h-full border-0 shadow-lg group-hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
                <CardContent className="pt-8 pb-8 px-6 text-center flex flex-col items-center h-full">
                  <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 text-orange-600">
                    <CreditCard className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-slate-900">4. Pay & Collect</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Show your job ID at the counter, pay cash, and collect.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

 
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 pb-24 md:pb-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 font-medium">© 2025 PRINTLY. All rights reserved.</p>
        </div>
      </footer>
      
      {/* Mobile Bottom Navigation (Optional but good for mobile-first) */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 md:hidden z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center w-full h-full text-blue-600">
            <Printer size={20} />
            <span className="text-[10px] font-medium mt-1">Home</span>
          </button>
          <button onClick={() => router.push('/scan')} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-blue-600">
            <div className="bg-blue-600 rounded-full p-3 -mt-6 shadow-lg border-4 border-white">
               <Scan size={24} className="text-white" />
            </div>
            <span className="text-[10px] font-medium mt-1">Scan</span>
          </button>
           <button onClick={() => router.push('/history')} className="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-blue-600">
            <Clock size={20} />
            <span className="text-[10px] font-medium mt-1">History</span>
          </button>
        </div>
      </div>
    </div>
  );
}

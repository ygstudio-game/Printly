'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getJob } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Printer as PrinterIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  FileText,
  Copy,
  Palette,
  Calendar,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Home,
  ChevronRight,
  Receipt
} from 'lucide-react';
import type { PrintJob } from '@/types/printer';

interface Props {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    gradient: 'from-yellow-400 to-orange-500',
    progress: 25,
    title: 'Waiting for Payment',
    description: 'Please proceed to the counter to complete payment.',
    action: 'Pay at Counter'
  },
  printing: {
    icon: PrinterIcon,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradient: 'from-blue-500 to-indigo-600',
    progress: 60,
    title: 'Printing in Progress',
    description: 'Your document is currently being printed.',
    action: 'Printing...'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradient: 'from-green-500 to-emerald-600',
    progress: 100,
    title: 'Ready for Pickup',
    description: 'Your prints are ready! Please collect them.',
    action: 'Collect Prints'
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradient: 'from-red-500 to-rose-600',
    progress: 100,
    title: 'Print Failed',
    description: 'Something went wrong. Please ask staff for help.',
    action: 'Contact Staff'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    gradient: 'from-slate-500 to-gray-600',
    progress: 0,
    title: 'Job Cancelled',
    description: 'This print job was cancelled.',
    action: 'Cancelled'
  }
};

export default function JobTrackingPage({ params }: Props) {
  const router = useRouter();
  const [job, setJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { id } = use(params);

  const fetchJobData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const jobData = await getJob(id);
      setJob(jobData);
      setLastUpdate(new Date());
      if (isRefresh) toast.success('Status updated');
    } catch (error) {
      console.error('Failed to load job:', error);
      if (!isRefresh) toast.error('Failed to load job status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobData();
    const interval = setInterval(() => fetchJobData(), 5000); // Faster polling for better UX
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg text-center p-8">
           <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
           </div>
           <h2 className="text-xl font-bold text-slate-900 mb-2">Job Not Found</h2>
           <Button onClick={() => router.push('/')} className="w-full mt-4 bg-slate-900 text-white">Go Home</Button>
        </Card>
      </div>
    );
  }

  const currentStatus = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 text-slate-500 rounded-full hover:bg-slate-100">
             <ArrowLeft className="w-6 h-6" />
           </Button>
           <div>
              <h1 className="font-bold text-slate-900 leading-tight text-sm">Job #{job.jobNumber}</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Tracking Status</p>
           </div>
        </div>
        <Button 
           variant="ghost" 
           size="sm"
           onClick={() => fetchJobData(true)}
           disabled={refreshing}
           className="text-slate-500 hover:bg-slate-100 rounded-full h-8 px-3 text-xs font-medium"
        >
           <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
           {refreshing ? 'Updating' : 'Refresh'}
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-5">

         {/* Hero Status Card */}
         <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentStatus.gradient} shadow-lg text-white p-6`}>
            <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                     <StatusIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                     {currentStatus.action}
                  </div>
               </div>
               
               <h2 className="text-2xl font-bold mb-1">{currentStatus.title}</h2>
               <p className="text-white/80 text-sm mb-6 max-w-[80%]">{currentStatus.description}</p>
               
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-white/80">
                     <span>Progress</span>
                     <span>{currentStatus.progress}%</span>
                  </div>
                  <Progress value={currentStatus.progress} className="h-2 bg-black/20 bg-white" />
               </div>
            </div>
            {/* Background Decoration */}
            <StatusIcon className="absolute -bottom-6 -right-6 w-48 h-48 text-white opacity-10 rotate-12" />
         </div>

         {/* Job Details Card */}
         <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-3">
               <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Order Details
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-100">
                  {/* File Info */}
                  <div className="p-4 flex items-center gap-4">
                     <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <FileText size={20} />
                     </div>
                     <div>
                        <p className="font-bold text-slate-900 text-sm">{job.fileName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                           {job.settings.totalPages} Pages • {job.settings.copies} Copies
                        </p>
                     </div>
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-2 text-sm">
                     <div className="p-4 border-r border-slate-100">
                        <span className="text-xs text-slate-500 block mb-1">Color Mode</span>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 capitalize">
                           <Palette size={14} className="text-slate-400"/> {job.settings.colorMode === 'color' ? 'Color' : 'B&W'}
                        </div>
                     </div>
                     <div className="p-4">
                        <span className="text-xs text-slate-500 block mb-1">Paper</span>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                           <Copy size={14} className="text-slate-400"/> {job.settings.paperSize}
                        </div>
                     </div>
                  </div>

                  {/* Location */}
                  {job.shopId && (
                     <div className="p-4 flex items-start gap-3 bg-slate-50/50">
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <div>
                           <p className="font-semibold text-slate-900 text-sm">{job.shopId.shopName}</p>
                           <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{job.shopId.location.address}</p>
                        </div>
                     </div>
                  )}
               </div>
            </CardContent>
         </Card>

         {/* Timestamp */}
         <div className="text-center">
            <p className="text-xs text-slate-400">
               Job created at {new Date(job.timestamps.created).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
         </div>

      </div>

      {/* Floating Action Bar (Mobile First) */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe z-50 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
         <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
               <p className="text-2xl font-bold text-slate-900">₹{job.estimatedCost.toFixed(2)}</p>
               <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Amount</p>
            </div>
            
            <div className="flex gap-2">
               <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => router.push('/')}
                  className="rounded-xl h-12 w-12 border-slate-200"
               >
                  <Home size={20} className="text-slate-600" />
               </Button>
               <Button 
                  onClick={() => router.push('/history')}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 px-6 shadow-lg shadow-slate-200 font-bold text-sm"
               >
                  My Orders
               </Button>
            </div>
         </div>
      </div>

    </div>
  );
}

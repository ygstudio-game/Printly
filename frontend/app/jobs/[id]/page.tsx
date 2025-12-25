// app/jobs/[id]/page.tsx
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
  Download
} from 'lucide-react';
import type { PrintJob } from '@/types/printer';

interface Props {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    gradientFrom: 'from-yellow-400',
    gradientTo: 'to-orange-400',
    progress: 25,
    title: 'Waiting for Payment',
    description: 'Your job is in the queue. Please go to the counter to pay and start printing.',
    action: 'Go to counter to complete payment'
  },
  printing: {
    icon: PrinterIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-500',
    progress: 75,
    title: 'Printing in Progress',
    description: 'Your document is being printed. This will take a few moments.',
    action: 'Please wait while we print your document'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-emerald-500',
    progress: 100,
    title: 'Ready for Pickup!',
    description: 'Your prints are ready. Please collect them from the counter.',
    action: 'Collect your prints from the counter'
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-rose-500',
    progress: 100,
    title: 'Print Failed',
    description: 'Something went wrong. Please contact the shop staff for assistance.',
    action: 'Ask shop staff for help'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    gradientFrom: 'from-gray-500',
    gradientTo: 'to-slate-500',
    progress: 0,
    title: 'Job Cancelled',
    description: 'This print job has been cancelled.',
    action: 'You may start a new print job'
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
      
      if (isRefresh) {
        toast.success('Status updated');
      }
    } catch (error) {
      console.error('Failed to load job:', error);
      if (!isRefresh) {
        toast.error('Failed to load job status');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobData();

    // Poll every 10 seconds
    const interval = setInterval(() => fetchJobData(), 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading job status...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Not Found</h2>
            <p className="text-slate-600 mb-6">The print job you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/')} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fetchJobData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Status Card */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200 shadow-lg overflow-hidden">
              {/* Status Header with Gradient */}
              <div className={`bg-gradient-to-r ${currentStatus.gradientFrom} ${currentStatus.gradientTo} p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">Job Number</p>
                    <h1 className="text-3xl font-bold">#{job.jobNumber}</h1>
                  </div>
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Icon className="w-9 h-9" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{currentStatus.title}</h2>
                  <p className="text-white/90">{currentStatus.description}</p>
                </div>
              </div>

              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Progress</span>
                    <span className="text-sm font-bold text-slate-900">{currentStatus.progress}%</span>
                  </div>
                  <Progress value={currentStatus.progress} className="h-3" />
                </div>

                {/* Action Banner */}
                <div className={`${currentStatus.bgColor} ${currentStatus.borderColor} border-2 rounded-xl p-4 mb-6`}>
                  <p className={`${currentStatus.color} font-semibold text-center flex items-center justify-center gap-2`}>
                    <Icon className="w-5 h-5" />
                    {currentStatus.action}
                  </p>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      <span>Created</span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      {new Date(job.timestamps.created).toLocaleString()}
                    </p>
                  </div>
                  {job.timestamps.completed && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                      <p className="font-semibold text-green-900">
                        {new Date(job.timestamps.completed).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shop Info */}
            {job.shopId && (
<Card className="mt-6 border-slate-200 shadow-sm">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg flex items-center gap-2">
      <MapPin className="w-5 h-5 text-blue-600" />
      Shop Location
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <p className="font-semibold text-slate-900 text-lg">{job.shopId.shopName}</p>
      <p className="text-slate-600 text-sm">
        {job.shopId.location.address}, {job.shopId.location.city}
      </p>
      {job.shopId.location.coordinates && (
        <p className="text-xs text-slate-400">
          Lat: {job.shopId.location.coordinates.lat}, Lng: {job.shopId.location.coordinates.lng}
        </p>
      )}
    </div>
  </CardContent>
</Card>

            )}
          </div>

          {/* Job Details Sidebar */}
          <div className="space-y-6">
            {/* Document Info */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-600 mb-1">File Name</p>
                    <p className="font-semibold text-slate-900 text-sm break-all">{job.fileName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 mb-1">Pages</p>
                      <p className="font-bold text-slate-900 text-lg">{job.settings.totalPages}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 mb-1">Copies</p>
                      <p className="font-bold text-slate-900 text-lg">{job.settings.copies}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Print Settings */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PrinterIcon className="w-5 h-5 text-blue-600" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color Mode
                    </span>
                    <Badge variant={job.settings.colorMode === 'color' ? 'default' : 'secondary'}>
                      {job.settings.colorMode === 'color' ? 'Color' : 'B&W'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Copy className="w-4 h-4" />
                      Paper Size
                    </span>
                    <span className="font-semibold text-slate-900">{job.settings.paperSize}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Duplex</span>
                    <Badge variant={job.settings.duplex ? 'default' : 'outline'}>
                      {job.settings.duplex ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {job.settings.orientation && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Orientation</span>
                      <span className="font-semibold text-slate-900 capitalize">{job.settings.orientation}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600">Page Range</span>
                    <span className="font-semibold text-slate-900">{job.settings.pageRanges || 'All'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card className="border-slate-200 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Amount to Pay</p>
                    <p className="text-4xl font-bold">₹{job.estimatedCost.toFixed(2)}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => router.push('/history')}
            className="flex-1"
          >
            <FileText className="mr-2 h-5 w-5" />
            View All Jobs
          </Button>
          <Button 
            size="lg"
            onClick={() => router.push('/')}
            className="flex-1"
          >
            <Home className="mr-2 h-5 w-5" />
            Print Another Document
          </Button>
        </div>

        {/* Last Updated */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refreshes every 10 seconds
        </p>
      </div>
    </div>
  );
}

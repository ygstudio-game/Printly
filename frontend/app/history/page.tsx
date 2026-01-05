'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Clock, CheckCircle, XCircle, Loader2, 
  LogOut, Search, Printer, TrendingUp, ChevronLeft, Calendar 
} from 'lucide-react';
import { useStore } from '@/lib/store';
import type { PrintJob } from '@/types/printer';
import { getUserJobs } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function HistoryPage() {
  const router = useRouter();
  const { userId, isGuest, logout } = useStore();
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!userId) {
      console.log('No userId found, redirecting to home');
      router.push('/');
      return;
    }

    fetchJobs();
  }, [userId, hydrated, router]);

  async function fetchJobs() {
    try {
      const data = await getUserJobs(userId!);
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.push('/');
  }

  const filteredJobs = jobs
    .filter(job => {
      if (filter === 'all') return true;
      return job.status === filter;
    })
    .filter(job => 
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    pending: jobs.filter(j => j.status === 'pending' || j.status === 'printing').length,
    totalSpent: jobs
      .filter(j => j.status === 'completed')
      .reduce((sum, job) => sum + job.estimatedCost, 0),
    totalPages: jobs
      .filter(j => j.status === 'completed')
      .reduce((sum, job) => sum + (job.settings.totalPages * job.settings.copies), 0)
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      printing: 'bg-blue-100 text-blue-700 border-blue-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border flex items-center gap-1.5 w-fit ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'completed' && <CheckCircle size={12} />}
        {status === 'failed' && <XCircle size={12} />}
        {status === 'printing' && <Loader2 size={12} className="animate-spin" />}
        {status === 'pending' && <Clock size={12} />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100 selection:text-blue-900 pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="md:hidden -ml-2 text-slate-500">
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm hidden md:block">
                 <Printer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">Print History</h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  {isGuest ? 'Guest User' : 'Your Print Records'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push('/')}
                size="sm"
                className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white"
              >
                New Print
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
              >
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Jobs</span>
               <div className="bg-blue-50 p-1.5 rounded-lg text-blue-600"><FileText size={16} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Spent</span>
               <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600"><TrendingUp size={16} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900">₹{stats.totalSpent}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Completed</span>
               <div className="bg-green-50 p-1.5 rounded-lg text-green-600"><CheckCircle size={16} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.completed}</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-start mb-2">
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending</span>
               <div className="bg-amber-50 p-1.5 rounded-lg text-amber-600"><Clock size={16} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.pending}</div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input
               type="text"
               placeholder="Search files..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
             />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
             {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
               <button
                 key={status}
                 onClick={() => setFilter(status)}
                 className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                   filter === status
                     ? 'bg-slate-900 text-white shadow-md'
                     : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                 }`}
               >
                 {status.charAt(0).toUpperCase() + status.slice(1)}
               </button>
             ))}
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
            <p className="font-medium text-sm">Loading history...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No jobs found</h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchQuery ? 'Try adjusting your search filters' : 'Your printing history will appear here'}
            </p>
            {!searchQuery && (
               <Button onClick={() => router.push('/')} className="bg-blue-600 text-white rounded-xl">
                 Start Printing
               </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                   {/* Icon & Main Info */}
                   <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-100 shrink-0">
                         <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate pr-2">{job.fileName}</h3>
                            <span className="hidden md:inline-flex">{getStatusBadge(job.status)}</span>
                         </div>
                         <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                               <Calendar size={12} />
                               {new Date(job.timestamps.created).toLocaleDateString()}
                            </span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                               {job.jobNumber}
                            </span>
                             {job.shopId?.shopName && (
                                <span className="flex items-center gap-1 text-slate-400">
                                   at {job.shopId.shopName}
                                </span>
                             )}
                         </div>
                      </div>
                      
                      {/* Mobile Badge */}
                      <div className="md:hidden">
                         {getStatusBadge(job.status)}
                      </div>
                   </div>

                   {/* Stats Grid */}
                   <div className="grid grid-cols-3 gap-2 md:gap-8 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl md:border-l md:border-slate-100 md:pl-6 shrink-0">
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pages</p>
                         <p className="text-sm font-bold text-slate-700">{job.settings.totalPages} <span className="text-slate-400 font-normal">x {job.settings.copies}</span></p>
                      </div>
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Mode</p>
                         <p className="text-sm font-bold text-slate-700 capitalize">{job.settings.colorMode}</p>
                      </div>
                      <div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Cost</p>
                         <p className="text-sm font-bold text-blue-600">₹{job.estimatedCost}</p>
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

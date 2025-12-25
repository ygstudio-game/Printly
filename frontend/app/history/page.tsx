// app/history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Clock, CheckCircle, XCircle, Loader2, 
  LogOut, Filter, Search, Calendar, Printer, TrendingUp
} from 'lucide-react';
import { useStore } from '@/lib/store';

import type { PrintJob } from '@/types/printer';
import { getUserJobs } from '@/lib/api';

export default function HistoryPage() {
  const router = useRouter();
  const { userId, userName, isGuest, logout } = useStore();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'printing':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      printing: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Printer className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Print History</h1>
                <p className="text-sm text-gray-600">
                  {isGuest ? 'Guest User' : 'Your Print Records'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                New Print
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-medium">Total Jobs</span>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-2">All time</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-medium">Completed</span>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-gray-500 mt-2">
              Success rate: {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-medium">Total Spent</span>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600">₹{stats.totalSpent}</div>
            <p className="text-xs text-gray-500 mt-2">{stats.totalPages} pages printed</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-medium">Pending</span>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.failed > 0 && `${stats.failed} failed`}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename or job number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {(['all', 'completed', 'pending', 'failed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                    filter === status
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading your print history...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No print jobs found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Start printing to see your history here'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Print Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <FileText className="w-7 h-7 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-gray-900 text-lg">{job.fileName}</h3>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Job Number</span>
                          <span className="font-semibold text-gray-900">{job.jobNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Pages</span>
                          <span className="font-semibold text-gray-900">{job.settings.totalPages}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Copies</span>
                          <span className="font-semibold text-gray-900">{job.settings.copies}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Mode</span>
                          <span className="font-semibold text-gray-900">
                            {job.settings.colorMode === 'color' ? 'Color' : 'B&W'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Cost</span>
                          <span className="font-bold text-blue-600">₹{job.estimatedCost}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(job.timestamps.created).toLocaleString()}</span>
                        </div>
                        {job.shopId?.shopName && (
                          <div className="flex items-center gap-1.5">
                            <Printer className="w-4 h-4" />
                            <span>{job.shopId.shopName}</span>
                          </div>
                        )}
                        {job.timestamps.completed && (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed {new Date(job.timestamps.completed).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {getStatusIcon(job.status)}
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

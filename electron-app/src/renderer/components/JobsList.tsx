// src/renderer/components/JobsList.tsx
import React, { useState, useMemo } from 'react';
import { Loader2, Search, Clock, FileText, Printer, User, ArrowUpDown, Filter, X, Trash2 } from 'lucide-react';
import { PrintJob, JobsListProps } from '../../types/index';

export default function JobsList({ jobs, onPrintJob, onRemoveJob, onRemoveAllJobs, loadingJobId, printingJobId }: JobsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'color' | 'bw'>('all');
  const [sortBy, setSortBy] = useState<'queue' | 'time' | 'amount'>('queue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ✅ Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs.filter(job => {
      const matchesSearch = 
        job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.printerName && job.printerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (job.userName && job.userName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter = filterStatus === 'all' || job.settings.colorMode === filterStatus;
      return matchesSearch && matchesFilter;
    });

    // ✅ Sort jobs
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'queue':
          const numA = parseInt(a.jobNumber.split('-')[1] || '0');
          const numB = parseInt(b.jobNumber.split('-')[1] || '0');
          comparison = numA - numB;
          break;
        case 'time':
          comparison = new Date(a.timestamps.created).getTime() - new Date(b.timestamps.created).getTime();
          break;
        case 'amount':
          comparison = a.estimatedCost - b.estimatedCost;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [jobs, searchQuery, filterStatus, sortBy, sortOrder]);

  const toggleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const totalAmount = filteredAndSortedJobs.reduce((sum, job) => sum + job.estimatedCost, 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Print Queue</h2>
            <p className="text-slate-600 mt-1">
              {filteredAndSortedJobs.length} {filteredAndSortedJobs.length === 1 ? 'job' : 'jobs'} pending
              {filteredAndSortedJobs.length > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">
                  • Total: ₹{totalAmount.toFixed(2)}
                </span>
              )}
            </p>
          </div>
          {/* ✅ Remove All Button */}
          {jobs.length > 0 && (
            <button 
              onClick={onRemoveAllJobs}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by job number, file name, customer name, or printer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-500" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('color')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  filterStatus === 'color'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>🌈</span> Color
              </button>
              <button
                onClick={() => setFilterStatus('bw')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  filterStatus === 'bw'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>⚫</span> B&W
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-300" />

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => toggleSort('queue')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'queue'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Queue #
                {sortBy === 'queue' && (
                  <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => toggleSort('time')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'time'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Time
                {sortBy === 'time' && (
                  <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
              <button
                onClick={() => toggleSort('amount')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'amount'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Amount
                {sortBy === 'amount' && (
                  <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredAndSortedJobs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              {searchQuery || filterStatus !== 'all' ? (
                <>
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="text-xl font-semibold text-slate-900 mb-2">No jobs found</p>
                  <p className="text-slate-600">Try adjusting your search or filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl font-semibold text-slate-900 mb-2">No pending jobs</p>
                  <p className="text-slate-600">New jobs will appear here automatically</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedJobs.map((job, index) => (
              <JobCard
                key={job._id}
                job={job}
                queuePosition={index + 1}
                onRemove={onRemoveJob} 
                onPrint={onPrintJob}
                isLoading={loadingJobId === job._id}
                isPrinting={printingJobId === job._id}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ Enhanced JobCard Component
interface JobCardProps {
  job: PrintJob;
  queuePosition: number;
  onRemove: (jobId: string) => void;      
  onPrint: (job: PrintJob) => void;
  isLoading: boolean;
  isPrinting: boolean;
  formatTime: (date: string) => string;
}

function JobCard({ job, queuePosition, onPrint, isLoading, isPrinting, onRemove, formatTime }: JobCardProps) {
  const [isDeleting, setIsDeleting] = useState(false); // ✅ Local deleting state
  const isActive = isLoading || isPrinting || isDeleting;

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    // Add a small delay for better UX or await the actual removal logic
    try {
        await onRemove(job._id);
    } catch (error) {
        setIsDeleting(false); // Reset if error
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-md border-2 transition-all hover:shadow-xl hover:-translate-y-1 relative group ${
      isActive ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200'
    }`}>
      {/* Queue Position Badge */}
      <div className="absolute -top-3 -left-3 z-20">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
          #{queuePosition}
        </div>
      </div>

      {/* ✅ Remove Button (Always Visible, Top Right) */}
      <div className="absolute top-2 right-2 z-20">
         <button 
           onClick={handleRemove}
           disabled={isActive}
           className="p-2 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full shadow-sm border border-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           title="Remove Job"
         >
           {isDeleting ? (
             <Loader2 size={16} className="animate-spin text-red-600" />
           ) : (
             <Trash2 size={16} />
           )}
         </button>
      </div>

      {/* Header */}
      <div className="p-5 pt-8 border-b border-slate-100">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{job.jobNumber}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} />
                {formatTime(job.timestamps?.created.toString())}          
              </div>
            </div>
          </div>
          
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
            job.settings.colorMode === 'color'
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
              : 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700'
          }`}>
            {job.settings.colorMode === 'color' ? '🌈 Color' : '⚫ B&W'}
          </span>
        </div>

        <p className="font-semibold text-slate-800 truncate mb-2" title={job.fileName}>
          {job.fileName}
        </p>

        {/* Customer Name */}
        {job.userName && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
            <User size={16} className="text-slate-500" />
            <span className="font-medium">{job.userName}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-3">
        {/* Printer Info */}
        <div className="flex items-center gap-2 text-sm text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 p-3 rounded-xl border border-slate-200">
          <Printer size={18} className="text-slate-600" />
          <span className="font-semibold truncate">
            {job.printerName || 'Default Printer'}
          </span>
        </div>

        {/* Job Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Copies</p>
            <p className="text-lg font-bold text-blue-900">{job.settings.copies}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-600 font-medium mb-1">Pages</p>
            <p className="text-lg font-bold text-purple-900">{job.settings.totalPages || '-'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm bg-slate-50 px-3 py-2 rounded-lg">
          <span className="text-slate-600 font-medium">Paper Size</span>
          <span className="font-bold text-slate-900">{job.settings.paperSize}</span>
        </div>

        {job.settings.duplex && (
          <div className="flex items-center gap-2 text-sm text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-2.5 rounded-lg border border-purple-200">
            <span className="text-base">🔄</span>
            <span className="font-semibold">Double-sided printing</span>
          </div>
        )}

        {/* Price */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-xl flex justify-between items-center mt-4 shadow-md">
          <span className="font-semibold text-white text-sm">Total Amount</span>
          <span className="text-3xl font-bold text-white">₹{job.estimatedCost}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t rounded-b-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600 py-3">
            <Loader2 className="animate-spin h-5 w-5" />
            <span className="font-semibold">Preparing preview...</span>
          </div>
        ) : isPrinting ? (
          <div className="flex items-center justify-center gap-2 text-green-600 py-3">
            <Loader2 className="animate-spin h-5 w-5" />
            <span className="font-semibold">Printing...</span>
          </div>
        ) : (
          <button 
            onClick={() => onPrint(job)}
            disabled={isDeleting}
            className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Printer size={20} />
            Print & Collect
          </button>
        )}
      </div>
    </div>
  );
}

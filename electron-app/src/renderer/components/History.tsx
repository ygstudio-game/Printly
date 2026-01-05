// src/renderer/components/History.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle, 
  Search, TrendingUp, ArrowLeft, Calendar 
} from 'lucide-react';

import { PrintJob } from '../../types/index';

interface HistoryProps {
  onBack: () => void;
}

export default function History({ onBack }: HistoryProps) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 🗓️ NEW: Date Filter States
  const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadHistory();
    // Initialize dates to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      const historyJobs = await window.electron.getHistoryFromBackend();
      setJobs(historyJobs);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }

  // ✅ FIX: Allow timestamp to be string OR Date
  const isWithinDateRange = (timestamp: string | Date) => {
    if (!startDate || !endDate) return true;
    
    // new Date() handles both string and Date objects correctly
    const jobDate = new Date(timestamp).setHours(0, 0, 0, 0);
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    
    return jobDate >= start && jobDate <= end;
  };

  const filteredJobs = jobs
    .filter(job => {
      if (filter === 'completed') return job.status === 'completed';
      if (filter === 'failed') return job.status === 'failed';
      return true;  
    })
    .filter(job => 
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Apply Date Filter (This was likely line 67 causing the error)
    .filter(job => isWithinDateRange(job.timestamps.created))
    .sort((a, b) => 
      new Date(b.timestamps.created).getTime() - new Date(a.timestamps.created).getTime()
    );

  // 📊 Calculate stats based on FILTERED jobs
  const stats = {
    total: filteredJobs.length,
    completed: filteredJobs.filter(j => j.status === 'completed').length,
    failed: filteredJobs.filter(j => j.status === 'failed').length,
    totalSpent: filteredJobs
      .filter(j => j.status === 'completed')
      .reduce((sum, job) => sum + job.estimatedCost, 0),
    totalPages: filteredJobs
      .filter(j => j.status === 'completed')
      .reduce((sum, job) => sum + (job.settings.totalPages * job.settings.copies), 0)
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleDateModeChange = (mode: 'monthly' | 'custom') => {
    setDateMode(mode);
    const now = new Date();
    if (mode === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings & History</h1>
            <p className="text-sm text-gray-600">
              Track earnings from {startDate ? new Date(startDate).toLocaleDateString() : '...'} to {endDate ? new Date(endDate).toLocaleDateString() : '...'}
            </p>
          </div>
        </div>
        
        {/* Date Range Controls */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => handleDateModeChange('monthly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dateMode === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            This Month
          </button>
          <button 
            onClick={() => handleDateModeChange('custom')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${dateMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Custom Range
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        
        {/* Custom Date Inputs */}
        {dateMode === 'custom' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-end gap-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Jobs</span>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-400 mt-1">In selected range</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Success Rate</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-400 mt-1">{stats.completed} successful jobs</p>
          </div>

          {/* 💰 Earnings Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 shadow-md text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-100 text-sm font-medium">Total Earnings</span>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="text-3xl font-bold">₹{stats.totalSpent.toFixed(2)}</div>
            <p className="text-xs text-indigo-100 mt-1 opacity-90">
              {dateMode === 'monthly' ? 'This Month' : `${startDate} to ${endDate}`}
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">No print jobs found for the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div key={job._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${job.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {job.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.fileName}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(job.timestamps.created).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{job.estimatedCost}</p>
                  <p className="text-xs text-gray-500">{job.settings.totalPages} pgs • {job.settings.copies} cps</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

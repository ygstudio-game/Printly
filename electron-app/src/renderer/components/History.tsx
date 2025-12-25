// src/renderer/components/History.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, CheckCircle, XCircle, 
  Search, TrendingUp, ArrowLeft 
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

  useEffect(() => {
    loadHistory();
  }, []);

 async function loadHistory() {
    try {
      setLoading(true);
      
      // ✅ Fetch history from backend (no userId needed, uses shopId)
      const historyJobs = await window.electron.getHistoryFromBackend();
      
      setJobs(historyJobs);
      console.log(`📊 Loaded ${historyJobs.length} history jobs from backend`);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }
  const filteredJobs = jobs
    .filter(job => {
      if (filter === 'completed') return job.status === 'completed'; // ✅ Default filter
      if (filter === 'failed') return job.status === 'failed';
      return true;  
    })
    .filter(job => 
      job.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => 
      new Date(b.timestamps.created).getTime() - new Date(a.timestamps.created).getTime()
    );

  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
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
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Print History</h1>
              <p className="text-sm text-gray-600">View all your past print jobs</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
      {/* Stats - show failed count */}
      <div className="grid grid-cols-3 gap-4 mb-6"> {/* ✅ Changed from 4 to 3 columns */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Jobs</span>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Completed</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% success
          </p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Earned</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">₹{stats.totalSpent}</div>
          <p className="text-xs text-gray-500 mt-1">{stats.totalPages} pages</p>
        </div>

        {/* ✅ Show failed count as a small warning if > 0 */}
        {stats.failed > 0 && (
          <div className="col-span-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                {stats.failed} failed job{stats.failed > 1 ? 's' : ''} - 
                <button 
                  onClick={() => setFilter('failed')}
                  className="ml-1 underline font-medium"
                >
                  View Details
                </button>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters - default to "Completed" */}
      <div className="flex gap-2">
        {(['completed', 'all', 'failed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'completed' && '✓ '}
            {status === 'failed' && '✗ '}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search' : 'Your print history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{job.fileName}</h3>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="grid grid-cols-5 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-gray-500 text-xs block">Job #</span>
                          <span className="font-medium text-gray-900">{job.jobNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Printer</span>
                          <span className="font-medium text-gray-900">{job.printerName}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Pages</span>
                          <span className="font-medium text-gray-900">{job.settings.totalPages}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Copies</span>
                          <span className="font-medium text-gray-900">{job.settings.copies}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs block">Cost</span>
                          <span className="font-bold text-blue-600">₹{job.estimatedCost}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(job.timestamps.created).toLocaleString()}</span>
                        </div>
                        {job.timestamps.completed && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Completed {new Date(job.timestamps.completed).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>{getStatusIcon(job.status)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

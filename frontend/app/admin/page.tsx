'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, TrendingUp, ShoppingBag, 
  MapPin, Calendar, Search, ArrowDownToLine,
  Menu, X, FileText 
} from 'lucide-react';
import { getAdminAnalytics } from '@/lib/api';
import { DashboardResponse } from '@/types/admin';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Date State
  const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
  const [customRange, setCustomRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Calculate actual query dates based on mode
  const getQueryDates = () => {
    if (dateMode === 'monthly') {
      // Logic for "This Month" (or selected month from dropdown - simplified here to current month for demo)
      // You can add a month selector state if needed
      const now = new Date();
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      };
    }
    return customRange;
  };

  // Fetch Data
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const { start, end } = getQueryDates();
        const result = await getAdminAnalytics(start, end);
        setData(result);
      } catch (e) {
        toast.error('Could not load analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateMode, customRange]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-72 bg-slate-900 text-white z-40
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-400">
            <LayoutDashboard size={24} />
            <span className="text-xl font-bold tracking-tight">Printly Admin</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem active icon={<TrendingUp size={20} />} label="Overview" />
          <NavItem icon={<ShoppingBag size={20} />} label="Shops" />
          <NavItem icon={<FileText size={20} />} label="Reports" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">A</div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0"> {/* min-w-0 prevents table overflow issues */}
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
          <h1 className="font-bold text-lg">Financial Overview</h1>
          <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg">
            <Menu size={20} />
          </button>
        </div>

        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
          
          {/* Top Bar: Title & Filters */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="hidden md:block">
              <h1 className="text-3xl font-bold text-slate-900">Financial Overview</h1>
              <p className="text-slate-500 mt-1">Track platform revenue and shop performance.</p>
            </div>

            {/* Advanced Date Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full lg:w-auto">
              
              {/* Mode Toggle */}
              <div className="flex bg-slate-100 rounded-xl p-1 w-full sm:w-auto">
                <button 
                  onClick={() => setDateMode('monthly')}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    dateMode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setDateMode('custom')}
                  className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    dateMode === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Date Inputs (Only show in Custom Mode) */}
              {dateMode === 'custom' && (
                <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in slide-in-from-right-4">
                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="date" 
                      value={customRange.start}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full sm:w-auto bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-400">to</span>
                    <input 
                      type="date" 
                      value={customRange.end}
                      onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full sm:w-auto bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </header>

          {loading || !data ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
              </div>
              <div className="h-96 bg-slate-200 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <KpiCard 
                  label="Total Revenue" 
                  value={`₹${data.global.totalRevenue.toLocaleString()}`} 
                  icon={<TrendingUp size={24} />} 
                  trend="+12% vs last period"
                  color="blue"
                />
                <KpiCard 
                  label="Jobs Completed" 
                  value={data.global.totalJobs.toLocaleString()} 
                  icon={<ShoppingBag size={24} />} 
                  trend="High volume"
                  color="purple"
                />
                <KpiCard 
                  label="Pages Printed" 
                  value={data.global.totalPages.toLocaleString()} 
                  icon={<FileText size={24} />} 
                  trend="Total paper usage"
                  color="orange"
                />
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">Shop Earnings</h3>
                    <p className="text-sm text-slate-500">Performance leaderboard based on revenue.</p>
                  </div>
                  <button className="text-sm text-blue-600 font-medium hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-100">
                    <ArrowDownToLine size={16} /> 
                    <span>Export CSV</span>
                  </button>
                </div>
                
                {/* Horizontal Scroll wrapper for table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[800px]"> {/* Min-width ensures table doesn't crush on mobile */}
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 w-12">#</th>
                        <th className="px-6 py-4">Shop Details</th>
                        <th className="px-6 py-4">Owner</th>
                        <th className="px-6 py-4 text-center">Jobs</th>
                        <th className="px-6 py-4 text-center">Avg. Order</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.shops.map((shop, index) => (
                        <tr key={shop.shopId} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 text-slate-400 font-mono">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{shop.shopName}</p>
                            <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                              <MapPin size={12} />
                              {shop.location?.city || 'Unknown City'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200">
                                {shop.ownerName ? shop.ownerName.charAt(0).toUpperCase() : '-'}
                              </div>
                              <span className="text-slate-600 font-medium">{shop.ownerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                              {shop.jobsCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500 font-mono">
                            ₹{shop.averageOrderValue}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono text-base">
                            ₹{shop.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---- Subcomponents ----

function KpiCard({ label, value, icon, trend, color }: any) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
    orange: 'bg-orange-50 text-orange-600 ring-1 ring-orange-100',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 flex items-start justify-between group">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-2">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{value}</h3>
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp size={14} className="text-green-500" />
          <p className="text-xs text-slate-500 font-medium">{trend}</p>
        </div>
      </div>
      <div className={`p-4 rounded-xl ${colors[color]} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    }`}>
      {icon}
      {label}
    </button>
  );
}

import React, { useState, useEffect } from 'react';
import { Users, Files, HardDrive, TrendingUp, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { AdminStatsResponse } from '../../types';
import { AdminStatsSkeleton, TableSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { formatFileSize } from '../../utils/formatting';
import { adminApi } from '../../lib/api';

interface AdminStatsProps {
  onViewAllFiles?: () => void;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export const AdminStats: React.FC<AdminStatsProps> = ({ onViewAllFiles }) => {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const adminStats = await adminApi.getStats();
        setStats(adminStats);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const adminStats = await adminApi.getStats();
      setStats(adminStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing admin stats:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={5} cols={2} />
          <TableSkeleton rows={5} cols={3} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load admin statistics</p>
        <Button variant="secondary" onClick={handleRefresh} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const kpiCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.total_users.toLocaleString(),
      bgLight: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: Files,
      label: 'Total Files',
      value: stats.total_files.toLocaleString(),
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      icon: HardDrive,
      label: 'Storage Used',
      value: formatFileSize(stats.total_size_bytes),
      bgLight: 'bg-violet-50 dark:bg-violet-900/20',
      iconColor: 'text-violet-600 dark:text-violet-400'
    },
    {
      icon: TrendingUp,
      label: 'Quota Usage',
      value: stats.quota_utilization_percent ? `${stats.quota_utilization_percent.toFixed(1)}%` : 'N/A',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600 dark:text-amber-400'
    }
  ];

  // Prepare pie chart data
  const pieData = Object.entries(stats.files_by_type || {}).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));
  const totalFiles = pieData.reduce((sum, item) => sum + item.value, 0);

  // Prepare storage by user data (sorted)
  const sortedUsers = (stats.storage_by_user || [])
    .sort((a, b) => b.total_size_bytes - a.total_size_bytes);
  const maxStorage = sortedUsers[0]?.total_size_bytes || 1;

  // Prepare registration data - group by month for all-time data
  const registrationData = stats.users_by_registration_date || [];
  
  // Group registrations by month
  const monthlyData = registrationData.reduce((acc, item) => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = { monthKey, monthLabel, users: 0 };
    }
    acc[monthKey].users += item.count;
    return acc;
  }, {} as Record<string, { monthKey: string; monthLabel: string; users: number }>);

  // Sort by month and get last 12 months or all available
  const sortedMonthlyData = Object.values(monthlyData)
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-12); // Show last 12 months max

  // If we have daily data for less than 60 days, show daily, otherwise show monthly
  const showMonthly = registrationData.length > 60 || sortedMonthlyData.length > 2;
  
  const chartData = showMonthly 
    ? sortedMonthlyData.map(item => ({
        date: item.monthLabel,
        fullDate: item.monthKey,
        users: item.users
      }))
    : registrationData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: item.date,
        users: item.count
      }));

  const totalRegistrations = stats.total_user_registrations || registrationData.reduce((sum, d) => sum + d.count, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
  return (
        <div className="bg-white dark:bg-surface-variant border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">{payload[0].value} user{payload[0].value !== 1 ? 's' : ''}</p>
            </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percent = ((payload[0].value / totalFiles) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-surface-variant border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-primary">{payload[0].value} files ({percent}%)</p>
            </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-5 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700"
          >
            <div className="flex items-center gap-2 sm:gap-4">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${card.bgLight} shrink-0`}>
                <card.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.iconColor}`} />
            </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{card.label}</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground truncate">{card.value}</p>
            </div>
          </div>
        </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Files by Type - Donut Chart */}
        {stats.files_by_type && pieData.length > 0 && (
          <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Files by Type</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Distribution of file types</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewAllFiles}
                className="!rounded-full w-fit"
              >
                View All
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center min-h-[200px] sm:min-h-[220px]">
              {/* Donut Chart */}
              <div className="w-40 h-40 sm:w-56 sm:h-56 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="45%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                    </div>
              {/* Legend */}
              <div className="flex-1 w-full sm:w-auto sm:ml-4 mt-4 sm:mt-0 space-y-1.5 sm:space-y-2 max-h-40 sm:max-h-56 overflow-y-auto custom-scrollbar">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {item.value}
                    </span>
                            </div>
                ))}
                            </div>
            </div>

            {/* Footer Stats */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4 sm:gap-6 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                    Total: <span className="text-foreground font-medium">{totalFiles.toLocaleString()}</span>
                    </span>
                    <span>
                    Types: <span className="text-foreground font-medium">{pieData.length}</span>
                    </span>
                  </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {lastUpdated && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                <Button
                    variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                    className="!rounded-full"
                >
                    <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline ml-1.5">Refresh</span>
                </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Storage by User - Scrollable List Style */}
        {stats.storage_by_user && sortedUsers.length > 0 && (
          <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-foreground">Storage by User</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Top storage consumers</p>
            </div>
            <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {sortedUsers.map((user, index) => {
                const barWidth = (user.total_size_bytes / maxStorage) * 100;
                  return (
                  <div key={user.user_id} className="space-y-1 sm:space-y-1.5">
                    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 truncate">
                        {user.user_email}
                      </div>
                    <div className="relative bg-gray-100 dark:bg-gray-800 rounded-md sm:rounded-lg h-6 sm:h-7 overflow-hidden">
                        <div
                        className="h-full rounded-md sm:rounded-lg transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(barWidth, 8)}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      />
                      <span className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-[10px] sm:text-xs font-medium text-foreground">
                          {formatFileSize(user.total_size_bytes)}
                        </span>
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Registrations Chart */}
      {stats.users_by_registration_date && chartData.length > 0 && (
        <div className="bg-white dark:bg-surface border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground">User Registrations</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {showMonthly ? 'Monthly registrations (last 12 months)' : 'New users over time'}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {lastUpdated && (
                <span className="text-xs text-gray-400 hidden sm:block">
                  Updated {lastUpdated.toLocaleTimeString()}
                  </span>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="!rounded-full"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-1.5">Refresh</span>
              </Button>
            </div>
            </div>

          {/* Use Bar Chart when only 1-2 data points, Area Chart otherwise */}
          <div className="h-48 sm:h-64">
            {chartData.length <= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                  <Bar dataKey="users" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-500 dark:text-gray-400"
                    axisLine={false}
                    tickLine={false}
                    width={24}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                          stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
              </div>

          {/* Summary */}
          <div className="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total Registrations</p>
              <p className="text-base sm:text-lg font-semibold text-foreground">
                {totalRegistrations.toLocaleString()}
              </p>
                    </div>
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {showMonthly ? 'Months Shown' : 'Days'}
              </p>
              <p className="text-base sm:text-lg font-semibold text-foreground">
                {chartData.length}
              </p>
              </div>
            {showMonthly && registrationData.length > 0 && (
              <div className="hidden sm:block">
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Period</p>
                <p className="text-base sm:text-lg font-semibold text-foreground">
                  {new Date(registrationData[0].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {new Date(registrationData[registrationData.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

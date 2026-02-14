import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Shield, LogOut, Home, Settings, Search, Menu, Database, File, Globe } from 'lucide-react';
import { useQuery } from '@apollo/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UserProfileModal } from './UserProfileModal';
import { SearchDropdown } from '../common/SearchDropdown';
import { PreviewModal } from '../files/PreviewModal';
import { MY_STATS } from '../../graphql';
import { StatsResponse, FileItem } from '../../types';
import { formatFileSize } from '../../utils/formatting';
import { filesApi } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

const STATS_CACHE_KEY = 'sv.stats.cache';

// Get cached stats from localStorage
const getCachedStats = (): StatsResponse | null => {
  try {
    const cached = localStorage.getItem(STATS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Ignore parse errors
  }
  return null;
};

// Save stats to localStorage
const setCachedStats = (stats: StatsResponse) => {
  try {
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage errors
  }
};

// Clear stats cache (call on logout)
export const clearStatsCache = () => {
  localStorage.removeItem(STATS_CACHE_KEY);
};

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { addToast } = useToast();
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement>(null);

  // Initialize with cached stats
  const [cachedStats, setCachedStatsState] = useState<StatsResponse | null>(getCachedStats);

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery(MY_STATS, {
    errorPolicy: 'all',
    fetchPolicy: 'network-only', // Always fetch fresh data from network
    notifyOnNetworkStatusChange: true,
  });

  // Use fresh stats if available, otherwise use cached
  const freshStats: StatsResponse | null = statsData?.stats || null;
  const stats = freshStats || cachedStats;

  // Cache stats when we get fresh data
  useEffect(() => {
    if (freshStats) {
      setCachedStats(freshStats);
      setCachedStatsState(freshStats);
    }
  }, [freshStats]);

  // Refetch stats on mount to ensure fresh data on first load
  useEffect(() => {
    // Small delay to ensure auth token is available
    const timer = setTimeout(() => {
      refetchStats();
    }, 100);
    return () => clearTimeout(timer);
  }, [refetchStats]);

  // Handle logout - clear cache
  const handleLogout = () => {
    clearStatsCache();
    logout();
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownload = async (file: FileItem) => {
    try {
      const blob = await filesApi.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast('success', `Downloaded ${file.original_filename}`);
    } catch {
      addToast('error', 'Failed to download file');
    }
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isSharedPage = location.pathname === '/app/shared';

  const quotaUsed = stats?.quota_used_bytes || stats?.total_size_bytes || 0;
  const quotaTotal = stats?.quota_bytes || 104857600;
  const quotaPercent = Math.min((quotaUsed / quotaTotal) * 100, 100);

  const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: React.ElementType; label: string; active: boolean }) => (
    <Link
      to={to}
      className={`flex items-center px-4 py-2.5 rounded-xl mb-1 transition-all ${active
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      <Icon className={`h-5 w-5 mr-3 shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 sm:h-16 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-700 flex items-center px-3 sm:px-4 justify-between shrink-0 z-50 shadow-sm">
        <div className="flex items-center min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-full hover:bg-white/10 mr-1 sm:mr-2 transition-colors active:scale-95 shrink-0"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </button>
          <Link to="/app" className="flex items-center min-w-0">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white mr-1.5 sm:mr-2 shrink-0" />
            <span className="text-lg sm:text-xl font-medium text-white truncate hidden xs:block">SecureVault</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs sm:max-w-md lg:max-w-2xl mx-2 sm:mx-4 relative" ref={searchAnchorRef}>
          <div
            onClick={() => setSearchOpen(true)}
            className="bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900 transition-colors rounded-full h-9 sm:h-11 flex items-center px-3 sm:px-4 cursor-text w-full shadow-sm"
          >
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 mr-2 sm:mr-3 shrink-0" />
            <span className="text-gray-500 text-sm sm:text-base truncate">Search...</span>
            <span className="ml-auto text-xs text-gray-400 hidden md:block shrink-0">⌘K</span>
          </div>

          <SearchDropdown
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onDownload={handleDownload}
            onPreview={(file) => setPreviewFile(file)}
            anchorRef={searchAnchorRef}
          />
        </div>

        <div className="flex items-center shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setShowUserProfile(true)}
            className="p-1 rounded-full hover:bg-white/10 ml-1 sm:ml-2 transition-colors active:scale-95"
          >
            <div className="relative">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/20 text-white flex items-center justify-center text-xs sm:text-sm font-medium border-2 border-white/30">
                {user.email?.[0].toUpperCase()}
              </div>
              {isAdmin && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 rounded-full flex items-center justify-center">
                  <Settings className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                </span>
              )}
            </div>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay (mobile) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-40 
            bg-background flex-shrink-0 
            transition-transform duration-300 ease-in-out 
            border-r border-gray-200 dark:border-gray-800 
            w-64 lg:w-60 xl:w-64
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            lg:top-0 top-14
          `}
        >
          <div className="p-3 sm:p-4 w-full h-full flex flex-col overflow-y-auto">
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              {/* <X className="h-5 w-5" /> */}
            </button>

            {/* Navigation */}
            <nav className="mb-4 sm:mb-6 mt-6 lg:mt-0">
              <NavItem
                to="/app"
                icon={Home}
                label="Home"
                active={location.pathname === '/app' || (location.pathname.startsWith('/app/folder') && !isSharedPage)}
              />
              <NavItem
                to="/app/shared"
                icon={Globe}
                label="Shared Files"
                active={isSharedPage}
              />
              {isAdmin && (
                <NavItem
                  to="/admin"
                  icon={Settings}
                  label="Admin Console"
                  active={isAdminPage}
                />
              )}
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Storage Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-blue-100 dark:border-gray-700">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Storage</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stats ? `${quotaPercent.toFixed(0)}% used` : 'Loading...'}
                  </p>
                </div>
              </div>

              {statsLoading && !stats ? (
                <div className="space-y-2">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 animate-pulse" />
                  <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-24 animate-pulse" />
                </div>
              ) : stats ? (
                <>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${quotaPercent > 90 ? 'bg-red-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                      style={{ width: `${Math.max(quotaPercent, 1)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {formatFileSize(quotaUsed)} of {formatFileSize(quotaTotal)}
                  </p>

                  {/* Stats Row */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-blue-100 dark:border-gray-700">
                    <File className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Total Files : {stats.total_files || 0} files
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2" />
                  <p className="text-xs text-gray-400">No data available</p>
                </div>
              )}
            </div>

            {/* User Info & Logout */}
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 px-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium shrink-0">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  {isAdmin && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Admin</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 h-9 sm:h-10"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                <span className="text-sm">Sign out</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content - Fixed height with internal scroll */}
        <main className="flex-1 bg-surface overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        stats={stats}
        statsLoading={statsLoading}
      />

      {/* Preview Modal from Search */}
      <PreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};

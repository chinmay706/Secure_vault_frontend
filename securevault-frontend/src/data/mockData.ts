import { User, FileItem, FolderItem, AdminStatsResponse, StatsResponse } from '../types';

// Mock current user
export const mockUser: User = {
  id: 'user-123',
  email: 'john.doe@example.com',
  role: 'user',
  rate_limit_rps: 10,
  storage_quota_bytes: 5368709120, // 5GB
  created_at: '2024-01-15T10:00:00Z'
};

// Mock admin user
export const mockAdminUser: User = {
  id: 'admin-456',
  email: 'admin@securevault.com',
  role: 'admin',
  rate_limit_rps: 100,
  storage_quota_bytes: 53687091200, // 50GB
  created_at: '2024-01-01T00:00:00Z'
};

// Mock folders
export const mockFolders: FolderItem[] = [
  {
    id: 'folder-1',
    owner_id: 'user-123',
    name: 'Documents',
    parent_id: null,
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T09:00:00Z',
    share_link: {
      token: 'share-folder-1',
      is_active: true,
      download_count: 5,
      created_at: '2024-01-21T10:00:00Z'
    }
  },
  {
    id: 'folder-2',
    owner_id: 'user-123',
    name: 'Images',
    parent_id: null,
    created_at: '2024-01-22T11:00:00Z',
    updated_at: '2024-01-22T11:00:00Z',
    share_link: null
  },
  {
    id: 'folder-3',
    owner_id: 'user-123',
    name: 'Work Projects',
    parent_id: 'folder-1',
    created_at: '2024-01-23T14:00:00Z',
    updated_at: '2024-01-23T14:00:00Z',
    share_link: null
  }
];

// Mock files
export const mockFiles: FileItem[] = [
  {
    id: 'file-1',
    owner_id: 'user-123',
    original_filename: 'presentation.pdf',
    mime_type: 'application/pdf',
    size_bytes: 2456789,
    folder_id: 'folder-1',
    is_public: true,
    download_count: 12,
    tags: ['work', 'presentation'],
    created_at: '2024-01-20T15:30:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    share_link: {
      token: 'share-file-1',
      is_active: true,
      download_count: 12,
      created_at: '2024-01-20T16:00:00Z'
    },
    owner_email: 'john.doe@example.com'
  },
  {
    id: 'file-2',
    owner_id: 'user-123',
    original_filename: 'vacation-photo.jpg',
    mime_type: 'image/jpeg',
    size_bytes: 3847562,
    folder_id: 'folder-2',
    is_public: false,
    download_count: 3,
    tags: ['personal', 'vacation'],
    created_at: '2024-01-22T12:15:00Z',
    updated_at: '2024-01-22T12:15:00Z',
    share_link: null,
    owner_email: 'john.doe@example.com'
  },
  {
    id: 'file-3',
    owner_id: 'user-123',
    original_filename: 'report.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size_bytes: 897643,
    folder_id: 'folder-3',
    is_public: false,
    download_count: 8,
    tags: ['work', 'report'],
    created_at: '2024-01-23T16:45:00Z',
    updated_at: '2024-01-23T16:45:00Z',
    share_link: null,
    owner_email: 'john.doe@example.com'
  },
  {
    id: 'file-4',
    owner_id: 'admin-456',
    original_filename: 'system-config.txt',
    mime_type: 'text/plain',
    size_bytes: 15234,
    folder_id: null,
    is_public: false,
    download_count: 1,
    tags: ['system', 'config'],
    created_at: '2024-01-24T08:00:00Z',
    updated_at: '2024-01-24T08:00:00Z',
    share_link: null,
    owner_email: 'admin@securevault.com'
  }
];

// Mock user stats
export const mockUserStats: StatsResponse = {
  total_files: 15,
  total_size_bytes: 156789432, // ~150MB
  quota_bytes: 5368709120, // 5GB
  quota_used_bytes: 156789432,
  quota_available_bytes: 5211919688,
  files_by_type: [
    { mime_type: 'application/pdf', count: 5 },
    { mime_type: 'image/jpeg', count: 8 },
    { mime_type: 'text/plain', count: 2 }
  ],
  upload_history: [
    { date: '2024-01-20', count: 3 },
    { date: '2024-01-21', count: 5 },
    { date: '2024-01-22', count: 2 },
    { date: '2024-01-23', count: 4 },
    { date: '2024-01-24', count: 1 }
  ]
};

// Mock admin stats
export const mockAdminStats: AdminStatsResponse = {
  total_users: 247,
  total_files: 3456,
  total_size_bytes: 145678901234, // ~136GB
  total_quota_bytes: 536870912000, // 500GB
  quota_utilization_percent: 27.1,
  files_by_type: [
    { mime_type: 'application/pdf', count: 892 },
    { mime_type: 'image/jpeg', count: 1245 },
    { mime_type: 'image/png', count: 567 },
    { mime_type: 'text/plain', count: 234 },
    { mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', count: 345 },
    { mime_type: 'video/mp4', count: 173 }
  ],
  users_by_date: [
    { date: '2024-01-20', count: 12 },
    { date: '2024-01-21', count: 8 },
    { date: '2024-01-22', count: 15 },
    { date: '2024-01-23', count: 6 },
    { date: '2024-01-24', count: 9 }
  ],
  storage_by_user: [
    {
      user_id: 'user-123',
      user_email: 'john.doe@example.com',
      file_count: 15,
      total_size_bytes: 156789432,
      quota_bytes: 5368709120
    },
    {
      user_id: 'user-234',
      user_email: 'jane.smith@example.com',
      file_count: 23,
      total_size_bytes: 234567890,
      quota_bytes: 5368709120
    },
    {
      user_id: 'user-345',
      user_email: 'bob.wilson@example.com',
      file_count: 8,
      total_size_bytes: 89012345,
      quota_bytes: 2684354560
    }
  ]
};
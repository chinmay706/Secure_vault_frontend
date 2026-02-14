export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  rate_limit_rps?: number;
  storage_quota_bytes?: number;
  created_at?: string;
}

export interface ShareLink {
  id?: string;
  token: string;
  is_active: boolean;
  download_count?: number;
  created_at?: string;
}

export interface FileItem {
  id: string;
  owner_id?: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  folder_id?: string | null;
  is_public: boolean;
  download_count?: number;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  share_link?: ShareLink | null;
  owner_email?: string;
}

export interface FolderItem {
  id: string;
  owner_id?: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  share_link?: ShareLink | null;
}

export interface FileListResponse {
  files: FileItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface FolderPaginationInfo {
  page: number;
  page_size: number;
  total_folders: number;
  total_files: number;
  has_more: boolean;
}

export interface FolderChildrenResponse {
  folders: FolderItem[];
  files: FileItem[];
  pagination: FolderPaginationInfo;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FolderDetailsResponse {
  folder: FolderItem;
  breadcrumbs: BreadcrumbItem[];
}

export interface StatsResponse {
  total_files: number;
  total_size_bytes: number;
  quota_bytes?: number;
  quota_used_bytes?: number;
  quota_available_bytes?: number;
  files_by_type?: { mime_type: string; count: number }[];
  upload_history?: { date: string; count: number }[];
}

export interface AdminFilesResponse {
  files: AdminFileItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface AdminFileItem {
  id: string;
  filename: string;
  size: number;
  mime_type: string;
  upload_date: string;
  user_email: string;
  user_id: string;
  is_public: boolean;
  download_count: number;
}

export interface AdminStatsResponse {
  total_users: number;
  total_files: number;
  total_size_bytes: number;
  total_quota_bytes?: number;
  quota_utilization_percent?: number;
  files_by_type?: Record<string, number>;
  total_user_registrations?: number;
  users_by_registration_date?: { date: string; count: number }[];
  storage_by_user?: {
    user_id: string;
    user_email: string;
    file_count: number;
    total_size_bytes: number;
    quota_bytes?: number;
  }[];
  most_active_users?: {
    user_id: string;
    user_email: string;
    file_count: number;
    last_upload?: string;
    total_downloads?: number;
  }[];
}

export interface PublicFileItem {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  tags?: string[];
  download_url: string;
  created_at: string;
  updated_at: string;
}

export interface PublicFilesResponse {
  files: PublicFileItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface AuthPayload {
  token: string;
  user: User;
}

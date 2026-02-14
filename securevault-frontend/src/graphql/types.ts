/**
 * TypeScript interfaces mirroring GraphQL schema from PRD-GraphQL.md
 * All fields use snake_case to match backend schema exactly
 */

// Base scalar types
export type UUID = string;
export type DateTime = string;

// User type (subset surfaced in REST responses)
export interface User {
  id: string;
  email: string;
  role: "user" | "admin";
  rate_limit_rps?: number;
  storage_quota_bytes?: number;
  created_at?: string; // ISO
}

// ShareLink type (unified for both file and folder sharing)
export interface ShareLink {
  id?: string; // may be omitted in some resolvers
  token: string;
  is_active: boolean;
  download_count?: number;
  created_at?: string; // ISO
}

// File type
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
}

// Folder type
export interface FolderItem {
  id: string;
  owner_id?: string;
  name: string;
  parent_id?: string | null;
  created_at?: string;
  updated_at?: string;
  share_link?: ShareLink | null;
}

// Authentication payload
export interface AuthPayload {
  token: string;
  user: User;
}

// Statistics response types
export interface FilesByType {
  mime_type: string;
  count: number;
}

export interface UploadHistoryEntry {
  date: string;
  count: number;
}

export interface StatsResponse {
  total_files: number;
  total_size_bytes: number;
  quota_bytes?: number;
  quota_used_bytes?: number;
  quota_available_bytes?: number;
  files_by_type?: FilesByType[];
  upload_history?: UploadHistoryEntry[];
}

// List and pagination response types
export interface FileListResponse {
  files: FileItem[];
  page: number;
  page_size: number;
  total: number;
}

// Breadcrumb type for folder navigation
export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FolderDetailsResponse {
  folder: FolderItem;
  breadcrumbs: BreadcrumbItem[];
}

// Folder children and pagination
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

// Admin response types
export interface AdminPagination {
  page: number;
  page_size: number;
  total: number;
}

export interface AdminFileItem {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  upload_date?: string; // created_at alias
  user_email?: string; // owner_email alias
  is_public: boolean;
  download_count?: number;
}

export interface AdminFilesResponse {
  files: AdminFileItem[];
  pagination: AdminPagination;
}

export interface AdminUserStats {
  user_id: string;
  user_email: string;
  file_count: number;
  total_size_bytes: number;
  quota_bytes?: number;
}

export interface AdminStatsResponse {
  total_users: number;
  total_files: number;
  total_size_bytes: number;
  total_quota_bytes?: number;
  quota_utilization_percent?: number;
  files_by_type?: FilesByType[];
  users_by_date?: UploadHistoryEntry[];
  storage_by_user?: AdminUserStats[];
}

// Query variable types
export interface FilesQueryVariables {
  filename?: string;
  mime_type?: string;
  folder_id?: UUID | "root";
  tags?: string[];
  page?: number;
  page_size?: number;
}

export interface StatsQueryVariables {
  from?: string;
  to?: string;
  group_by?: "day" | "week" | "month";
}

export interface AdminFilesQueryVariables {
  user_email?: string;
  filename?: string;
  mime_type?: string;
  page?: number;
  page_size?: number;
}

// Mutation variable types
export interface ToggleFilePublicVariables {
  id: UUID;
  is_public: boolean;
}

export interface MoveFileVariables {
  file_id: UUID;
  folder_id: UUID | null;
}

export interface CreateFolderVariables {
  name: string;
  parent_id?: UUID | null;
}

export interface UpdateFolderVariables {
  id: UUID;
  name: string;
}

export interface MoveFolderVariables {
  id: UUID;
  parent_id: UUID | null;
}

export interface DeleteFolderVariables {
  id: UUID;
  recursive?: boolean;
}

/**
 * Centralized GraphQL queries mirroring PRD-GraphQL.md operations
 * All field names use snake_case to match backend schema
 */

import { gql } from "@apollo/client";

// 1. Hello (no auth required)
export const HELLO = gql`
  query Hello {
    hello
  }
`;

// 2. Me (current user info)
export const ME = gql`
  query Me {
    me {
      id
      email
      role
      storage_quota_bytes
      rate_limit_rps
      created_at
    }
  }
`;

// 3. My Stats (current user stats with filters)
export const MY_STATS = gql`
  query GetMyStats($from: String, $to: String, $group_by: String) {
    stats(from: $from, to: $to, group_by: $group_by) {
      total_files
      total_size_bytes
      quota_bytes
      quota_used_bytes
      quota_available_bytes
      files_by_type {
        mime_type
        count
      }
      upload_history {
        date
        count
      }
    }
  }
`;

// 4. Files (list user's files with filters and pagination)
export const FILES = gql`
  query Files(
    $filename: String
    $mime_type: String
    $folder_id: UUID
    $tags: String
    $page: Int
    $page_size: Int
  ) {
    files(
      filename: $filename
      mime_type: $mime_type
      folder_id: $folder_id
      tags: $tags
      page: $page
      page_size: $page_size
    ) {
      files {
        id
        original_filename
        mime_type
        size_bytes
        folder_id
        is_public
        download_count
        tags
        created_at
        updated_at
        share_link {
          token
          is_active
          download_count
          created_at
        }
      }
      page
      page_size
      total
    }
  }
`;

// 5. File (single file details)
export const FILE = gql`
  query File($id: UUID!) {
    file(id: $id) {
      id
      original_filename
      mime_type
      size_bytes
      folder_id
      is_public
      download_count
      tags
      created_at
      updated_at
      share_link {
        token
        is_active
      }
    }
  }
`;

// 5a. Search Files (alias for FILES query with search-specific naming)
export const SEARCH_FILES = gql`
  query SearchFiles(
    $filename: String
    $mime_type: String
    $tags: String
    $page: Int
    $page_size: Int
  ) {
    files(
      filename: $filename
      mime_type: $mime_type
      tags: $tags
      page: $page
      page_size: $page_size
    ) {
      files {
        id
        original_filename
        mime_type
        size_bytes
        folder_id
        is_public
        download_count
        tags
        created_at
        updated_at
        share_link {
          token
          is_active
          download_count
          created_at
        }
      }
      page
      page_size
      total
    }
  }
`;

// 6. Folders Only (simple query to get just folders - avoids complex SQL)
export const FOLDERS_ONLY = gql`
  query FoldersOnly($parent_id: UUID) {
    foldersOnly(parent_id: $parent_id) {
      id
      name
      parent_id
      created_at
      updated_at
    }
  }
`;

// 6.1. All Folders (flat list for tree rendering)
export const GET_ALL_FOLDERS = gql`
  query GetAllFolders {
    allFolders {
      id
      name
      parent_id
      created_at
      updated_at
    }
  }
`;

// 6a. Files in Folder (list files in a specific folder)
export const FILES_IN_FOLDER = gql`
  query FilesInFolder($folder_id: UUID, $page: Int, $page_size: Int) {
    files(folder_id: $folder_id, page: $page, page_size: $page_size) {
      files {
        id
        original_filename
        mime_type
        size_bytes
        folder_id
        is_public
        download_count
        tags
        created_at
        updated_at
        share_link {
          token
          is_active
          download_count
          created_at
        }
      }
      page
      page_size
      total
    }
  }
`;

// 6b. GetRootContents (list root files only - simplified approach to avoid complex SQL)
export const GET_ROOT_CONTENTS = gql`
  query GetRootContents {
    files(folder_id: null, page: 1, page_size: 1000) {
      files {
        id
        original_filename
        mime_type
        size_bytes
        folder_id
        is_public
        download_count
        tags
        created_at
        updated_at
        share_link {
          token
          is_active
          download_count
          created_at
        }
      }
      page
      page_size
      total
    }
  }
`;

// 7. Folder (folder details + breadcrumbs)
export const FOLDER = gql`
  query Folder($id: UUID!) {
    folder(id: $id) {
      folder {
        id
        name
        parent_id
        share_link {
          token
          is_active
        }
      }
      breadcrumbs {
        id
        name
      }
    }
  }
`;

// 8. Public File (no auth required)
export const PUBLIC_FILE = gql`
  query PublicFile($token: String!) {
    publicFile(token: $token) {
      id
      original_filename
      mime_type
      size_bytes
      is_public
      share_link {
        token
        is_active
      }
    }
  }
`;

// 9. Public Folder (no auth required)
export const PUBLIC_FOLDER = gql`
  query PublicFolder($token: String!) {
    publicFolder(token: $token) {
      folders {
        id
        name
        share_link {
          token
          is_active
        }
      }
      files {
        id
        original_filename
        mime_type
        size_bytes
        is_public
        share_link {
          token
          is_active
        }
      }
      pagination {
        page
        page_size
        total_folders
        total_files
        has_more
      }
    }
  }
`;

// 10. Admin Stats (admin only)
export const ADMIN_STATS = gql`
  query AdminStats {
    adminStats {
      total_users
      total_files
      total_size_bytes
      total_quota_bytes
      quota_utilization_percent
      files_by_type {
        mime_type
        count
      }
      users_by_date {
        date
        count
      }
      storage_by_user {
        user_id
        user_email
        file_count
        total_size_bytes
        quota_bytes
      }
    }
  }
`;

// 11. Admin Files (admin only)
export const ADMIN_FILES = gql`
  query AdminFiles(
    $page: Int
    $page_size: Int
    $user_email: String
    $filename: String
    $mime_type: String
  ) {
    adminFiles(
      page: $page
      page_size: $page_size
      user_email: $user_email
      filename: $filename
      mime_type: $mime_type
    ) {
      files {
        id
        original_filename
        mime_type
        size_bytes
        upload_date
        user_email
        is_public
        download_count
      }
      pagination {
        page
        page_size
        total
      }
    }
  }
`;

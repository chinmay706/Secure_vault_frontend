/**
 * Centralized GraphQL mutations mirroring PRD-GraphQL.md operations
 * All field names use snake_case to match backend schema
 */

import { gql } from "@apollo/client";

// 1. Signup
export const SIGNUP = gql`
  mutation Signup($email: String!, $password: String!) {
    signup(email: $email, password: $password) {
      token
      user {
        id
        email
        role
      }
    }
  }
`;

// 2. Login
export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        role
      }
    }
  }
`;

// 3. Toggle File Public
export const TOGGLE_FILE_PUBLIC = gql`
  mutation ToggleFilePublic($id: UUID!, $is_public: Boolean!) {
    toggleFilePublic(id: $id, is_public: $is_public) {
      id
      is_public
      share_link {
        token
        is_active
        download_count
        created_at
      }
    }
  }
`;

// 4. Delete File
export const DELETE_FILE = gql`
  mutation DeleteFile($id: UUID!) {
    deleteFile(id: $id)
  }
`;

// 5. Move File
export const MOVE_FILE = gql`
  mutation MoveFile($file_id: UUID!, $folder_id: UUID) {
    moveFile(file_id: $file_id, folder_id: $folder_id) {
      id
      original_filename
      folder_id
      updated_at
    }
  }
`;

// 6. Create Folder
export const CREATE_FOLDER = gql`
  mutation CreateFolder($name: String!, $parent_id: UUID) {
    createFolder(name: $name, parent_id: $parent_id) {
      id
      name
      parent_id
      share_link {
        token
        is_active
      }
    }
  }
`;

// 7. Update Folder (rename)
export const UPDATE_FOLDER = gql`
  mutation UpdateFolder($id: UUID!, $name: String) {
    updateFolder(id: $id, name: $name) {
      id
      name
    }
  }
`;

// 8. Move Folder
export const MOVE_FOLDER = gql`
  mutation MoveFolder($id: UUID!, $parent_id: UUID) {
    moveFolder(id: $id, parent_id: $parent_id) {
      id
      parent_id
    }
  }
`;

// 9. Delete Folder
export const DELETE_FOLDER = gql`
  mutation DeleteFolder($id: UUID!, $recursive: Boolean = true) {
    deleteFolder(id: $id, recursive: $recursive)
  }
`;

// 10. Create Folder Share Link
export const CREATE_FOLDER_SHARE_LINK = gql`
  mutation CreateFolderShareLink($id: UUID!) {
    createFolderShareLink(id: $id) {
      token
      is_active
      download_count
      created_at
    }
  }
`;

// 11. Delete Folder Share Link
export const DELETE_FOLDER_SHARE_LINK = gql`
  mutation DeleteFolderShareLink($id: UUID!) {
    deleteFolderShareLink(id: $id)
  }
`;

// 12. Admin Delete File
export const ADMIN_DELETE_FILE = gql`
  mutation AdminDeleteFile($id: UUID!) {
    adminDeleteFile(id: $id)
  }
`;

// 13. Trash File (soft-delete)
export const TRASH_FILE = gql`
  mutation TrashFile($id: UUID!) {
    trashFile(id: $id)
  }
`;

// 14. Trash Folder (soft-delete)
export const TRASH_FOLDER = gql`
  mutation TrashFolder($id: UUID!, $recursive: Boolean = true) {
    trashFolder(id: $id, recursive: $recursive)
  }
`;

// 15. Restore File from Trash
export const RESTORE_FILE = gql`
  mutation RestoreFile($id: UUID!) {
    restoreFile(id: $id) {
      id
      original_filename
      folder_id
    }
  }
`;

// 16. Restore Folder from Trash
export const RESTORE_FOLDER = gql`
  mutation RestoreFolder($id: UUID!) {
    restoreFolder(id: $id) {
      id
      name
      parent_id
    }
  }
`;

// 17. Permanent Delete File (from trash)
export const PERMANENT_DELETE_FILE = gql`
  mutation PermanentDeleteFile($id: UUID!) {
    permanentDeleteFile(id: $id)
  }
`;

// 18. Permanent Delete Folder (from trash)
export const PERMANENT_DELETE_FOLDER = gql`
  mutation PermanentDeleteFolder($id: UUID!) {
    permanentDeleteFolder(id: $id)
  }
`;

// 19. Empty Trash (delete all trashed items)
export const EMPTY_TRASH = gql`
  mutation EmptyTrash {
    emptyTrash
  }
`;

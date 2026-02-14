/**
 * Centralized barrel exports for GraphQL operations
 * Import all GraphQL operations from this single module
 */

// Export all types and interfaces
export * from "./types";

// Export all queries
export * from "./queries";

// Export all mutations
export * from "./mutations";

// Re-export commonly used types for convenience
export type {
  User,
  FileItem,
  FolderItem,
  ShareLink,
  AuthPayload,
  FileListResponse,
  FolderChildrenResponse,
  FolderDetailsResponse,
  StatsResponse,
  AdminStatsResponse,
  AdminFilesResponse,
  TrashResponse,
} from "./types";

// Re-export commonly used Apollo Client types for convenience
export type {
  QueryResult,
  MutationResult,
  LazyQueryResult,
  ApolloError,
  OperationVariables,
} from "@apollo/client";

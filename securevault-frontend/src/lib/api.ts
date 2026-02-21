import { AdminStatsResponse, AdminFilesResponse, AiSummary, ConversionJob } from "../types";

const REST_BASE_URL = import.meta.env.VITE_REST_BASE_URL;

if (!REST_BASE_URL) {
  throw new Error("VITE_REST_BASE_URL is not defined in environment variables");
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("sv.auth.token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Handle API response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `HTTP ${response.status}: ${response.statusText}`
    );
  }
  return response.json();
};

// Auth API
export const authApi = {
  adminSignup: async (email: string, password: string) => {
    const response = await fetch(`${REST_BASE_URL}/admin/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },
};

// User API
export const userApi = {
  changePassword: async (
    userId: string,
    currentPassword: string,
    newPassword: string
  ) => {
    const response = await fetch(`${REST_BASE_URL}/users/${userId}/password`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    return handleResponse(response);
  },

  deleteAccount: async (userId: string) => {
    const response = await fetch(`${REST_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to delete account`);
    }
  },
};

// Files API
export const filesApi = {
  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await fetch(`${REST_BASE_URL}/files/${fileId}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("sv.auth.token")}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to download file`);
    return response.blob();
  },

  updateFileVisibility: async (
    fileId: string,
    isPublic: boolean
  ): Promise<void> => {
    const response = await fetch(
      `${REST_BASE_URL}/files/${fileId}/visibility`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_public: isPublic }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Failed to update visibility`
      );
    }
  },
};

// Folders API
export const foldersApi = {
  removeShareLink: async (folderId: string): Promise<void> => {
    const response = await fetch(`${REST_BASE_URL}/folders/${folderId}/share`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to remove share`);
    }
  },
};

// Admin API
export const adminApi = {
  getStats: async (): Promise<AdminStatsResponse> => {
    const response = await fetch(`${REST_BASE_URL}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getFiles: async (page = 1, pageSize = 20): Promise<AdminFilesResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    const response = await fetch(`${REST_BASE_URL}/admin/files?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// AI Overview API
export const aiApi = {
  generateSummary: async (
    fileId: string,
    force = false
  ): Promise<{ status: string; file_id: string }> => {
    const url = force
      ? `${REST_BASE_URL}/files/${fileId}/ai-summary?force=true`
      : `${REST_BASE_URL}/files/${fileId}/ai-summary`;
    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (response.status === 429) {
      throw new Error("Daily AI summary limit reached. Try again tomorrow.");
    }
    if (!response.ok && response.status !== 202) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || "Failed to generate summary"
      );
    }
    return response.json();
  },

  getSummary: async (fileId: string): Promise<AiSummary> => {
    const response = await fetch(
      `${REST_BASE_URL}/files/${fileId}/ai-summary`,
      { headers: getAuthHeaders() }
    );
    if (response.status === 404) {
      throw new Error("NOT_FOUND");
    }
    if (!response.ok) {
      throw new Error("Failed to fetch summary");
    }
    return response.json();
  },

  refineSummary: async (
    fileId: string,
    command: string
  ): Promise<AiSummary> => {
    const response = await fetch(
      `${REST_BASE_URL}/files/${fileId}/ai-summary/refine`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ command }),
      }
    );
    if (response.status === 429) {
      throw new Error("Daily AI summary limit reached. Try again tomorrow.");
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || "Failed to refine summary"
      );
    }
    return response.json();
  },
};

// File Converter API
export const converterApi = {
  convert: async (
    fileId: string,
    targetFormat: string
  ): Promise<{ id: string; status: string }> => {
    const response = await fetch(`${REST_BASE_URL}/files/${fileId}/convert`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ target_format: targetFormat }),
    });
    if (response.status === 429) {
      throw new Error("Daily limit reached (10/day). Try again tomorrow.");
    }
    if (!response.ok && response.status !== 202) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || "Failed to start conversion"
      );
    }
    return response.json();
  },

  getJob: async (jobId: string): Promise<ConversionJob> => {
    const response = await fetch(`${REST_BASE_URL}/conversions/${jobId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch conversion status");
    }
    return response.json();
  },

  downloadConverted: async (jobId: string): Promise<Blob> => {
    const response = await fetch(
      `${REST_BASE_URL}/conversions/${jobId}/download`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sv.auth.token")}`,
        },
      }
    );
    if (!response.ok) throw new Error("Failed to download converted file");
    return response.blob();
  },

  getHistory: async (): Promise<{ jobs: ConversionJob[] }> => {
    const response = await fetch(`${REST_BASE_URL}/conversions`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch conversion history");
    }
    return response.json();
  },

  deleteJob: async (jobId: string): Promise<void> => {
    const response = await fetch(`${REST_BASE_URL}/conversions/${jobId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || "Failed to delete conversion"
      );
    }
  },
};

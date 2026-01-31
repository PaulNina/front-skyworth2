// API Service for Skyworth Frontend
// Provides HTTP client with JWT authentication for backend calls

import { API_BASE_URL, ApiResponse } from "@/config/api";
import { authService } from "./authService";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, isFormData = false } = options;

    const requestHeaders: Record<string, string> = {
      ...authService.getAuthHeader(),
      ...headers,
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!isFormData && body) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      config.body = isFormData ? (body as FormData) : JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        const loginRoute = authService.getLoginRoute();
        authService.logout();
        window.location.href = loginRoute;
        throw new Error("Sesión expirada. Por favor inicia sesión nuevamente.");
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok && !data.error) {
        return {
          error: true,
          mensaje: `Error ${response.status}: ${response.statusText}`,
          data: null as T,
        };
      }

      return data;
    } catch (error) {
      console.error("API request error:", error);
      return {
        error: true,
        mensaje: error instanceof Error ? error.message : "Error de conexión",
        data: null as T,
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  // POST request
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "POST", body });
  }

  // PUT request
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "PUT", body });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // POST with FormData (for file uploads)
  async postFormData<T>(
    endpoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  }

  // Convenience method for public endpoints (no auth)
  async publicPost<T>(
    endpoint: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (error) {
      console.error("API request error:", error);
      return {
        error: true,
        mensaje: error instanceof Error ? error.message : "Error de conexión",
        data: null as T,
      };
    }
  }

  // Convenience method for public FormData (for file uploads without auth)
  async publicPostFormData<T>(
    endpoint: string,
    formData: FormData,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      const data: ApiResponse<T> = await response.json();
      return data;
    } catch (error) {
      console.error("API request error:", error);
      return {
        error: true,
        mensaje: error instanceof Error ? error.message : "Error de conexión",
        data: null as T,
      };
    }
  }
  // Download Blob (for file exports)
  async downloadBlob(endpoint: string, filename: string): Promise<boolean> {
    const requestHeaders: Record<string, string> = {
      ...authService.getAuthHeader(),
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: requestHeaders,
      });

      if (response.status === 401) {
        const loginRoute = authService.getLoginRoute();
        authService.logout();
        window.location.href = loginRoute;
        throw new Error("Sesión expirada.");
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); // Append to body for Firefox
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      return true;
    } catch (error) {
      console.error("Download error:", error);
      return false;
    }
  }
}

// Singleton instance
export const apiService = new ApiService();
export default apiService;

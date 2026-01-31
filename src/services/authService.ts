// Authentication Service for Skyworth Frontend
// Handles JWT-based authentication with the backend

import {
  API_BASE_URL,
  API_ENDPOINTS,
  ApiResponse,
  LoginResponse,
} from "@/config/api";

const TOKEN_KEY = "skyworth_token";
const USER_KEY = "skyworth_user";

export interface StoredUser {
  email: string;
  nombre: string;
  rol: "ADMIN" | "VENDEDOR";
}

class AuthService {
  private token: string | null = null;
  private user: StoredUser | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      this.token = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        this.user = JSON.parse(userStr);
      }
    } catch (error) {
      console.error("Error loading auth from storage:", error);
      this.clearStorage();
    }
  }

  private saveToStorage(token: string, user: StoredUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token = token;
    this.user = user;
  }

  private clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token = null;
    this.user = null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ error: Error | null; data?: LoginResponse }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
      );

      const result: ApiResponse<LoginResponse> = await response.json();

      if (result.error || !response.ok) {
        return {
          error: new Error(result.mensaje || "Error al iniciar sesión"),
        };
      }

      const { token, email: userEmail, nombre, rol } = result.data;
      this.saveToStorage(token, { email: userEmail, nombre, rol });

      return { error: null, data: result.data };
    } catch (error) {
      console.error("Login error:", error);
      return {
        error: error instanceof Error ? error : new Error("Error de conexión"),
      };
    }
  }

  logout(): void {
    this.clearStorage();
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): StoredUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    return this.user?.rol === "ADMIN";
  }

  isSeller(): boolean {
    return this.user?.rol === "VENDEDOR";
  }

  // Get authorization header for API requests
  getAuthHeader(): Record<string, string> {
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    return {};
  }

  // Get the appropriate login route based on user role
  getLoginRoute(): string {
    if (this.user?.rol === "ADMIN") {
      return "/admin";
    }
    if (this.user?.rol === "VENDEDOR") {
      return "/ventas";
    }
    return "/login"; // fallback genérico
  }
}

// Singleton instance
export const authService = new AuthService();
export default authService;

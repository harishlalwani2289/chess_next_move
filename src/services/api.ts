const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types for API responses
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ChessBoard {
  _id: string;
  userId: string;
  name: string;
  fen: string;
  gameState: {
    fen: string;
    turn: 'w' | 'b';
    castling: string;
    enPassant: string;
    halfMove: number;
    fullMove: number;
  };
  analysisResults: Array<{
    bestMove: string;
    evaluation: number;
    principalVariation: string;
    depth: number;
    timestamp: string;
  }>;
  pgn?: string;
  gameHistory: Array<{
    move: string;
    fen: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

class ApiService {
  private getAuthHeader(): { Authorization?: string } {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/profile');
  }

  async updateProfile(profileData: {
    name: string;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Chess board endpoints
  async getChessBoards(page = 1, limit = 10): Promise<ApiResponse<{
    chessBoards: ChessBoard[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalBoards: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    return this.request<any>(`/chess-boards?page=${page}&limit=${limit}`);
  }

  async getChessBoard(boardId: string): Promise<ApiResponse<{ chessBoard: ChessBoard }>> {
    return this.request<{ chessBoard: ChessBoard }>(`/chess-boards/${boardId}`);
  }

  async createChessBoard(boardData: {
    name: string;
    fen?: string;
    gameState?: any;
    pgn?: string;
  }): Promise<ApiResponse<{ chessBoard: ChessBoard }>> {
    return this.request<{ chessBoard: ChessBoard }>('/chess-boards', {
      method: 'POST',
      body: JSON.stringify(boardData),
    });
  }

  async updateChessBoard(boardId: string, updateData: any): Promise<ApiResponse<{ chessBoard: ChessBoard }>> {
    return this.request<{ chessBoard: ChessBoard }>(`/chess-boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteChessBoard(boardId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/chess-boards/${boardId}`, {
      method: 'DELETE',
    });
  }

  async addAnalysisResult(boardId: string, analysisData: {
    bestMove: string;
    evaluation: number;
    principalVariation?: string;
    depth?: number;
  }): Promise<ApiResponse<{ chessBoard: ChessBoard }>> {
    return this.request<{ chessBoard: ChessBoard }>(`/chess-boards/${boardId}/analysis`, {
      method: 'POST',
      body: JSON.stringify(analysisData),
    });
  }

  // Helper methods
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

export const apiService = new ApiService();
export default apiService;

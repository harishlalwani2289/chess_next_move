export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
}

export interface AnalysisResult {
  bestMove: string;
  evaluation: string;
  principalVariation: string;
  moveNumber: number;
  aiExplanation?: {
    explanation: string;
    provider: string;
    confidence?: number;
    loading?: boolean;
    error?: string;
  };
}

export interface GameState {
  fen: string;
  turn: 'w' | 'b';
  castlingRights: {
    whiteKingSide: boolean;
    whiteQueenSide: boolean;
    blackKingSide: boolean;
    blackQueenSide: boolean;
  };
}

export interface HistoryState extends GameState {
  position: string;
}

export interface EngineOptions {
  thinkTime: number;
  mode: 'show' | 'make';
  depth?: number;
}

export interface AISettings {
  geminiApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  groqApiKey: string;
}

export interface PGNGame {
  headers: Record<string, string>;
  moves: string[];
  result: string;
}

export interface GameInformation {
  white?: string;
  black?: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
}

export type BoardTheme = 'brown' | 'blue' | 'green' | 'purple' | 'wood';
export type PieceSet = 'cburnett' | 'merida' | 'alpha' | 'leipzig' | 'pirouetti';

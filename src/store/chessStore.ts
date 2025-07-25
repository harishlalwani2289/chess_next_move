import { create } from 'zustand';
import { Chess } from 'chess.js';
import { GameState, HistoryState, AnalysisResult, EngineOptions, AISettings, BoardTheme, PieceSet } from '../types/chess';

interface ChessStore {
  // Game state
  game: Chess;
  gameState: GameState;
  moveHistory: HistoryState[];
  currentHistoryIndex: number;
  
  // Analysis state
  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  engineThinking: boolean;
  
  // UI state
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  boardOrientation: 'white' | 'black';
  showCoordinates: boolean;
  
  // Engine settings
  engineOptions: EngineOptions;
  aiSettings: AISettings;
  aiExplanationsEnabled: boolean;
  
  // Actions
  setGameState: (state: Partial<GameState>) => void;
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  setPosition: (fen: string) => void;
  flipBoard: () => void;
  resetToStartPosition: () => void;
  clearBoard: () => void;
  
  // History actions
  addToHistory: () => void;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
  restoreState: (state: HistoryState) => void;
  
  // Analysis actions
  setAnalysisResults: (results: AnalysisResult[]) => void;
  clearAnalysisResults: () => void;
  setEngineThinking: (thinking: boolean) => void;
  
  // Settings actions
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (pieceSet: PieceSet) => void;
  setEngineOptions: (options: Partial<EngineOptions>) => void;
  setAISettings: (settings: Partial<AISettings>) => void;
  toggleAIExplanations: () => void;
}

const initialGameState: GameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'w',
  castlingRights: {
    whiteKingSide: true,
    whiteQueenSide: true,
    blackKingSide: true,
    blackQueenSide: true,
  },
};

const initialEngineOptions: EngineOptions = {
  thinkTime: 3,
  mode: 'show',
};

const initialAISettings: AISettings = {
  geminiApiKey: '',
  openaiApiKey: '',
  claudeApiKey: '',
  groqApiKey: '',
};

export const useChessStore = create<ChessStore>((set, get) => ({
  // Initial state
  game: new Chess(),
  gameState: initialGameState,
  moveHistory: [{ ...initialGameState, position: initialGameState.fen }],
  currentHistoryIndex: 0,
  
  analysisResults: [],
  isAnalyzing: false,
  engineThinking: false,
  
  boardTheme: 'brown',
  pieceSet: 'cburnett',
  boardOrientation: 'white',
  showCoordinates: true,
  
  engineOptions: initialEngineOptions,
  aiSettings: initialAISettings,
  aiExplanationsEnabled: false,
  
  // Game actions
  setGameState: (newState) => set((state) => ({
    gameState: { ...state.gameState, ...newState }
  })),
  
  makeMove: (from, to, promotion) => {
    const { game } = get();
    try {
      const move = game.move({ from, to, promotion });
      if (move) {
        set((state) => ({
          gameState: {
            ...state.gameState,
            fen: game.fen(),
            turn: game.turn(),
          }
        }));
        get().addToHistory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  },
  
  setPosition: (fen) => {
    const { game } = get();
    try {
      game.load(fen);
      set((state) => ({
        gameState: {
          ...state.gameState,
          fen: game.fen(),
          turn: game.turn(),
        }
      }));
      get().addToHistory();
    } catch (error) {
      console.error('Invalid FEN:', error);
    }
  },
  
  flipBoard: () => set((state) => ({
    boardOrientation: state.boardOrientation === 'white' ? 'black' : 'white'
  })),
  
  resetToStartPosition: () => {
    const { game } = get();
    game.reset();
    set((state) => ({
      gameState: {
        ...initialGameState,
        fen: game.fen(),
        turn: game.turn(),
      },
      moveHistory: [{ ...initialGameState, position: game.fen() }],
      currentHistoryIndex: 0,
    }));
    get().clearAnalysisResults();
  },
  
  clearBoard: () => {
    const { game } = get();
    game.clear();
    set((state) => ({
      gameState: {
        ...state.gameState,
        fen: game.fen(),
        turn: 'w',
      }
    }));
    get().addToHistory();
  },
  
  // History actions
  addToHistory: () => {
    const { gameState, moveHistory, currentHistoryIndex } = get();
    const newState: HistoryState = {
      ...gameState,
      position: gameState.fen,
    };
    
    const newHistory = moveHistory.slice(0, currentHistoryIndex + 1);
    newHistory.push(newState);
    
    set({
      moveHistory: newHistory,
      currentHistoryIndex: newHistory.length - 1,
    });
  },
  
  navigateToPrevious: () => {
    const { currentHistoryIndex, moveHistory } = get();
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const state = moveHistory[newIndex];
      get().restoreState(state);
      set({ currentHistoryIndex: newIndex });
    }
  },
  
  navigateToNext: () => {
    const { currentHistoryIndex, moveHistory } = get();
    if (currentHistoryIndex < moveHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const state = moveHistory[newIndex];
      get().restoreState(state);
      set({ currentHistoryIndex: newIndex });
    }
  },
  
  restoreState: (state) => {
    const { game } = get();
    game.load(state.position);
    set({
      gameState: {
        fen: state.position,
        turn: state.turn,
        castlingRights: state.castlingRights,
      }
    });
    get().clearAnalysisResults();
  },
  
  // Analysis actions
  setAnalysisResults: (results) => {
    if (typeof results === 'function') {
      set((state) => ({ analysisResults: results(state.analysisResults) }));
    } else {
      set({ analysisResults: results });
    }
  },
  
  clearAnalysisResults: () => set({ analysisResults: [] }),
  
  setEngineThinking: (thinking) => set({ engineThinking: thinking }),
  
  // Settings actions
  setBoardTheme: (theme) => set({ boardTheme: theme }),
  
  setPieceSet: (pieceSet) => set({ pieceSet }),
  
  setEngineOptions: (options) => set((state) => ({
    engineOptions: { ...state.engineOptions, ...options }
  })),
  
  setAISettings: (settings) => set((state) => ({
    aiSettings: { ...state.aiSettings, ...settings }
  })),
  
  toggleAIExplanations: () => set((state) => ({
    aiExplanationsEnabled: !state.aiExplanationsEnabled
  })),
}));

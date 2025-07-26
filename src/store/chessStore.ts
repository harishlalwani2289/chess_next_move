import { create } from 'zustand';
import { Chess } from 'chess.js';
import type { GameState, HistoryState, AnalysisResult, EngineOptions, BoardTheme, PieceSet, GameInformation } from '../types/chess';
import type { AISettings } from '../services/aiService';

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
  
  // Game information
  gameInformation: GameInformation | null;
  
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
  setAnalysisResults: (results: AnalysisResult[] | ((prev: AnalysisResult[]) => AnalysisResult[])) => void;
  clearAnalysisResults: () => void;
  setEngineThinking: (thinking: boolean) => void;
  
  // Settings actions
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceSet: (pieceSet: PieceSet) => void;
  setEngineOptions: (options: Partial<EngineOptions>) => void;
  setAISettings: (settings: Partial<AISettings>) => void;
  toggleAIExplanations: () => void;
  
  // Game information actions
  setGameInformation: (info: GameInformation | null) => void;
  
  // PGN loading with full history
  loadPgnWithHistory: (pgnText: string) => boolean;
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

// Create a storage key - use localStorage for persistence across refresh
const getStorageKey = () => {
  return 'chess-analyzer-state';
};

// Load persisted state from localStorage
const loadPersistedState = (): Partial<ChessStore> => {
  try {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore specific state that should persist
      return {
        gameState: parsed.gameState || initialGameState,
        moveHistory: parsed.moveHistory || [{ ...initialGameState, position: initialGameState.fen }],
        currentHistoryIndex: parsed.currentHistoryIndex || 0,
        boardOrientation: parsed.boardOrientation || 'white',
        engineOptions: parsed.engineOptions || initialEngineOptions,
        boardTheme: parsed.boardTheme || 'brown',
        pieceSet: parsed.pieceSet || 'cburnett',
        showCoordinates: parsed.showCoordinates !== undefined ? parsed.showCoordinates : true,
        aiExplanationsEnabled: parsed.aiExplanationsEnabled || false,
      };
    }
  } catch (error) {
    console.warn('Failed to load persisted chess state:', error);
  }
  return {};
};

// Save state to localStorage
const saveToStorage = (state: ChessStore) => {
  try {
    const stateToSave = {
      gameState: state.gameState,
      moveHistory: state.moveHistory,
      currentHistoryIndex: state.currentHistoryIndex,
      boardOrientation: state.boardOrientation,
      engineOptions: state.engineOptions,
      boardTheme: state.boardTheme,
      pieceSet: state.pieceSet,
      showCoordinates: state.showCoordinates,
      aiExplanationsEnabled: state.aiExplanationsEnabled,
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(stateToSave));
  } catch (error) {
    console.warn('Failed to save chess state:', error);
  }
};

export const useChessStore = create<ChessStore>((set, get) => {
  // Load persisted state
  const persistedState = loadPersistedState();
  
  // Create and initialize the chess game with persisted position
  const initialGame = new Chess();
  if (persistedState.gameState?.fen) {
    try {
      initialGame.load(persistedState.gameState.fen);
    } catch (error) {
      console.warn('Invalid persisted FEN, using default position:', error);
    }
  }

  return {
    // Initial state with persistence
    game: initialGame,
    gameState: persistedState.gameState || initialGameState,
    moveHistory: persistedState.moveHistory || [{ ...initialGameState, position: initialGameState.fen }],
    currentHistoryIndex: persistedState.currentHistoryIndex || 0,
    
    analysisResults: [],
    isAnalyzing: false,
    engineThinking: false,
    
    boardTheme: persistedState.boardTheme || 'brown',
    pieceSet: persistedState.pieceSet || 'cburnett',
    boardOrientation: persistedState.boardOrientation || 'white',
    showCoordinates: persistedState.showCoordinates !== undefined ? persistedState.showCoordinates : true,
    
    engineOptions: persistedState.engineOptions || initialEngineOptions,
    aiSettings: initialAISettings,
    aiExplanationsEnabled: persistedState.aiExplanationsEnabled || false,
    
    gameInformation: null,
  
    // Game actions
    setGameState: (newState) => set((state) => {
      const updatedState = {
        gameState: { ...state.gameState, ...newState }
      };
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
    makeMove: (from, to, promotion) => {
      const { game } = get();
      try {
        const move = game.move({ from, to, promotion });
        if (move) {
          set((state) => {
            const updatedState = {
              gameState: {
                ...state.gameState,
                fen: game.fen(),
                turn: game.turn(),
              }
            };
            saveToStorage({ ...state, ...updatedState });
            return updatedState;
          });
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
        set((state) => {
          const updatedState = {
            gameState: {
              ...state.gameState,
              fen: game.fen(),
              turn: game.turn(),
            }
          };
          saveToStorage({ ...state, ...updatedState });
          return updatedState;
        });
        get().addToHistory();
      } catch (error) {
        console.error('Invalid FEN:', error);
      }
    },
    
    flipBoard: () => set((state) => {
      const updatedState = {
        boardOrientation: state.boardOrientation === 'white' ? 'black' : 'white'
      } as const;
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
    resetToStartPosition: () => {
      const { game } = get();
      game.reset();
      set((state) => {
        const updatedState = {
          gameState: {
            ...initialGameState,
            fen: game.fen(),
            turn: game.turn(),
          },
          moveHistory: [{ ...initialGameState, position: game.fen() }],
          currentHistoryIndex: 0,
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
      get().clearAnalysisResults();
    },
    
    clearBoard: () => {
      const { game } = get();
      game.clear();
      set((state) => {
        const updatedState = {
          gameState: {
            ...state.gameState,
            fen: game.fen(),
            turn: 'w' as const,
          }
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
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
      
      set((state) => {
        const updatedState = {
          moveHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
    },
    
    navigateToPrevious: () => {
      const { currentHistoryIndex, moveHistory } = get();
      if (currentHistoryIndex > 0) {
        const newIndex = currentHistoryIndex - 1;
        const state = moveHistory[newIndex];
        get().restoreState(state);
        set((currentState) => {
          const updatedState = { currentHistoryIndex: newIndex };
          saveToStorage({ ...currentState, ...updatedState });
          return updatedState;
        });
      }
    },
    
    navigateToNext: () => {
      const { currentHistoryIndex, moveHistory } = get();
      if (currentHistoryIndex < moveHistory.length - 1) {
        const newIndex = currentHistoryIndex + 1;
        const state = moveHistory[newIndex];
        get().restoreState(state);
        set((currentState) => {
          const updatedState = { currentHistoryIndex: newIndex };
          saveToStorage({ ...currentState, ...updatedState });
          return updatedState;
        });
      }
    },
    
    restoreState: (state) => {
      const { game } = get();
      game.load(state.position);
      set((currentState) => {
        const updatedState = {
          gameState: {
            fen: state.position,
            turn: state.turn,
            castlingRights: state.castlingRights,
          }
        };
        saveToStorage({ ...currentState, ...updatedState });
        return updatedState;
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
    setBoardTheme: (theme) => set((state) => {
      const updatedState = { boardTheme: theme };
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
    setPieceSet: (pieceSet) => set((state) => {
      const updatedState = { pieceSet };
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
    setEngineOptions: (options) => set((state) => {
      const updatedState = {
        engineOptions: { ...state.engineOptions, ...options }
      };
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
    setAISettings: (settings) => set((state) => ({
      aiSettings: { ...state.aiSettings, ...settings }
    })),
    
    toggleAIExplanations: () => set((state) => {
      const updatedState = {
        aiExplanationsEnabled: !state.aiExplanationsEnabled
      };
      saveToStorage({ ...state, ...updatedState });
      return updatedState;
    }),
    
  // Game information actions
  setGameInformation: (info) => set({ gameInformation: info }),
  
  // PGN loading with full history
  loadPgnWithHistory: (pgnText: string) => {
    const { game } = get();
    try {
      // Create a temporary game to parse the PGN
      const tempGame = new Chess();
      tempGame.loadPgn(pgnText);
      
      // Get the history of moves
      const moveHistory = tempGame.history({ verbose: true });
      
      // Reset the main game and build up the history
      game.reset();
      
      // Create history array starting with initial position
      const historyStates: HistoryState[] = [{
        fen: game.fen(),
        turn: game.turn(),
        castlingRights: {
          whiteKingSide: true,
          whiteQueenSide: true,
          blackKingSide: true,
          blackQueenSide: true,
        },
        position: game.fen(),
      }];
      
      // Play through each move and capture the state
      for (const move of moveHistory) {
        game.move(move);
        const whiteCastling = game.getCastlingRights('w');
        const blackCastling = game.getCastlingRights('b');
        historyStates.push({
          fen: game.fen(),
          turn: game.turn(),
          castlingRights: {
            whiteKingSide: whiteCastling.k,
            whiteQueenSide: whiteCastling.q,
            blackKingSide: blackCastling.k,
            blackQueenSide: blackCastling.q,
          },
          position: game.fen(),
        });
      }
      
      // Set the final state
      set((state) => {
        const finalWhiteCastling = game.getCastlingRights('w');
        const finalBlackCastling = game.getCastlingRights('b');
        const updatedState = {
          gameState: {
            fen: game.fen(),
            turn: game.turn(),
            castlingRights: {
              whiteKingSide: finalWhiteCastling.k,
              whiteQueenSide: finalWhiteCastling.q,
              blackKingSide: finalBlackCastling.k,
              blackQueenSide: finalBlackCastling.q,
            },
          },
          moveHistory: historyStates,
          currentHistoryIndex: historyStates.length - 1,
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
      
      return true;
    } catch (error) {
      console.error('Failed to load PGN with history:', error);
      return false;
    }
  },
  };
});

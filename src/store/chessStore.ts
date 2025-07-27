import { create } from 'zustand';
import { Chess } from 'chess.js';
import apiService from '../services/api';
import type { ChessBoard as ApiChessBoard } from '../services/api';
import { useAuthStore } from './authStore';
import type { GameState, HistoryState, AnalysisResult, EngineOptions, BoardTheme, PieceSet, GameInformation } from '../types/chess';
import type { AISettings } from '../services/aiService';

interface BoardData {
  id: string;
  name: string;
  game: Chess;
  gameState: GameState;
  moveHistory: HistoryState[];
  currentHistoryIndex: number;
  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  gameInformation: GameInformation | null;
  boardOrientation: 'white' | 'black';
}

interface ChessStore {
  // Multiple boards state
  boards: BoardData[];
  currentBoardId: string | null;
  
  // Global UI state
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  showCoordinates: boolean;
  
  // Engine settings
  engineOptions: EngineOptions;
  aiSettings: AISettings;
  aiExplanationsEnabled: boolean;
  engineThinking: boolean;
  
  // Backend sync state
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: boolean;
  autoSyncEnabled: boolean;
  autoSyncInterval: number | null;
  
  // Board management actions
  addBoard: (name?: string) => string;
  removeBoard: (boardId: string) => Promise<void>;
  switchToBoard: (boardId: string) => void;
  renameBoardNormal: (boardId: string, name: string) => void;
  
  // Backend sync actions
  loadBoardsFromBackend: () => Promise<void>;
  syncCurrentBoardToBackend: () => Promise<void>;
  syncAllBoardsToBackend: () => Promise<void>;
  setBoardIdMapping: (localId: string, serverId: string) => void;
  getBoardServerId: (localId: string) => string | null;
  
  // Auto-sync actions
  startAutoSync: () => void;
  stopAutoSync: () => void;
  toggleAutoSync: () => void;
  markPendingChanges: () => void;
  
  // Current board getters (computed properties)
  getCurrentBoard: () => BoardData | null;
  game: Chess | null;
  gameState: GameState | null;
  moveHistory: HistoryState[];
  currentHistoryIndex: number;
  analysisResults: AnalysisResult[];
  isAnalyzing: boolean;
  gameInformation: GameInformation | null;
  boardOrientation: 'white' | 'black';
  
  // Helper method for updating current board
  updateCurrentBoard: (updates: Partial<BoardData>) => void;
  
  // Actions (all operate on current board)
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

// Board ID mapping storage
const getBoardMappingKey = () => {
  const authStore = useAuthStore.getState();
  const userId = authStore.user?.id || 'anonymous';
  return `chess-board-id-mapping-${userId}`;
};

const saveBoardIdMapping = (localId: string, serverId: string) => {
  try {
    const stored = localStorage.getItem(getBoardMappingKey());
    const mapping = stored ? JSON.parse(stored) : {};
    mapping[localId] = serverId;
    localStorage.setItem(getBoardMappingKey(), JSON.stringify(mapping));
  } catch (error) {
    console.warn('Failed to save board ID mapping:', error);
  }
};

const getBoardIdMapping = (localId: string): string | null => {
  try {
    const stored = localStorage.getItem(getBoardMappingKey());
    if (!stored) return null;
    const mapping = JSON.parse(stored);
    return mapping[localId] || null;
  } catch (error) {
    console.warn('Failed to get board ID mapping:', error);
    return null;
  }
};

const removeBoardIdMapping = (localId: string) => {
  try {
    const stored = localStorage.getItem(getBoardMappingKey());
    if (!stored) return;
    const mapping = JSON.parse(stored);
    delete mapping[localId];
    localStorage.setItem(getBoardMappingKey(), JSON.stringify(mapping));
  } catch (error) {
    console.warn('Failed to remove board ID mapping:', error);
  }
};

// Create initial board data
const createInitialBoard = (id: string, name: string): BoardData => {
  const game = new Chess();
  return {
    id,
    name,
    game,
    gameState: { ...initialGameState },
    moveHistory: [{ ...initialGameState, position: initialGameState.fen }],
    currentHistoryIndex: 0,
    analysisResults: [],
    isAnalyzing: false,
    gameInformation: null,
    boardOrientation: 'white'
  };
};

// Load persisted state from localStorage
const loadPersistedState = (): Partial<ChessStore> => {
  try {
    const stored = localStorage.getItem(getStorageKey());
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Handle legacy single-board format
      if (parsed.gameState && !parsed.boards) {
        const legacyBoard = createInitialBoard('board-1', 'Main Board');
        legacyBoard.gameState = parsed.gameState || initialGameState;
        legacyBoard.moveHistory = parsed.moveHistory || [{ ...initialGameState, position: initialGameState.fen }];
        legacyBoard.currentHistoryIndex = parsed.currentHistoryIndex || 0;
        legacyBoard.boardOrientation = parsed.boardOrientation || 'white';
        
        // Load the game state
        try {
          legacyBoard.game.load(legacyBoard.gameState.fen);
        } catch (error) {
          console.warn('Invalid persisted FEN in legacy format:', error);
        }
        
        return {
          boards: [legacyBoard],
          currentBoardId: 'board-1',
          engineOptions: parsed.engineOptions || initialEngineOptions,
          boardTheme: parsed.boardTheme || 'brown',
          pieceSet: parsed.pieceSet || 'cburnett',
          showCoordinates: parsed.showCoordinates !== undefined ? parsed.showCoordinates : true,
          aiExplanationsEnabled: parsed.aiExplanationsEnabled || false,
        };
      }
      
      // Handle new multi-board format
      if (parsed.boards) {
        // Recreate Chess instances from persisted data
        const restoredBoards = parsed.boards.map((boardData: any) => {
          const game = new Chess();
          try {
            game.load(boardData.gameState.fen);
          } catch (error) {
            console.warn('Invalid persisted FEN for board:', boardData.id, error);
          }
          
          return {
            ...boardData,
            game
          };
        });
        
        return {
          boards: restoredBoards,
          currentBoardId: parsed.currentBoardId || (restoredBoards[0]?.id || 'board-1'),
          engineOptions: parsed.engineOptions || initialEngineOptions,
          boardTheme: parsed.boardTheme || 'brown',
          pieceSet: parsed.pieceSet || 'cburnett',
          showCoordinates: parsed.showCoordinates !== undefined ? parsed.showCoordinates : true,
          aiExplanationsEnabled: parsed.aiExplanationsEnabled || false,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted chess state:', error);
  }
  return {};
};

// Save state to localStorage
const saveToStorage = (state: ChessStore) => {
  try {
    // Prepare boards for serialization (without Chess instances)
    const boardsForStorage = state.boards.map(board => ({
      id: board.id,
      name: board.name,
      gameState: board.gameState,
      moveHistory: board.moveHistory,
      currentHistoryIndex: board.currentHistoryIndex,
      analysisResults: [], // Don't persist analysis results
      isAnalyzing: false,
      gameInformation: board.gameInformation,
      boardOrientation: board.boardOrientation
    }));
    
    const stateToSave = {
      boards: boardsForStorage,
      currentBoardId: state.currentBoardId,
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

// Helper function to sync current board properties
const syncCurrentBoardProperties = (state: any) => {
  const currentBoard = state.boards.find((board: BoardData) => board.id === state.currentBoardId);
  if (currentBoard) {
    state.game = currentBoard.game;
    state.gameState = currentBoard.gameState;
    state.moveHistory = currentBoard.moveHistory;
    state.currentHistoryIndex = currentBoard.currentHistoryIndex;
    state.analysisResults = currentBoard.analysisResults;
    state.isAnalyzing = currentBoard.isAnalyzing;
    state.gameInformation = currentBoard.gameInformation;
    state.boardOrientation = currentBoard.boardOrientation;
  }
};

export const useChessStore = create<ChessStore>((set, get) => {
  // Load persisted state
  const persistedState = loadPersistedState();
  
  // Initialize boards - use persisted boards or create default board
  const initialBoards = persistedState.boards && persistedState.boards.length > 0 
    ? persistedState.boards 
    : [createInitialBoard('board-1', 'Main Board')];
  
  const initialCurrentBoardId = persistedState.currentBoardId || initialBoards[0].id;
  
  // Find initial current board
  const initialCurrentBoard = initialBoards.find(board => board.id === initialCurrentBoardId) || initialBoards[0];

    return {
    // Multiple boards state
    boards: initialBoards,
    currentBoardId: initialCurrentBoardId,
    
    // Global UI state
    boardTheme: persistedState.boardTheme || 'brown',
    pieceSet: persistedState.pieceSet || 'cburnett',
    showCoordinates: persistedState.showCoordinates !== undefined ? persistedState.showCoordinates : true,
    
    // Engine settings
    engineOptions: persistedState.engineOptions || initialEngineOptions,
    aiSettings: initialAISettings,
    aiExplanationsEnabled: persistedState.aiExplanationsEnabled || false,
    engineThinking: false,
    
    // Backend sync state
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: false,
    autoSyncEnabled: true,
    autoSyncInterval: null,
    
    // Board management actions
    addBoard: (name) => {
      const boardName = name || `Board ${get().boards.length + 1}`;
      const newBoardId = `board-${Date.now()}`;
      const newBoard = createInitialBoard(newBoardId, boardName);
      
      set((state) => {
        const updatedState = {
          boards: [...state.boards, newBoard]
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
      
      // Mark pending changes to trigger sync for authenticated users
      get().markPendingChanges();
      
      return newBoardId;
    },
    
    removeBoard: async (boardId) => {
      const { boards, currentBoardId } = get();
      
      if (boards.length <= 1) {
        console.warn('Cannot remove the last board');
        return;
      }
      
      // Get the server ID for this board
      const boardServerId = get().getBoardServerId(boardId);
      
      // Delete from backend if it exists there
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated && boardServerId) {
        try {
          console.log('🗑️ Deleting board from backend:', boardServerId);
          await apiService.deleteChessBoard(boardServerId);
          console.log('✅ Board deleted from backend successfully');
        } catch (error) {
          console.error('❌ Failed to delete board from backend:', error);
          // Continue with local deletion even if backend deletion fails
        }
      }
      
      const newBoards = boards.filter(board => board.id !== boardId);
      let newCurrentBoardId = currentBoardId;
      
      // If we're removing the current board, switch to the first remaining board
      if (currentBoardId === boardId) {
        newCurrentBoardId = newBoards[0].id;
      }
      
      set((state) => {
        const updatedState = {
          boards: newBoards,
          currentBoardId: newCurrentBoardId
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
      
      // Clean up the board ID mapping
      removeBoardIdMapping(boardId);
      
      // No need to mark pending changes since we already synced the deletion
    },
    
    switchToBoard: (boardId) => {
      const { boards } = get();
      const boardExists = boards.some(board => board.id === boardId);
      
      if (!boardExists) {
        console.warn('Board not found:', boardId);
        return;
      }
      
      set((state) => {
        const updatedState = { ...state, currentBoardId: boardId };
        // Sync current board properties when switching
        syncCurrentBoardProperties(updatedState);
        saveToStorage(updatedState);
        return updatedState;
      });
    },
    
    renameBoardNormal: (boardId, name) => {
      set((state) => {
        const updatedState = {
          boards: state.boards.map(board => 
            board.id === boardId ? { ...board, name } : board
          )
        };
        saveToStorage({ ...state, ...updatedState });
        return updatedState;
      });
      
      // Mark pending changes to trigger sync for authenticated users
      get().markPendingChanges();
    },
    
    // Current board getters
    getCurrentBoard: () => {
      const { boards, currentBoardId } = get();
      return boards.find(board => board.id === currentBoardId) || null;
    },
    
    // Computed properties for current board - initialized from current board
    game: initialCurrentBoard.game,
    gameState: initialCurrentBoard.gameState,
    moveHistory: initialCurrentBoard.moveHistory,
    currentHistoryIndex: initialCurrentBoard.currentHistoryIndex,
    analysisResults: initialCurrentBoard.analysisResults,
    isAnalyzing: initialCurrentBoard.isAnalyzing,
    gameInformation: initialCurrentBoard.gameInformation,
    boardOrientation: initialCurrentBoard.boardOrientation,
    
    // Helper to update current board
    updateCurrentBoard: (updates: Partial<BoardData>) => {
      const { currentBoardId } = get();
      set((state) => {
        const updatedState = {
          ...state,
          boards: state.boards.map(board => 
            board.id === currentBoardId ? { ...board, ...updates } : board
          )
        };
        // Sync current board properties
        syncCurrentBoardProperties(updatedState);
        saveToStorage(updatedState);
        return updatedState;
      });
    },
    
    // Game actions (operate on current board)
    setGameState: (newState) => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const updatedGameState = { ...currentBoard.gameState, ...newState };
      get().updateCurrentBoard({ gameState: updatedGameState });
      get().markPendingChanges();
    },
    
    makeMove: (from, to, promotion) => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return false;
      
      const { game } = currentBoard;
      const originalFen = game.fen();
      
      console.log(`makeMove called: ${from} -> ${to}, current FEN: ${originalFen}`);
      
      // Validate move with both possible turns
      const colors = ['w', 'b'];
      
      for (const color of colors) {
        try {
          // Create a FEN with the specified turn
          const fenParts = originalFen.split(' ');
          fenParts[1] = color; // Set the turn
          const tempFen = fenParts.join(' ');
          
          console.log(`Trying move with ${color} to move: ${tempFen}`);
          
          // Load the position with the specified turn
          game.load(tempFen);
          
          // Try to make the move
          const move = game.move({ from, to, promotion });
          if (move) {
            console.log(`Move successful with ${color} to move:`, move);
            
            const updatedGameState = {
              ...currentBoard.gameState,
              fen: game.fen(),
              turn: game.turn(),
            };
            
            get().updateCurrentBoard({ gameState: updatedGameState });
            get().addToHistory();
            get().markPendingChanges();
            return true;
          }
        } catch (error) {
          console.log(`Move failed with ${color} to move:`, error);
          // Continue to next color
        }
      }
      
      // If all attempts fail, restore original position
      try {
        game.load(originalFen);
      } catch (restoreError) {
        console.error('Failed to restore game position:', restoreError);
      }
      
      console.log('Move completely failed, restored original position');
      return false;
    },
    
    setPosition: (fen) => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { game } = currentBoard;
      try {
        game.load(fen);
        const updatedGameState = {
          ...currentBoard.gameState,
          fen: game.fen(),
          turn: game.turn(),
        };
        get().updateCurrentBoard({ gameState: updatedGameState });
        get().addToHistory();
        get().markPendingChanges();
      } catch (error) {
        console.error('Invalid FEN:', error);
      }
    },
    
    flipBoard: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const newOrientation = currentBoard.boardOrientation === 'white' ? 'black' : 'white';
      get().updateCurrentBoard({ boardOrientation: newOrientation });
      get().markPendingChanges();
    },
    
    resetToStartPosition: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { game } = currentBoard;
      game.reset();
      const updatedGameState = {
        ...initialGameState,
        fen: game.fen(),
        turn: game.turn(),
      };
      const newMoveHistory = [{ ...initialGameState, position: game.fen() }];
      
      get().updateCurrentBoard({
        gameState: updatedGameState,
        moveHistory: newMoveHistory,
        currentHistoryIndex: 0,
        analysisResults: []
      });
      get().markPendingChanges();
    },
    
    clearBoard: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { game } = currentBoard;
      game.clear();
      const updatedGameState = {
        ...currentBoard.gameState,
        fen: game.fen(),
        turn: 'w' as const,
      };
      get().updateCurrentBoard({ gameState: updatedGameState });
      get().markPendingChanges();
      get().addToHistory();
    },
    
    // History actions
    addToHistory: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { gameState, moveHistory, currentHistoryIndex } = currentBoard;
      const newState: HistoryState = {
        ...gameState,
        position: gameState.fen,
      };
      
      const newHistory = moveHistory.slice(0, currentHistoryIndex + 1);
      newHistory.push(newState);
      
      get().updateCurrentBoard({
        moveHistory: newHistory,
        currentHistoryIndex: newHistory.length - 1,
      });
      
      // Note: markPendingChanges is already called by the methods that call addToHistory
    },
    
    navigateToPrevious: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { currentHistoryIndex, moveHistory } = currentBoard;
      if (currentHistoryIndex > 0) {
        const newIndex = currentHistoryIndex - 1;
        const state = moveHistory[newIndex];
        get().restoreState(state);
        get().updateCurrentBoard({ currentHistoryIndex: newIndex });
      }
    },
    
    navigateToNext: () => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { currentHistoryIndex, moveHistory } = currentBoard;
      if (currentHistoryIndex < moveHistory.length - 1) {
        const newIndex = currentHistoryIndex + 1;
        const state = moveHistory[newIndex];
        get().restoreState(state);
        get().updateCurrentBoard({ currentHistoryIndex: newIndex });
      }
    },
    
    restoreState: (state) => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      const { game } = currentBoard;
      game.load(state.position);
      const updatedGameState = {
        fen: state.position,
        turn: state.turn,
        castlingRights: state.castlingRights,
      };
      get().updateCurrentBoard({ 
        gameState: updatedGameState,
        analysisResults: []
      });
    },
    
    // Analysis actions
    setAnalysisResults: (results) => {
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) return;
      
      if (typeof results === 'function') {
        const newResults = results(currentBoard.analysisResults);
        get().updateCurrentBoard({ analysisResults: newResults });
      } else {
        get().updateCurrentBoard({ analysisResults: results });
      }
      
      // Mark changes for sync
      get().markPendingChanges();
    },
    
    clearAnalysisResults: () => {
      get().updateCurrentBoard({ analysisResults: [] });
    },
    
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
    setGameInformation: (info) => {
      get().updateCurrentBoard({ gameInformation: info });
    },
  
  // PGN loading with full history
  loadPgnWithHistory: (pgnText: string) => {
    const currentBoard = get().getCurrentBoard();
    if (!currentBoard) return false;
    
    const { game } = currentBoard;
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
      
      // Update the current board with final state
      const finalWhiteCastling = game.getCastlingRights('w');
      const finalBlackCastling = game.getCastlingRights('b');
      const finalGameState = {
        fen: game.fen(),
        turn: game.turn(),
        castlingRights: {
          whiteKingSide: finalWhiteCastling.k,
          whiteQueenSide: finalWhiteCastling.q,
          blackKingSide: finalBlackCastling.k,
          blackQueenSide: finalBlackCastling.q,
        },
      };
      
      get().updateCurrentBoard({
        gameState: finalGameState,
        moveHistory: historyStates,
        currentHistoryIndex: historyStates.length - 1,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to load PGN with history:', error);
      return false;
    }
  },
    // Load boards from backend for authenticated user
    loadBoardsFromBackend: async () => {
      const authStore = useAuthStore.getState();
      const userId = authStore.user?.id;

      if (!userId) return;

      try {
        set({ isSyncing: true });

        const response = await apiService.getChessBoards();
        if (response.success && response.data) {
          const boardsFromBackend = response.data.chessBoards;
          const restoredBoards = boardsFromBackend.map((apiBoard: ApiChessBoard) => {
            const game = new Chess();
            game.load(apiBoard.fen);
            return {
              id: apiBoard._id, // Use server ID as local ID
              name: apiBoard.name,
              game,
              gameState: {
                fen: apiBoard.fen,
                turn: apiBoard.gameState.turn,
                castlingRights: {
                  whiteKingSide: apiBoard.gameState.castling.includes('K'),
                  whiteQueenSide: apiBoard.gameState.castling.includes('Q'),
                  blackKingSide: apiBoard.gameState.castling.includes('k'),
                  blackQueenSide: apiBoard.gameState.castling.includes('q'),
                }
              },
              moveHistory: apiBoard.gameHistory.map((historyItem: any) => ({
                fen: historyItem.fen,
                turn: historyItem.fen.split(' ')[1] as 'w' | 'b',
                castlingRights: {
                  whiteKingSide: historyItem.fen.split(' ')[2].includes('K'),
                  whiteQueenSide: historyItem.fen.split(' ')[2].includes('Q'),
                  blackKingSide: historyItem.fen.split(' ')[2].includes('k'),
                  blackQueenSide: historyItem.fen.split(' ')[2].includes('q'),
                },
                position: historyItem.fen
              })),
              currentHistoryIndex: apiBoard.gameHistory.length - 1,
              analysisResults: apiBoard.analysisResults.map((result: any) => ({
                bestMove: result.bestMove,
                evaluation: result.evaluation.toString(),
                principalVariation: result.principalVariation || '',
                moveNumber: 1
              })),
              isAnalyzing: false,
              gameInformation: null,
              boardOrientation: apiBoard.boardOrientation || 'white'
            };
          });
          
          // Update board ID mappings for restored boards
          // Each board's server ID maps to itself since we're using server IDs as local IDs
          restoredBoards.forEach(board => {
            get().setBoardIdMapping(board.id, board.id);
          });
          
          set((state) => {
            const boardsMap = new Map(state.boards.map(b => [b.id, b]));
            restoredBoards.forEach(b => boardsMap.set(b.id, b));

            const mergedBoards = Array.from(boardsMap.values());

            const updatedState = { 
              ...state,
              boards: mergedBoards,
              currentBoardId: state.currentBoardId || restoredBoards[0]?.id || null,
              isSyncing: false, 
              lastSyncTime: new Date(), 
              pendingChanges: false 
            };
            // Sync current board properties when loading from backend
            syncCurrentBoardProperties(updatedState);
            return updatedState;
          });
        }
      } catch (error) {
        console.error('Failed to load boards from the backend:', error);
        set({ isSyncing: false });
      }
    },

    // Sync the current board with the backend
    syncCurrentBoardToBackend: async () => {
      console.log('💾 syncCurrentBoardToBackend called');
      const currentBoard = get().getCurrentBoard();
      if (!currentBoard) {
        console.log('❌ No current board found');
        return;
      }

      try {
        console.log('🔄 Starting sync process...');
        set({ isSyncing: true });

        const boardServerId = get().getBoardServerId(currentBoard.id);
        console.log('🔍 Board server ID:', boardServerId);
        
        const syncData = {
          name: currentBoard.name,
          fen: currentBoard.game.fen(),
          gameState: currentBoard.gameState,
          pgn: '',
          boardOrientation: currentBoard.boardOrientation,
        };
        console.log('📦 Sync data:', syncData);

        if (boardServerId) {
          console.log('📝 Updating existing board...');
          const response = await apiService.updateChessBoard(boardServerId, syncData);
          console.log('✅ Update response:', response);
        } else {
          console.log('🆕 Creating new board...');
          const createResponse = await apiService.createChessBoard(syncData);
          console.log('✅ Create response:', createResponse);
          if (createResponse.success && createResponse.data) {
            const serverId = createResponse.data.chessBoard._id;
            console.log('🔗 Mapping local ID to server ID:', currentBoard.id, '->', serverId);
            get().setBoardIdMapping(currentBoard.id, serverId);
          }
        }

        console.log('✅ Sync completed successfully');
        set({ 
          isSyncing: false, 
          lastSyncTime: new Date(), 
          pendingChanges: false 
        });
      } catch (error) {
        console.error('❌ Failed to sync current board with the backend:', error);
        set({ isSyncing: false });
      }
    },

    // Sync all boards with the backend
    syncAllBoardsToBackend: async () => {
      const { boards } = get();

      try {
        set({ isSyncing: true });
        await Promise.all(boards.map((board) => {
          const boardServerId = get().getBoardServerId(board.id);
          const syncData = {
            name: board.name,
            fen: board.game.fen(),
            gameState: board.gameState,
            pgn: '',
            boardOrientation: board.boardOrientation,
          };

          if (boardServerId) {
            return apiService.updateChessBoard(boardServerId, syncData);
          } else {
            return apiService.createChessBoard(syncData).then((createResponse) => {
              if (createResponse.success && createResponse.data) {
                const serverId = createResponse.data.chessBoard._id;
                get().setBoardIdMapping(board.id, serverId);
              }
            });
          }
        }));

        set({ 
          isSyncing: false, 
          lastSyncTime: new Date(), 
          pendingChanges: false 
        });
      } catch (error) {
        console.error('Failed to sync all boards with the backend:', error);
        set({ isSyncing: false });
      }
    },

    setBoardIdMapping: (localId: string, serverId: string) => {
      saveBoardIdMapping(localId, serverId);
    },

    getBoardServerId: (localId: string) => {
      return getBoardIdMapping(localId);
    },
    
    // Auto-sync functionality
    startAutoSync: () => {
      console.log('🚀 Starting auto-sync...');
      if (!get().autoSyncEnabled) {
        console.log('❌ Auto-sync disabled');
        return;
      }
      const authStore = useAuthStore.getState();
      if (!authStore.isAuthenticated) {
        console.log('❌ User not authenticated');
        return;
      }
      
      console.log('✅ Auto-sync started - will check every 60 seconds');
      const interval = setInterval(async () => {
        const { pendingChanges, syncCurrentBoardToBackend } = get();
        console.log('🔄 Auto-sync check - pendingChanges:', pendingChanges);
        if (pendingChanges) {
          console.log('💾 Auto-syncing board to backend...');
          await syncCurrentBoardToBackend();
        }
      }, 10000); // Reduced to 10 seconds for testing
      set({ autoSyncInterval: interval });
    },

    stopAutoSync: () => {
      const { autoSyncInterval } = get();
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        set({ autoSyncInterval: null });
      }
    },

    toggleAutoSync: () => {
      set((state) => {
        const newState = { autoSyncEnabled: !state.autoSyncEnabled };
        if (newState.autoSyncEnabled) {
          // Start auto-sync in next tick to ensure state is updated
          setTimeout(() => get().startAutoSync(), 0);
        } else {
          get().stopAutoSync();
        }
        return newState;
      });
    },

    markPendingChanges: () => {
      console.log('📝 Marking pending changes...');
      set({ pendingChanges: true });
      
      // Sync immediately instead of waiting for the timer
      const authStore = useAuthStore.getState();
      if (authStore.isAuthenticated) {
        console.log('⚡ Triggering immediate sync...');
        // Use setTimeout to avoid blocking the UI
        setTimeout(() => {
          get().syncCurrentBoardToBackend();
        }, 100);
      }
    },
  };
});

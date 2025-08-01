import React, { useState, useEffect } from 'react';
import { FileText, Brain, Clock } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { PgnModal } from './PgnModal';
import { useStockfish } from '../hooks/useStockfish';
import AIExplanation from './AIExplanation';

// Utility function to get piece information from a move
const getPieceInfo = (move: string, gameState: any) => {
  if (!move || !gameState) return { piece: '', description: move };
  
  try {
    // Try to get piece information from the current game state
    const game = gameState.game || gameState;
    if (game && typeof game.get === 'function') {
      // Handle both raw moves (e.g. "b8c6") and formatted moves (e.g. "Nb8c6")
      let fromSquare: string;
      
      // Check if move starts with a piece symbol (capital letter)
      if (move.length >= 5 && /^[NBRQK]/.test(move)) {
        // Formatted move like "Nb8c6" - extract the from square after the piece symbol
        fromSquare = move.substring(1, 3);
      } else if (move.length >= 4) {
        // Raw move like "b8c6" - first two characters are the from square
        fromSquare = move.substring(0, 2);
      } else {
        return { piece: '', description: move };
      }
      
      const piece = game.get(fromSquare);
      
      if (piece) {
        const pieceNames: Record<string, string> = {
          'p': 'Pawn',
          'P': 'Pawn',
          'r': 'Rook',
          'R': 'Rook', 
          'n': 'Knight',
          'N': 'Knight',
          'b': 'Bishop',
          'B': 'Bishop',
          'q': 'Queen',
          'Q': 'Queen',
          'k': 'King',
          'K': 'King'
        };
        
        const pieceName = pieceNames[piece.type] || piece.type.toUpperCase();
        const color = piece.color === 'w' ? 'White' : 'Black';
        
        // Extract the actual move part (without piece symbol if present)
        const cleanMove = /^[NBRQK]/.test(move) ? move.substring(1) : move;
        
        return {
          piece: pieceName,
          description: `${color} ${pieceName} ${cleanMove}`
        };
      }
    }
  } catch (error) {
    console.log('Could not get piece info:', error);
  }
  
  return { piece: '', description: move };
};

export const GameControls: React.FC = () => {
  const { 
    setPosition, 
    gameState,
    game,
    engineOptions,
    setEngineOptions,
    engineThinking,
    analysisResults
  } = useChessStore();
  const [fenInput, setFenInput] = useState(gameState?.fen || '');
  const [isPgnModalOpen, setIsPgnModalOpen] = useState(false);
  
  const { analyzePosition, isReady } = useStockfish();
  
  const handleAnalyze = () => {
    if (isReady && !engineThinking) {
      analyzePosition();
    }
  };
  
  // Update FEN input when game state changes
  useEffect(() => {
    if (gameState?.fen) {
      setFenInput(gameState.fen);
    }
  }, [gameState?.fen]);

  const handleSetFen = () => {
    if (fenInput.trim()) {
      setPosition(fenInput.trim());
      // Don't clear the FEN input - it will be updated by the useEffect when gameState changes
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSetFen();
    }
  };

  const handleFenInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when the input is focused
    e.target.select();
  };


  return (
    <div className="game-controls">
      <div className="control-group">
        <div className="fen-label-container">
          <label>FEN Position:</label>
          <div className="fen-header-buttons">
            <button 
              onClick={() => setIsPgnModalOpen(true)}
              className="btn btn-secondary btn-small"
              title="Load a chess game from PGN notation"
            >
              <FileText size={14} />
              Load PGN
            </button>
          </div>
        </div>
        <div className="fen-input-container">
          <input
            type="text"
            value={fenInput}
            onChange={(e) => setFenInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleFenInputFocus}
            placeholder="Enter FEN position..."
            className="fen-input-field"
            spellCheck="false"
          />
          <button 
            onClick={handleSetFen}
            className="btn btn-secondary"
            disabled={!fenInput.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="10" y="3" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="17" y="3" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="3" y="10" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="10" y="10" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3"/>
              <rect x="17" y="10" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="3" y="17" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="10" y="17" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="17" y="17" width="4" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            Set Position
          </button>
        </div>
      </div>

      <div className="control-group">
        <div className="turn-indicator">
          <div className={`turn-badge ${gameState?.turn === 'w' ? 'active' : ''}`}>
            ♔
          </div>
          <div className={`turn-badge ${gameState?.turn === 'b' ? 'active' : ''}`}>
            ♚
          </div>
        </div>
      </div>

      <div className="control-group">
        <div className="engine-analysis-section">
          <div className="engine-controls-row">
            <div className="think-time-container">
              <Clock size={16} />
              <label htmlFor="thinkTime">Think Time:</label>
              <select 
                id="thinkTime"
                value={engineOptions.thinkTime}
                onChange={(e) => setEngineOptions({ thinkTime: parseInt(e.target.value) })}
                className="think-time-select"
              >
                <option value={1}>1s</option>
                <option value={2}>2s</option>
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
              </select>
            </div>
            <button
              className={`btn-calculate-best-move ${engineThinking ? 'thinking' : ''}`}
              onClick={handleAnalyze}
              disabled={engineThinking}
              title="Analyze current position with Stockfish engine"
            >
              <Brain size={16} />
              {engineThinking ? 'Analyzing...' : 'Calculate Best Move'}
            </button>
            {analysisResults?.[0]?.bestMove && (() => {
              const bestMove = analysisResults[0].bestMove;
              const pieceInfo = getPieceInfo(bestMove, game);
              
              // Extract clean move (remove piece symbol if present)
              const cleanMove = /^[NBRQK]/.test(bestMove) ? bestMove.substring(1) : bestMove;
              
              return (
                <span 
                  className="best-move-value" 
                  title={pieceInfo.description !== bestMove ? pieceInfo.description : undefined}
                >
                  {pieceInfo.piece ? `${pieceInfo.piece}: ${cleanMove}` : bestMove}
                </span>
              );
            })()}
          </div>
          
          <AIExplanation />
          
          {/* Compact Progress bars */}
          <div className="progress-bars-section-compact">
            <div className="progress-item-compact">
              <div className="progress-label-compact">Analysis Progress</div>
              <progress id="analysisProgress" value="0" max="100" className="progress-compact"></progress>
            </div>
            <div className="progress-item-compact">
              <div className="progress-label-compact">Time Progress</div>
              <progress id="timeProgress" value="0" max="100" className="progress-compact"></progress>
            </div>
          </div>
        </div>
      </div>
      
      <PgnModal 
        isOpen={isPgnModalOpen} 
        onClose={() => setIsPgnModalOpen(false)} 
      />
    </div>
  );
};

export default GameControls;

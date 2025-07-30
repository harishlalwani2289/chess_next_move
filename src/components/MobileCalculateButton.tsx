import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { useStockfish } from '../hooks/useStockfish';

export const MobileCalculateButton: React.FC = () => {
  const { engineThinking, analysisResults, gameState } = useChessStore();
  const { analyzePosition, isReady } = useStockfish();
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [lastGameStateFen, setLastGameStateFen] = useState<string | null>(null);

  const handleAnalyze = () => {
    if (isReady && !engineThinking) {
      analyzePosition();
    }
  };

  // Update best move when analysis results change
  useEffect(() => {
    if (analysisResults && analysisResults.length > 0) {
      const firstResult = analysisResults[0];
      if (firstResult && firstResult.bestMove) {
        setBestMove(firstResult.bestMove);
      }
    }
  }, [analysisResults]);

  // Clear best move when position changes (user makes a move)
  useEffect(() => {
    if (gameState && gameState.fen !== lastGameStateFen) {
      if (lastGameStateFen !== null) {
        // Only clear if this is not the initial load
        setBestMove(null);
      }
      setLastGameStateFen(gameState.fen);
    }
  }, [gameState, lastGameStateFen]);

  return (
    <div className="mobile-calculate-section">
      <button
        className={`mobile-calculate-button ${engineThinking ? 'thinking' : ''}`}
        onClick={handleAnalyze}
        disabled={engineThinking}
        title="Analyze current position with Stockfish engine"
      >
        <Brain size={20} />
        {engineThinking ? 'Analyzing...' : 'Calculate Best Move'}
      </button>
      {bestMove && (
        <div className="best-move-display">
          <span className="best-move-value">{bestMove}</span>
        </div>
      )}
    </div>
  );
};

export default MobileCalculateButton;

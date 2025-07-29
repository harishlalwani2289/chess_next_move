import React from 'react';
import { Brain } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { useStockfish } from '../hooks/useStockfish';

export const MobileCalculateButton: React.FC = () => {
  const { engineThinking } = useChessStore();
  const { analyzePosition, isReady } = useStockfish();

  const handleAnalyze = () => {
    if (isReady && !engineThinking) {
      analyzePosition();
    }
  };

  return (
    <button
      className={`mobile-calculate-button ${engineThinking ? 'thinking' : ''}`}
      onClick={handleAnalyze}
      disabled={engineThinking}
      title="Analyze current position with Stockfish engine"
    >
      <Brain size={20} />
      {engineThinking ? 'Analyzing...' : 'Calculate Best Move'}
    </button>
  );
};

export default MobileCalculateButton;

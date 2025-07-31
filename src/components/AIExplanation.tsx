import React, { useEffect, useState, useRef } from 'react';
import { Info, Loader } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { aiService } from '../services/aiService';

interface TooltipState {
  visible: boolean;
  loading: boolean;
  explanation: string;
  error: string;
  x: number;
  y: number;
  isInitial: boolean;
}

export const AIExplanation: React.FC = () => {
  const {
    analysisResults,
    engineThinking,
    aiExplanationsEnabled,
    gameState,
  } = useChessStore();
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    loading: false,
    explanation: '',
    error: '',
    x: 0,
    y: 0,
    isInitial: false
  });
  const explanationCache = useRef<Map<string, string>>(new Map());

  // Auto-trigger AI explanation for first best move and clear cache when results change
  useEffect(() => {
    explanationCache.current.clear();
    // Clear tooltip
    setTooltip({
      visible: false,
      loading: false,
      explanation: '',
      error: '',
      x: 0,
      y: 0,
      isInitial: false
    });

    // Auto-trigger AI explanation for first best move when AI is enabled and engine is done thinking
    const firstBestMove = analysisResults[0]?.bestMove;
    
    if (firstBestMove && aiExplanationsEnabled && !engineThinking) {
      const firstResult = analysisResults[0];
      if (firstResult && firstResult.bestMove && gameState?.fen) {
        const cacheKey = `${firstResult.bestMove}_${firstResult.evaluation}`;

        // Check cache first
        if (explanationCache.current.has(cacheKey)) {
          setTooltip({
            visible: true,
            loading: false,
            explanation: explanationCache.current.get(cacheKey) || '',
            error: '',
            x: 0,
            y: 0,
            isInitial: false
          });
          return;
        }

        // Set loading state for first best move
        setTooltip({
          visible: true,
          loading: true,
          explanation: '',
          error: '',
          x: 0,
          y: 0,
          isInitial: false
        });

        // Fetch explanation
        aiService.getExplanation({
          position: gameState.fen,
          bestMove: firstResult.bestMove,
          evaluation: firstResult.evaluation,
          principalVariation: firstResult.principalVariation,
        })
        .then((explanation) => {
          console.log('AI Explanation received:', explanation);
          console.log('Explanation text:', explanation.explanation);
          console.log('Setting tooltip with explanation:', explanation.explanation);
          // Cache the explanation
          explanationCache.current.set(cacheKey, explanation.explanation);
          
          setTooltip({
            visible: true,
            loading: false,
            explanation: explanation.explanation,
            error: '',
            x: 0,
            y: 0,
            isInitial: false
          });
        })
        .catch((error) => {
          console.log('AI Explanation error:', error);
          setTooltip({
            visible: true,
            loading: false,
            explanation: '',
            error: 'Explanation will appear here if available',
            x: 0,
            y: 0,
            isInitial: false
          });
        });
      }
    }
  }, [analysisResults, aiExplanationsEnabled, gameState?.fen, engineThinking]);

  // Don't render if AI explanations are disabled or no tooltip data
  if (!aiExplanationsEnabled || !tooltip.visible) {
    return null;
  }

  return (
    <div className="ai-explanation-inline">
      <div className="ai-explanation-header">
        <Info size={16} className="ai-explanation-icon" />
        <label>AI Analysis:</label>
      </div>
      {tooltip.loading ? (
        <div className="ai-explanation-loading">
          <Loader size={14} className="loading-icon" />
          <span>Analyzing move...</span>
        </div>
      ) : (
        <div className="ai-explanation-content">
          {(() => {
            console.log('Rendering explanation - tooltip.explanation:', tooltip.explanation);
            console.log('Rendering explanation - tooltip.error:', tooltip.error);
            return tooltip.explanation || tooltip.error || 'Explanation will appear here if available';
          })()}
        </div>
      )}
    </div>
  );
};

export default AIExplanation;

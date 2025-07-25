import React from 'react';
import { Play, Settings } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { useStockfish } from '../hooks/useStockfish';

export const AnalysisResults: React.FC = () => {
  const {
    analysisResults,
    engineThinking,
    aiExplanationsEnabled,
    toggleAIExplanations,
    makeMove,
  } = useChessStore();

  const { analyzePosition, isReady } = useStockfish();

  const handleMakeMove = (moveStr: string) => {
    if (moveStr && moveStr.length >= 4) {
      const from = moveStr.slice(0, 2);
      const to = moveStr.slice(2, 4);
      const promotion = moveStr.length > 4 ? moveStr.slice(4) : undefined;
      makeMove(from, to, promotion);
    }
  };

  const handleAnalyze = () => {
    if (isReady && !engineThinking) {
      analyzePosition();
    }
  };

  return (
    <div className="analysis-results">
      <div className="results-header">
        <h3>Analysis Results</h3>
        <div className="ai-toggle-container">
          <span className="ai-toggle-label">AI</span>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={aiExplanationsEnabled}
              onChange={toggleAIExplanations}
            />
            <span className="toggle-slider"></span>
          </label>
          <button className="btn btn-small" title="Configure AI API Keys">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <button 
        className={`btn btn-primary analyze-btn ${engineThinking ? 'thinking' : ''}`}
        onClick={handleAnalyze}
        disabled={!isReady || engineThinking}
      >
        {engineThinking ? 'Analyzing...' : 'Calculate Best Move'}
      </button>

      <div className="results-list">
        {analysisResults.slice(0, 3).map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-header">
              <label>Best Move #{result.moveNumber}:</label>
              <div className="result-values">
                <input 
                  type="text" 
                  value={result.bestMove} 
                  readOnly 
                  className="move-input"
                />
                <input 
                  type="text" 
                  value={result.evaluation} 
                  readOnly 
                  className="eval-input"
                />
              </div>
            </div>
            
            <div className="move-details">
              <button 
                className="make-move-btn"
                onClick={() => handleMakeMove(result.bestMove)}
                disabled={!result.bestMove}
              >
                <Play size={14} />
                Make Move
              </button>
            </div>

            <div className="principal-variation">
              <label>Principal Variation:</label>
              <textarea 
                value={result.principalVariation} 
                readOnly 
                rows={2}
                className="pv-textarea"
              />
            </div>
          </div>
        ))}
      </div>

      {engineThinking && (
        <div className="analysis-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <span>Analyzing position...</span>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;

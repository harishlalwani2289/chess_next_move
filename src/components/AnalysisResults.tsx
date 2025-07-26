import React from 'react';
import { Play, Settings } from 'lucide-react';
import { useChessStore } from '../store/chessStore';

export const AnalysisResults: React.FC = () => {
  const {
    analysisResults,
    engineThinking,
    aiExplanationsEnabled,
    toggleAIExplanations,
    makeMove,
  } = useChessStore();

  const handleMakeMove = (moveStr: string) => {
    if (moveStr && moveStr.length >= 4) {
      // Remove piece notation if present (e.g., "Qe6e7" -> "e6e7")
      let cleanMove = moveStr;
      if (moveStr.length > 4 && /^[a-zA-Z]/.test(moveStr)) {
        cleanMove = moveStr.slice(1); // Remove piece letter
      }
      
      const from = cleanMove.slice(0, 2);
      const to = cleanMove.slice(2, 4);
      const promotion = cleanMove.length > 4 ? cleanMove.slice(4) : undefined;
      makeMove(from, to, promotion);
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

      <div className="results-list">
        {analysisResults.slice(0, 3).map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-header">
              <div className="best-move-label">
                <label>Best Move #{result.moveNumber}:</label>
                <button 
                  className="make-move-icon-btn-small"
                  onClick={() => handleMakeMove(result.bestMove)}
                  disabled={!result.bestMove}
                  title="Make Move"
                >
                  <Play size={12} />
                </button>
              </div>
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

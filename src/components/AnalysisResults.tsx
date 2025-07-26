import React, { useEffect, useState, useRef } from 'react';
import { Play, Settings, Info, Loader } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { aiService } from '../services/aiService';
import AISettingsModal from './AISettingsModal';

interface TooltipState {
  visible: boolean;
  loading: boolean;
  explanation: string;
  error: string;
  x: number;
  y: number;
}

export const AnalysisResults: React.FC = () => {
  const {
    analysisResults,
    engineThinking,
    aiExplanationsEnabled,
    toggleAIExplanations,
    makeMove,
    gameState,
  } = useChessStore();
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [tooltips, setTooltips] = useState<Record<number, TooltipState>>({});
  const tooltipRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const iconRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const hoverTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const explanationCache = useRef<Map<string, string>>(new Map());

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

  const positionTooltip = (index: number) => {
    const icon = iconRefs.current[index];
    if (!icon) return;

    const iconRect = icon.getBoundingClientRect();
    const tooltipLeft = iconRect.right + 5;
    const tooltipTop = iconRect.top - 5;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 400;
    const tooltipHeight = 100; // Approximate height
    
    let finalLeft = tooltipLeft;
    let finalTop = tooltipTop;
    
    // Adjust if tooltip would go off-screen to the right
    if (tooltipLeft + tooltipWidth > viewportWidth) {
      finalLeft = iconRect.left - tooltipWidth - 5;
    }
    
    // Adjust if tooltip would go off-screen at the top
    if (tooltipTop < 0) {
      finalTop = iconRect.bottom + 5;
    }
    
    // Adjust if tooltip would go off-screen at the bottom
    if (finalTop + tooltipHeight > viewportHeight) {
      finalTop = iconRect.top - tooltipHeight - 5;
    }
    
    // Ensure tooltip doesn't go off-screen to the left
    if (finalLeft < 5) {
      finalLeft = 5;
    }
    
    setTooltips(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        x: finalLeft,
        y: finalTop
      }
    }));
  };

  const handleIconHover = (index: number, result: any) => {
    // Clear any existing timeout
    if (hoverTimeouts.current[index]) {
      clearTimeout(hoverTimeouts.current[index]);
    }

    // Position tooltip
    positionTooltip(index);

    // Show tooltip immediately
    setTooltips(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        visible: true,
        loading: false,
        explanation: '',
        error: '',
        x: prev[index]?.x || 0,
        y: prev[index]?.y || 0
      }
    }));

    // Check cache first
    const cacheKey = `${result.bestMove}_${result.evaluation}`;
    if (explanationCache.current.has(cacheKey)) {
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          explanation: explanationCache.current.get(cacheKey) || '',
          loading: false
        }
      }));
      return;
    }

    // Check if AI explanations are enabled
    if (!aiExplanationsEnabled) {
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          explanation: 'Enable AI explanations to get move analysis',
          loading: false
        }
      }));
      return;
    }

    if (!result.bestMove) {
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          explanation: 'No move available to explain',
          loading: false
        }
      }));
      return;
    }

    // Start loading
    setTooltips(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        loading: true,
        explanation: '',
        error: ''
      }
    }));

    // Fetch explanation
    aiService.getExplanation({
      position: gameState.fen,
      bestMove: result.bestMove,
      evaluation: result.evaluation,
      principalVariation: result.principalVariation,
    })
    .then((explanation) => {
      // Cache the explanation
      explanationCache.current.set(cacheKey, explanation.explanation);
      
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          explanation: explanation.explanation,
          loading: false,
          error: ''
        }
      }));
    })
    .catch(() => {
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          explanation: '',
          loading: false,
          error: 'Unable to generate explanation at this time'
        }
      }));
    });
  };

  const handleIconLeave = (index: number) => {
    if (hoverTimeouts.current[index]) {
      clearTimeout(hoverTimeouts.current[index]);
    }

    hoverTimeouts.current[index] = setTimeout(() => {
      setTooltips(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          visible: false
        }
      }));
    }, 100);
  };

  const handleTooltipEnter = (index: number) => {
    if (hoverTimeouts.current[index]) {
      clearTimeout(hoverTimeouts.current[index]);
    }
    setTooltips(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        visible: true
      }
    }));
  };

  const handleTooltipLeave = (index: number) => {
    setTooltips(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        visible: false
      }
    }));
  };

  // Clear explanations cache when analysis results change
  useEffect(() => {
    explanationCache.current.clear();
  }, [analysisResults]);

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
          <button 
            className="btn btn-small" 
            title="Configure AI API Keys"
            onClick={() => setIsAiSettingsOpen(true)}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="results-list">
        {analysisResults.slice(0, 3).map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-header">
              <div className="best-move-label">
                <label>
                  Best Move #{result.moveNumber}:
                  <button
                    ref={el => { iconRefs.current[index] = el; }}
                    className="ai-info-icon"
                    style={{ display: aiExplanationsEnabled ? 'inline' : 'none' }}
                    title="Hover for AI explanation"
                    onMouseEnter={() => handleIconHover(index, result)}
                    onMouseLeave={() => handleIconLeave(index)}
                  >
                    <Info size={16} />
                  </button>
                </label>
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

            {/* AI Tooltip */}
            {tooltips[index]?.visible && (
              <div 
                ref={el => { tooltipRefs.current[index] = el; }}
                className="ai-tooltip visible"
                style={{
                  position: 'fixed',
                  left: `${tooltips[index].x}px`,
                  top: `${tooltips[index].y}px`,
                  zIndex: 9999
                }}
                onMouseEnter={() => handleTooltipEnter(index)}
                onMouseLeave={() => handleTooltipLeave(index)}
              >
                {tooltips[index].loading ? (
                  <div className="ai-loading">
                    <Loader size={16} className="spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="ai-content">
                    <div className="ai-text">
                      {tooltips[index].explanation || tooltips[index].error || 'Hover to get AI explanation'}
                    </div>
                  </div>
                )}
              </div>
            )}
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
      
      <AISettingsModal 
        isOpen={isAiSettingsOpen} 
        onClose={() => setIsAiSettingsOpen(false)} 
      />
    </div>
  );
};

export default AnalysisResults;

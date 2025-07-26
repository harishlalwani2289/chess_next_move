import React from 'react';
import { RotateCcw, Square, SkipBack, SkipForward, Grid3x3 } from 'lucide-react';
import { useChessStore } from '../store/chessStore';

export const BoardControls: React.FC = () => {
  const {
    resetToStartPosition,
    clearBoard,
    flipBoard,
    navigateToPrevious,
    navigateToNext,
    currentHistoryIndex,
    moveHistory,
  } = useChessStore();

  const canNavigateBack = currentHistoryIndex > 0;
  const canNavigateForward = currentHistoryIndex < moveHistory.length - 1;
  const hasGameLoaded = moveHistory.length > 1; // Hide position navigation when game is loaded

  return (
    <div className="board-controls">
      <div className="control-group">
        <label>Board Controls:</label>
        <div className="control-buttons">
          <button 
            className="btn btn-secondary"
            onClick={resetToStartPosition}
            title="Reset to starting position"
          >
            <Grid3x3 size={16} />
            Start Position
          </button>
          <button 
            className="btn btn-secondary"
            onClick={clearBoard}
            title="Clear all pieces"
          >
            <Square size={16} />
            Clear Board
          </button>
          <button 
            className="btn btn-secondary"
            onClick={flipBoard}
            title="Flip board orientation"
          >
            <RotateCcw size={16} />
            Flip Board
          </button>
        </div>
      </div>

      {!hasGameLoaded && (
        <div className="control-group">
          <label>Position Navigation:</label>
          <div className="navigation-controls">
            <button 
              className="btn btn-secondary"
              onClick={navigateToPrevious}
              disabled={!canNavigateBack}
              title="Previous position"
            >
              <SkipBack size={16} />
              Previous
            </button>
            <button 
              className="btn btn-secondary"
              onClick={navigateToNext}
              disabled={!canNavigateForward}
              title="Next position"
            >
              <SkipForward size={16} />
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default BoardControls;

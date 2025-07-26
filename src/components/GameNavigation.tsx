import React from 'react';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { useChessStore } from '../store/chessStore';

export const GameNavigation: React.FC = () => {
  const { 
    moveHistory, 
    currentHistoryIndex, 
    navigateToPrevious, 
    navigateToNext,
    resetToStartPosition
  } = useChessStore();

  const canGoBack = currentHistoryIndex > 0;
  const canGoForward = currentHistoryIndex < moveHistory.length - 1;
  const hasGameLoaded = moveHistory.length > 1;

  if (!hasGameLoaded) {
    return null;
  }

  const handleNavigateToEnd = () => {
    // Navigate to the last position in history
    const store = useChessStore.getState();
    const targetIndex = moveHistory.length - 1;
    if (currentHistoryIndex < targetIndex) {
      const targetState = moveHistory[targetIndex];
      store.restoreState(targetState);
      // Update the current index manually
      useChessStore.setState({ currentHistoryIndex: targetIndex });
    }
  };

  return (
    <div className="game-navigation">
      <h3>Game Navigation</h3>
      <div className="navigation-buttons">
        <button
          className="btn btn-nav"
          onClick={resetToStartPosition}
          disabled={!canGoBack}
          title="Go to start"
        >
          <SkipBack size={16} />
        </button>
        
        <button
          className="btn btn-nav"
          onClick={navigateToPrevious}
          disabled={!canGoBack}
          title="Previous move"
        >
          <ChevronLeft size={16} />
        </button>
        
        <span className="move-indicator">
          {currentHistoryIndex + 1} / {moveHistory.length}
        </span>
        
        <button
          className="btn btn-nav"
          onClick={navigateToNext}
          disabled={!canGoForward}
          title="Next move"
        >
          <ChevronRight size={16} />
        </button>
        
        <button
          className="btn btn-nav"
          onClick={handleNavigateToEnd}
          disabled={!canGoForward}
          title="Go to end"
        >
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
};

export default GameNavigation;

import React from 'react';
import { useChessStore } from '../store/chessStore';

export const BoardNameDisplay: React.FC = () => {
  const { getCurrentBoard } = useChessStore();
  const currentBoard = getCurrentBoard();

  return (
    <div className="board-name-display">
      <h3 className="current-board-name">
        {currentBoard?.name || 'No Board Selected'}
      </h3>
    </div>
  );
};

export default BoardNameDisplay;

import React, { useRef } from 'react';
import { useChessStore } from '../store/chessStore';

type PieceRole = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type PieceColor = 'white' | 'black';

interface Piece {
  role: PieceRole;
  color: PieceColor;
}

interface SparePiecesProps {
  color: PieceColor;
  position: 'top' | 'bottom';
}

export const SparePieces: React.FC<SparePiecesProps> = ({ color, position }) => {
  const sparePiecesRef = useRef<HTMLDivElement>(null);
  const { chessgroundInstance, getCurrentBoard } = useChessStore();
  
  // Get current board orientation
  const currentBoard = getCurrentBoard();
  const boardOrientation = currentBoard?.boardOrientation || 'white';
  
  // Determine which color should be shown based on position and orientation
  const shouldShow = (boardOrientation === 'white' && ((position === 'top' && color === 'black') || (position === 'bottom' && color === 'white'))) ||
                     (boardOrientation === 'black' && ((position === 'top' && color === 'white') || (position === 'bottom' && color === 'black')));

  // Don't render if this position shouldn't show this color
  if (!shouldShow) {
    return null;
  }

  // Define pieces for the specified color
  const pieces: Piece[] = [
    { role: 'king', color },
    { role: 'queen', color },
    { role: 'rook', color },
    { role: 'bishop', color },
    { role: 'knight', color },
    { role: 'pawn', color },
  ];

  // Handle drag start for pieces
  const handleDragStart = (piece: Piece, event: React.DragEvent<HTMLDivElement>) => {
    // Store piece data for the drop handler
    event.dataTransfer.setData('application/json', JSON.stringify(piece));
    event.dataTransfer.effectAllowed = 'copy';
    
    // Add visual feedback
    event.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
    // Reset visual feedback
    event.currentTarget.style.opacity = '1';
  };

  // Handle mouse down for Chessground integration
  const handleMouseDown = (piece: Piece, event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent default drag behavior to allow Chessground to handle it
    event.preventDefault();
    
    // Use the chessground instance from the store
    if (chessgroundInstance && chessgroundInstance.dragNewPiece) {
      try {
        chessgroundInstance.dragNewPiece(piece, event.nativeEvent);
      } catch (error) {
        console.warn('Failed to use Chessground dragNewPiece:', error);
      }
    }
  };

  return (
    <div className={`spare-pieces-container spare-pieces-${position} spare-pieces-${color}`}>
      <div className="spare-pieces-grid" ref={sparePiecesRef}>
        {pieces.map((piece, index) => (
          <div
            key={`${piece.color}-${piece.role}-${index}`}
            className={`spare-piece piece ${piece.role} ${piece.color}`}
            draggable
            onDragStart={(e) => handleDragStart(piece, e)}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => handleMouseDown(piece, e)}
            title={`${piece.color} ${piece.role}`}
          >
            {/* The piece appearance will be handled by CSS, similar to chessground */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SparePieces;

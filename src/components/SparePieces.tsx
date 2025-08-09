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
    console.log('🖱️ MOUSE DOWN: Mouse event detected for piece:', piece);
    
    // Prevent default drag behavior to allow Chessground to handle it
    event.preventDefault();
    
    // Use the chessground instance from the store
    if (chessgroundInstance && chessgroundInstance.dragNewPiece) {
      try {
        console.log('🚀 MOUSE DOWN: Calling chessground dragNewPiece...');
        chessgroundInstance.dragNewPiece(piece, event.nativeEvent);
        console.log('✅ MOUSE DOWN: Successfully initiated drag for desktop');
      } catch (error) {
        console.error('❌ MOUSE DOWN: Failed to use Chessground dragNewPiece:', error);
      }
    } else {
      console.warn('⚠️ MOUSE DOWN: No chessground instance or dragNewPiece method available');
    }
  };

  // Handle touch start for mobile devices
  const handleTouchStart = (piece: Piece, event: React.TouchEvent<HTMLDivElement>) => {
    console.log('🔥 TOUCH START: Touch event detected for piece:', piece);
    
    // Prevent default touch behavior
    event.preventDefault();
    
    // Add visual feedback immediately
    const target = event.currentTarget;
    target.classList.add('dragging');
    
    // Add a visual drag indicator
    const dragIndicator = document.createElement('div');
    dragIndicator.className = 'drag-indicator';
    dragIndicator.textContent = `${piece.role.charAt(0).toUpperCase() + piece.role.slice(1)}`;
    dragIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: bold;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    document.body.appendChild(dragIndicator);
    
    // Store reference to remove later
    target.setAttribute('data-drag-indicator', 'true');
    
    // Use the chessground instance from the store for touch events
    if (chessgroundInstance && chessgroundInstance.dragNewPiece) {
      try {
        // Convert touch event to a format chessground can understand
        const touch = event.touches[0];
        console.log('📱 TOUCH START: Converting touch to mouse event', {
          clientX: touch.clientX,
          clientY: touch.clientY
        });
        
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          button: 0,
          buttons: 1,
          bubbles: true,
          cancelable: true,
        });
        
        console.log('🚀 TOUCH START: Calling chessground dragNewPiece...');
        chessgroundInstance.dragNewPiece(piece, mouseEvent);
        console.log('✅ TOUCH START: Successfully initiated drag for mobile');
      } catch (error) {
        console.error('❌ TOUCH START: Failed to use Chessground dragNewPiece with touch:', error);
        // Remove visual feedback if drag failed
        target.classList.remove('dragging');
        const indicator = document.querySelector('.drag-indicator');
        if (indicator) indicator.remove();
      }
    } else {
      console.warn('⚠️ TOUCH START: No chessground instance or dragNewPiece method available');
      // Remove visual feedback if no chessground
      target.classList.remove('dragging');
      const indicator = document.querySelector('.drag-indicator');
      if (indicator) indicator.remove();
    }
  };

  // Handle touch end for mobile devices
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    // Remove visual feedback
    event.currentTarget.classList.remove('dragging');
    
    // Remove drag indicator
    const indicator = document.querySelector('.drag-indicator');
    if (indicator) {
      indicator.remove();
    }
  };

  // Handle touch cancel for mobile devices  
  const handleTouchCancel = (event: React.TouchEvent<HTMLDivElement>) => {
    // Remove visual feedback
    event.currentTarget.classList.remove('dragging');
    
    // Remove drag indicator
    const indicator = document.querySelector('.drag-indicator');
    if (indicator) {
      indicator.remove();
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
            onTouchStart={(e) => handleTouchStart(piece, e)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
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

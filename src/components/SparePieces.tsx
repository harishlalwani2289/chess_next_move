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

  // Define pieces for the specified color (excluding kings)
  const pieces: Piece[] = [
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
    
    const target = event.currentTarget;
    const touch = event.touches[0];
    
    // Store touch data for the timeout
    const touchData = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      piece,
      target
    };
    
    // Add initial visual feedback to indicate touch is registered
    target.classList.add('touch-hold');
    
    // Create a progress indicator for the hold duration
    const holdIndicator = document.createElement('div');
    holdIndicator.className = 'hold-progress-indicator';
    holdIndicator.style.cssText = `
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0%;
      height: 3px;
      background: rgba(0, 123, 255, 0.8);
      border-radius: 2px;
      transition: width 0.5s linear;
      z-index: 1000;
    `;
    target.appendChild(holdIndicator);
    
    // Start the progress animation
    requestAnimationFrame(() => {
      holdIndicator.style.width = '100%';
    });
    
    // Set a timeout for 500ms before enabling drag
    const dragTimeout = setTimeout(() => {
      console.log('🕒 TOUCH HOLD: 500ms elapsed, piece is now ready to drag');
      
      // Remove hold indicator and mark as drag-ready
      target.classList.remove('touch-hold');
      target.classList.add('drag-ready');
      holdIndicator.remove();
      
      // Add a visual indicator that piece is ready to drag
      const readyIndicator = document.createElement('div');
      readyIndicator.className = 'drag-ready-indicator';
      readyIndicator.textContent = '✓ Ready to drag';
      readyIndicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 200, 0, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0, 200, 0, 0.3);
      `;
      document.body.appendChild(readyIndicator);
      
      // Remove the ready indicator after 1 second
      setTimeout(() => {
        if (readyIndicator.parentNode) {
          readyIndicator.remove();
        }
      }, 1000);
      
      // Mark the piece as drag-enabled
      target.setAttribute('data-drag-enabled', 'true');
      
    }, 500); // 500ms delay
    
    // Store timeout ID and touch data to clear it if touch ends early
    target.setAttribute('data-drag-timeout', dragTimeout.toString());
    target.setAttribute('data-touch-data', JSON.stringify(touchData));
  };

  // Handle touch move for mobile devices - start drag if piece is enabled
  const handleTouchMove = (piece: Piece, event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isDragEnabled = target.getAttribute('data-drag-enabled') === 'true';
    
    // Only start dragging if the piece has been held for 0.5 seconds
    if (isDragEnabled && !target.classList.contains('dragging')) {
      console.log('🚀 TOUCH MOVE: Starting drag for enabled piece');
      
      // Get stored touch data
      const touchDataStr = target.getAttribute('data-touch-data');
      if (!touchDataStr) return;
      
      const touchData = JSON.parse(touchDataStr);
      
      // Add dragging state
      target.classList.add('dragging');
      target.classList.remove('drag-ready');
      
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
      
      // Remove ready indicator if it exists
      const readyIndicator = document.querySelector('.drag-ready-indicator');
      if (readyIndicator) {
        readyIndicator.remove();
      }
      
      // Use the chessground instance from the store for touch events
      if (chessgroundInstance && chessgroundInstance.dragNewPiece) {
        try {
          console.log('📱 TOUCH MOVE: Converting touch to mouse event', {
            clientX: touchData.clientX,
            clientY: touchData.clientY
          });
          
          const mouseEvent = new MouseEvent('mousedown', {
            clientX: touchData.clientX,
            clientY: touchData.clientY,
            button: 0,
            buttons: 1,
            bubbles: true,
            cancelable: true,
          });
          
          console.log('🚀 TOUCH MOVE: Calling chessground dragNewPiece...');
          chessgroundInstance.dragNewPiece(piece, mouseEvent);
          console.log('✅ TOUCH MOVE: Successfully initiated drag for mobile');
        } catch (error) {
          console.error('❌ TOUCH MOVE: Failed to use Chessground dragNewPiece with touch:', error);
          // Remove visual feedback if drag failed
          target.classList.remove('dragging');
          const indicator = document.querySelector('.drag-indicator');
          if (indicator) indicator.remove();
        }
      } else {
        console.warn('⚠️ TOUCH MOVE: No chessground instance or dragNewPiece method available');
        // Remove visual feedback if no chessground
        target.classList.remove('dragging');
        const indicator = document.querySelector('.drag-indicator');
        if (indicator) indicator.remove();
      }
    }
  };

  // Handle touch end for mobile devices
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    
    // Clear the drag timeout if it exists
    const timeoutId = target.getAttribute('data-drag-timeout');
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      target.removeAttribute('data-drag-timeout');
    }
    
    // Remove all visual feedback classes and attributes
    target.classList.remove('dragging', 'touch-hold', 'drag-ready');
    target.removeAttribute('data-drag-enabled');
    target.removeAttribute('data-touch-data');
    
    // Remove progress indicator if it exists
    const holdIndicator = target.querySelector('.hold-progress-indicator');
    if (holdIndicator) {
      holdIndicator.remove();
    }
    
    // Remove drag indicator
    const indicator = document.querySelector('.drag-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    // Remove ready indicator
    const readyIndicator = document.querySelector('.drag-ready-indicator');
    if (readyIndicator) {
      readyIndicator.remove();
    }
  };

  // Handle touch cancel for mobile devices  
  const handleTouchCancel = (event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    
    // Clear the drag timeout if it exists
    const timeoutId = target.getAttribute('data-drag-timeout');
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      target.removeAttribute('data-drag-timeout');
    }
    
    // Remove all visual feedback classes and attributes
    target.classList.remove('dragging', 'touch-hold', 'drag-ready');
    target.removeAttribute('data-drag-enabled');
    target.removeAttribute('data-touch-data');
    
    // Remove progress indicator if it exists
    const holdIndicator = target.querySelector('.hold-progress-indicator');
    if (holdIndicator) {
      holdIndicator.remove();
    }
    
    // Remove drag indicator
    const indicator = document.querySelector('.drag-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    // Remove ready indicator
    const readyIndicator = document.querySelector('.drag-ready-indicator');
    if (readyIndicator) {
      readyIndicator.remove();
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
            onTouchMove={(e) => handleTouchMove(piece, e)}
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

import React, { useEffect, useRef } from 'react';
import { useChessStore } from '../store/chessStore';
import { Chessground } from 'chessground';


type Key = string;
type DrawShape = {
  orig: Key;
  dest?: Key;
  brush: string;
  modifiers?: any;
  piece?: any;
  customSvg?: string;
  label?: { text: string };
};

interface ChessBoardProps {
  width?: number;
}


export const ChessBoard: React.FC<ChessBoardProps> = ({ width = 500 }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<any>(null);
  
  const {
    gameState,
    boardOrientation,
    makeMove,
    game,
    analysisResults,
    engineOptions,
  } = useChessStore();

  // Helper function to create custom SVG circles for better visibility
  const createCustomSvgCircle = (color: string, opacity: number = 0.3) => {
    return `<circle cx="50" cy="50" r="45" fill="${color}" opacity="${opacity}" stroke="${color}" stroke-width="2"/>`;
  };

  // Initialize Chessground
  useEffect(() => {
    if (!boardRef.current) return;

    console.log('Initializing Chessground board with npm package...');

    const config = {
      fen: gameState.fen,
      orientation: boardOrientation as 'white' | 'black',
      turnColor: gameState.turn === 'w' ? 'white' as const : 'black' as const,
      movable: {
        free: false,
        color: 'both' as const,
        dests: new Map(),
      },
      events: {
        move: (orig: Key, dest: Key) => {
          console.log(`Move attempt: ${orig} -> ${dest}`);
          const success = makeMove(orig, dest);
          if (!success) {
            // Reset board if move was invalid
            chessgroundRef.current?.set({
              fen: gameState.fen,
              turnColor: gameState.turn === 'w' ? 'white' : 'black',
            });
          }
        },
      },
      drawable: {
        enabled: true,
        visible: true,
        brushes: {
          green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
          red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
          blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
          yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
          // Make pale brushes more visible with thicker strokes and higher opacity
          paleBlue: { key: 'pb', color: '#003088', opacity: 0.8, lineWidth: 25 },
          paleGreen: { key: 'pg', color: '#15781B', opacity: 0.8, lineWidth: 25 },
          paleRed: { key: 'pr', color: '#882020', opacity: 0.8, lineWidth: 25 },
          paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.7, lineWidth: 25 },
          purple: { key: 'purple', color: '#68217a', opacity: 0.8, lineWidth: 10 },
          pink: { key: 'pink', color: '#ee2080', opacity: 0.8, lineWidth: 20 },
          white: { key: 'white', color: 'white', opacity: 1, lineWidth: 15 },
        },
      },
    };

    try {
      chessgroundRef.current = Chessground(boardRef.current, config);
      console.log('Chessground board created successfully');
      
    } catch (error) {
      console.error('Failed to initialize Chessground:', error);
    }
    
    return () => {
      if (chessgroundRef.current) {
        chessgroundRef.current.destroy?.();
      }
    };
  }, []);

  // Update board when game state changes
  useEffect(() => {
    if (chessgroundRef.current) {
      // Calculate legal moves for both white and black pieces
      const dests = new Map<Key, Key[]>();
      const originalFen = game.fen();
      
      // Get legal moves for both colors by temporarily switching turns
      const colors = ['w', 'b'];
      colors.forEach(color => {
        try {
          // Create a temporary FEN with the specified turn
          const fenParts = originalFen.split(' ');
          fenParts[1] = color; // Set the turn
          const tempFen = fenParts.join(' ');
          
          // Load the temporary position
          game.load(tempFen);
          
          // Get all legal moves for this color
          const moves = game.moves({ verbose: true });
          moves.forEach((move: any) => {
            const from = move.from as Key;
            const to = move.to as Key;
            if (!dests.has(from)) {
              dests.set(from, []);
            }
            if (!dests.get(from)!.includes(to)) {
              dests.get(from)!.push(to);
            }
          });
        } catch (e) {
          console.error(`Error calculating moves for ${color}:`, e);
        }
      });
      
      // Restore the original position
      try {
        game.load(originalFen);
      } catch (e) {
        console.error('Error restoring original position:', e);
      }
      
      chessgroundRef.current.set({
        fen: gameState.fen,
        turnColor: gameState.turn === 'w' ? 'white' : 'black',
        movable: {
          free: false,
          color: 'both',
          dests, // Legal destinations for both colors
        },
      });
      
      // Clear arrow numbers and shapes when the game state changes (after moves)
      if (engineOptions.mode !== 'show') {
        const existingNumbers = boardRef.current?.querySelectorAll('.pv-arrow-number');
        existingNumbers?.forEach(el => el.remove());
        chessgroundRef.current.setShapes([]);
      }
      
      // Also apply CSS-based highlighting as fallback
      applyCSSHighlighting();
    }
  }, [gameState.fen, gameState.turn, game, engineOptions.mode]);

  // Apply CSS-based highlighting as fallback
  const applyCSSHighlighting = () => {
    if (!boardRef.current || analysisResults.length === 0) return;
    
    // Remove existing highlight classes
    const squares = boardRef.current.querySelectorAll('.cg-board square');
    squares.forEach(square => {
      square.classList.remove('best-move-highlight', 'pv-highlight-1', 'pv-highlight-2', 'pv-highlight-3', 'pv-highlight-4');
    });
    
    // Add highlighting for best moves
    analysisResults.slice(0, 3).forEach((result, index) => {
      if (result.bestMove && result.bestMove.length >= 4) {
        let move = result.bestMove;
        if (move.length > 4 && /^[a-zA-Z]/.test(move)) {
          move = move.slice(1);
        }
        
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        
        const fromSquare = boardRef.current?.querySelector(`square[data-key="${from}"]`);
        const toSquare = boardRef.current?.querySelector(`square[data-key="${to}"]`);
        
        if (fromSquare) fromSquare.classList.add(`best-move-highlight-${index + 1}`);
        if (toSquare) toSquare.classList.add(`best-move-highlight-${index + 1}`);
      }
    });
    
    // Add highlighting for PV moves
    if (analysisResults.length > 0 && analysisResults[0].principalVariation) {
      const pvMoves = analysisResults[0].principalVariation.split(' ').slice(0, 4);
      
      pvMoves.forEach((moveStr, index) => {
        if (moveStr && moveStr.length >= 4) {
          let move = moveStr;
          if (move.length > 4 && /^[a-zA-Z]/.test(move)) {
            move = move.slice(1);
          }
          
          const from = move.slice(0, 2);
          const to = move.slice(2, 4);
          
          const fromSquare = boardRef.current?.querySelector(`square[data-key="${from}"]`);
          const toSquare = boardRef.current?.querySelector(`square[data-key="${to}"]`);
          
          if (fromSquare) {
            fromSquare.classList.add(`pv-highlight-${index + 1}`);
            fromSquare.setAttribute('data-move-number', (index + 1).toString());
          }
          if (toSquare) {
            toSquare.classList.add(`pv-highlight-${index + 1}`);
            toSquare.setAttribute('data-move-number', (index + 1).toString());
          }
        }
      });
    }
  };

  // Update board orientation
  useEffect(() => {
    if (chessgroundRef.current) {
      chessgroundRef.current.set({
        orientation: boardOrientation as 'white' | 'black',
      });
    }
  }, [boardOrientation]);

  // Add DOM overlay numbers for PV arrows - following original vanilla JS approach
  const addArrowNumbers = (pvMoves: string[]) => {
    // Remove any existing arrow numbers
    const existingNumbers = boardRef.current?.querySelectorAll('.pv-arrow-number');
    existingNumbers?.forEach(el => el.remove());
    
    if (!pvMoves || pvMoves.length === 0 || !boardRef.current) return;
    
    // Find the board element - this is the key difference!
    const boardElement = boardRef.current;
    
    // Set position relative on the board container (like the original)
    boardElement.style.position = 'relative';
    
    // Get the board's dimensions directly from the element
    const boardRect = boardElement.getBoundingClientRect();
    const squareSize = boardRect.width / 8;
    
    console.log('Board rect:', boardRect);
    console.log('Board width:', boardRect.width, 'Square size:', squareSize);
    console.log('Adding arrow numbers for moves:', pvMoves);
    
    pvMoves.forEach((moveStr, index) => {
      if (!moveStr) return;
      
      // Extract move without piece notation if present (same as original)
      const fromSquare = moveStr.slice(0, 2);
      const toSquare = moveStr.slice(2, 4);
      
      console.log(`Arrow ${index + 1}: ${fromSquare} -> ${toSquare}`);
      
      // Convert square notation to coordinates (exactly like original)
      const fromFile = fromSquare.charCodeAt(0) - 97; // a=0, b=1, etc.
      const fromRank = parseInt(fromSquare[1]) - 1;   // 1=0, 2=1, etc.
      const toFile = toSquare.charCodeAt(0) - 97;
      const toRank = parseInt(toSquare[1]) - 1;
      
      // Check board orientation (exactly like original)
      const isFlipped = boardOrientation === 'black';
      
      // Calculate pixel positions (exactly like original)
      const fromX = isFlipped ? (7 - fromFile) * squareSize : fromFile * squareSize;
      const fromY = isFlipped ? fromRank * squareSize : (7 - fromRank) * squareSize;
      const toX = isFlipped ? (7 - toFile) * squareSize : toFile * squareSize;
      const toY = isFlipped ? toRank * squareSize : (7 - toRank) * squareSize;
      
      // Calculate arrow midpoint for number placement (exactly like original)
      const midX = (fromX + toX) / 2 + squareSize / 2;
      const midY = (fromY + toY) / 2 + squareSize / 2;
      
      console.log(`Number ${index + 1} calculated position: (${midX}, ${midY})`);
      
      // Define colors to match arrows (like original)
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']; // Green, Blue, Orange, Purple
      
      // Create numbered circle with nice colors matching the arrows
      const numberElement = document.createElement('div');
      numberElement.className = 'pv-arrow-number';
      numberElement.innerHTML = (index + 1).toString();
      
      // Use inline styles with nice colors - reduced diameter by 25%
      numberElement.style.cssText = `
        position: absolute;
        left: ${midX - 12}px;
        top: ${midY - 12}px;
        width: 24px;
        height: 24px;
        background: ${colors[index] || '#4CAF50'};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 1001;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        border: 2px solid white;
      `;
      
      console.log(`Created number element ${index + 1} at position:`, numberElement.style.left, numberElement.style.top);
      
      // Append to board element (like original .append())
      boardElement.appendChild(numberElement);
      
      // Verify it was added
      console.log('Element added to DOM:', document.contains(numberElement));
    });
    
    // Log all arrow numbers after creation
    const allNumbers = boardElement.querySelectorAll('.pv-arrow-number');
    console.log(`Total arrow numbers created: ${allNumbers.length}`);
  };

  
  // Remove best move highlighting
  const removeBestMoveHighlighting = () => {
    if (!boardRef.current) return;
    
    const cgBoard = boardRef.current.querySelector('.cg-board');
    if (!cgBoard) return;
    
    // Remove all best move highlighting classes and styles
    const highlightedSquares = cgBoard.querySelectorAll('.best-move-from, .best-move-to');
    highlightedSquares.forEach((square: Element) => {
      const squareElement = square as HTMLElement;
      squareElement.classList.remove('best-move-from', 'best-move-to', 'best-move-1', 'best-move-2', 'best-move-3');
      squareElement.style.backgroundColor = '';
      squareElement.style.boxShadow = '';
    });
    
    console.log('Removed best move highlighting from', highlightedSquares.length, 'squares');
  };

  // Highlight best moves with colored square borders and numbered PV sequence
  useEffect(() => {
    console.log('Highlighting effect triggered:', {
      hasChessground: !!chessgroundRef.current,
      analysisResultsLength: analysisResults.length,
      analysisResults: analysisResults,
      engineMode: engineOptions.mode
    });
    
    if (chessgroundRef.current && analysisResults.length > 0 && engineOptions.mode === 'show') {
      const shapes: DrawShape[] = [];
      
      // Helper function to extract squares from formatted move
      const extractSquares = (formattedMove: string) => {
        console.log('Extracting squares from:', formattedMove);
        if (!formattedMove) return null;
        
        // Remove piece letter at the beginning (like 'p', 'K', 'Q', etc.)
        let moveStr = formattedMove;
        if (moveStr.length > 4 && /^[a-zA-Z]/.test(moveStr)) {
          moveStr = moveStr.slice(1); // Remove first character if it's a letter
        }
        
        if (moveStr.length >= 4) {
          const result = {
            from: moveStr.slice(0, 2) as Key,
            to: moveStr.slice(2, 4) as Key
          };
          console.log('Extracted squares:', result);
          return result;
        }
        console.log('Could not extract squares from:', moveStr);
        return null;
      };
      
      // Add square highlighting for top 3 best moves using Chessground's shapes API like original
      const highlightMap = new Map();
      
      // Process each best move result to create highlight map
      analysisResults.slice(0, 3).forEach((result, index) => {
        if (result.bestMove) {
          const squares = extractSquares(result.bestMove);
          if (squares) {
            const movePrefix = `move${index + 1}`;
            
            // Add highlighting with priority (don't override higher priority moves)
            if (!highlightMap.has(squares.from)) {
              highlightMap.set(squares.from, `${movePrefix}-from`);
            }
            if (!highlightMap.has(squares.to)) {
              highlightMap.set(squares.to, `${movePrefix}-to`);
            }
          }
        }
      });
      
      // Convert highlight map to shapes using custom SVG circles for visibility
      console.log('Highlight map entries:', Array.from(highlightMap.entries()));
      highlightMap.forEach((cssClass, square) => {
        let color = '#15781B'; // default green
        let brush = 'green';
        
        if (cssClass.includes('move1')) {
          // Best move - green with different shades for from/to like main branch
          if (cssClass.includes('-from')) {
            color = '#15781B'; // pale green
            brush = 'paleGreen';
          } else {
            color = '#15781B'; // green
            brush = 'green';
          }
        } else if (cssClass.includes('move2')) {
          // Second move - blue
          if (cssClass.includes('-from')) {
            color = '#003088'; // pale blue
            brush = 'paleBlue';
          } else {
            color = '#003088'; // blue
            brush = 'blue';
          }
        } else if (cssClass.includes('move3')) {
          // Third move - red
          if (cssClass.includes('-from')) {
            color = '#882020'; // pale red
            brush = 'paleRed';
          } else {
            color = '#882020'; // red
            brush = 'red';
          }
        }
        
        console.log(`Creating shape for square ${square} with color ${color}`);
        
        // Use custom SVG for "from" squares (pale colors) and regular brush for "to" squares
        if (cssClass.includes('-from')) {
          shapes.push({
            orig: square,
            brush: brush,
            customSvg: createCustomSvgCircle(color, 0.4)
          });
        } else {
          shapes.push({
            orig: square,
            brush: brush,
            customSvg: createCustomSvgCircle(color, 0.6)
          });
        }
      });
      
      // Add arrows for the first best move's PV
      if (analysisResults.length > 0 && analysisResults[0].principalVariation) {
        const pv1 = analysisResults[0].principalVariation;
        
        // Parse the PV moves - extract clean moves without piece notation
        const allTokens = pv1.trim().split(' ');
        const cleanMoves: string[] = [];
        
        // Process each token to extract clean moves
        for (const token of allTokens) {
          let cleanMove = token;
          
          // Remove piece notation if present (e.g., "pe2e4" -> "e2e4")
          if (cleanMove.length > 4 && /^[a-zA-Z]/.test(cleanMove)) {
            cleanMove = cleanMove.slice(1);
          }
          
          // Validate it's a proper move format
          if (cleanMove.length >= 4 && cleanMove.length <= 5 && /^[a-h][1-8][a-h][1-8][qrnb]?$/.test(cleanMove)) {
            cleanMoves.push(cleanMove);
          }
        }
        
        // Take first 4 moves for arrows
        const pvMoves = cleanMoves.slice(0, 4);
        console.log('Clean PV moves for arrows:', pvMoves);
        
        // Add arrows for each PV move
        pvMoves.forEach((moveStr, index) => {
          if (moveStr && moveStr.length >= 4) {
            const fromSquare = moveStr.slice(0, 2) as Key;
            const toSquare = moveStr.slice(2, 4) as Key;
            
            // Add arrow shape
            shapes.push({
              orig: fromSquare,
              dest: toSquare,
              brush: index === 0 ? 'green' : index === 1 ? 'blue' : index === 2 ? 'yellow' : 'purple'
            });
          }
        });
        
        // Add numbered circles on arrows
        setTimeout(() => addArrowNumbers(pvMoves), 100);
      }
      
      // Apply all shapes
      console.log('Setting shapes:', shapes);
      console.log('Chessground state before setShapes:', chessgroundRef.current.state);
      console.log('Drawable enabled:', chessgroundRef.current.state.drawable?.enabled);
      console.log('Drawable visible:', chessgroundRef.current.state.drawable?.visible);
      
      chessgroundRef.current.setShapes(shapes);
      
      // Verify shapes were actually set
      setTimeout(() => {
        console.log('Chessground state after setShapes:', chessgroundRef.current?.state.drawable?.shapes);
        console.log('Drawable shapes length:', chessgroundRef.current?.state.drawable?.shapes?.length || 0);
      }, 100);
    } else if (chessgroundRef.current) {
      chessgroundRef.current.setShapes([]);
      // Remove arrow numbers too
      const existingNumbers = boardRef.current?.querySelectorAll('.pv-arrow-number');
      existingNumbers?.forEach(el => el.remove());
      // Remove best move highlighting too
      removeBestMoveHighlighting();
    }
  }, [analysisResults, boardOrientation, engineOptions.mode]);

  return (
    <div className="chess-board-container">
      <div 
        ref={boardRef}
        className="chessground-board"
        style={{
          width: `${width}px`,
          height: `${width}px`,
        }}
      />
    </div>
  );
};

export default ChessBoard;

import React, { useEffect, useRef } from 'react';
import { useChessStore } from '../store/chessStore';
import { Chessground } from 'chessground';
import { Chess } from 'chess.js';


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


export const ChessBoard: React.FC<ChessBoardProps> = ({ width }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const chessgroundRef = useRef<any>(null);
  
  // Calculate responsive width based on screen size
  const getResponsiveWidth = () => {
    if (width) return width; // Use provided width if specified
    
    const screenWidth = window.innerWidth;
    
    // Ensure minimum width of 200px to prevent board from vanishing
    const minWidth = 200;
    let calculatedWidth;
    
    if (screenWidth <= 480) {
      // Very small mobile: 85% of screen width
      calculatedWidth = Math.max(screenWidth * 0.85, minWidth);
    } else if (screenWidth <= 768) {
      // Mobile: 90% of screen width, max 320px
      calculatedWidth = Math.min(screenWidth * 0.9, 320);
    } else if (screenWidth <= 1024) {
      // Tablet: scale from 320px to 450px
      const progress = (screenWidth - 768) / (1024 - 768);
      calculatedWidth = Math.round(320 + progress * (450 - 320));
    } else if (screenWidth <= 1440) {
      // Medium desktop: scale from 450px to 550px
      const progress = (screenWidth - 1024) / (1440 - 1024);
      calculatedWidth = Math.round(450 + progress * (550 - 450));
    } else {
      // Large desktop: scale from 550px to 650px
      const progress = Math.min((screenWidth - 1440) / 1000, 1); // Cap the scaling
      calculatedWidth = Math.round(550 + progress * (650 - 550));
    }
    
    // Ensure the calculated width is within reasonable bounds
    return Math.max(calculatedWidth, minWidth);
  };
  
  const [boardWidth, setBoardWidth] = React.useState(() => {
    return getResponsiveWidth();
  });
  
  // Update board width on window resize
  React.useEffect(() => {
    const handleResize = () => {
      const newWidth = getResponsiveWidth();
      setBoardWidth(newWidth);
      
      // Force Chessground to redraw after size change
      setTimeout(() => {
        if (chessgroundRef.current) {
          chessgroundRef.current.redrawAll?.();
        }
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);
  
  const {
    gameState,
    boardOrientation,
    makeMove,
    getCurrentBoard,
    engineOptions,
    clearAnalysisResults,
    setChessgroundInstance,
    placePiece,
    updateGameStateOnly,
  } = useChessStore();

  const currentBoard = getCurrentBoard();
  const game = currentBoard?.game;
  const analysisResults = currentBoard?.analysisResults || [];
  

  // Helper function to create custom SVG circles for better visibility
  const createCustomSvgCircle = (color: string, opacity: number = 0.3) => {
    return `<circle cx="50" cy="50" r="45" fill="${color}" opacity="${opacity}" stroke="${color}" stroke-width="2"/>`;
  };
  
  // Function to update board movability
  const updateBoardMovability = () => {
    if (!chessgroundRef.current || !currentBoard?.gameState) return;
    
    const tempGame = new Chess();
    try {
      tempGame.load(currentBoard.gameState.fen);
    } catch (e) {
      console.error('Invalid FEN in updateBoardMovability:', currentBoard.gameState.fen, e);
      return;
    }
    
    // Calculate legal moves for both white and black pieces
    const dests = new Map<Key, Key[]>();
    const originalFen = tempGame.fen();
    
    // Get legal moves for both colors by temporarily switching turns
    const colors = ['w', 'b'];
    colors.forEach(color => {
      try {
        // Create a temporary FEN with the specified turn
        const fenParts = originalFen.split(' ');
        fenParts[1] = color; // Set the turn
        const tempFen = fenParts.join(' ');
        
        // Load the temporary position
        tempGame.load(tempFen);
        
        // Get all legal moves for this color
        const moves = tempGame.moves({ verbose: true });
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
    
    
    chessgroundRef.current.set({
      movable: {
        free: false,
        color: 'both',
        dests, // Legal destinations for both colors
      },
    });
  };

  // Initialize Chessground when board ID changes or board size changes
  useEffect(() => {
    if (!boardRef.current || !currentBoard?.gameState) return;

    const config = {
      fen: currentBoard.gameState.fen,
      orientation: boardOrientation as 'white' | 'black',
      turnColor: currentBoard.gameState.turn === 'w' ? 'white' as const : 'black' as const,
      movable: {
        free: false,
        color: 'both' as const,
        dests: new Map(),
      },
      premovable: {
        enabled: true,
      },
      draggable: {
        enabled: true,
        lift: 0.5,
        deleteOnDropOff: true,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      events: {
        move: (orig: Key, dest: Key) => {
          console.log(`Move attempt: ${orig} -> ${dest}`);
          const success = makeMove(orig, dest);
          if (!success) {
            // Reset board if move was invalid
            const currentGameState = getCurrentBoard()?.gameState;
            if (currentGameState) {
              chessgroundRef.current?.set({
                fen: currentGameState.fen,
                turnColor: currentGameState.turn === 'w' ? 'white' : 'black',
              });
            }
          }
          // Clear analysis results when a move is made
          clearAnalysisResults();
        },
        select: () => {
          // Clear arrow numbers whenever a square is selected/clicked
          const existingNumbers = boardRef.current?.querySelectorAll('.pv-arrow-number');
          existingNumbers?.forEach(el => el.remove());
          
          // Clear analysis results when user clicks on the board
          clearAnalysisResults();
        },
        dropNewPiece: (piece: any, key: Key) => {
          console.log('🎯 DROP NEW PIECE: Dropping new piece:', piece, 'on square:', key);
          console.log('🚀 DROP NEW PIECE: Calling placePiece to update board and sync with backend...');
          placePiece(key, piece);
        },
        change: () => {
          // This event fires when the board position changes (including piece removal)
          if (!chessgroundRef.current) return;
          
          // Use a small delay to ensure the chessground state is fully updated
          setTimeout(() => {
            if (!chessgroundRef.current) return;
            
            const currentFen = chessgroundRef.current.getFen();
            console.log('🔄 DRAG OPERATION: Board position changed via drag to:', currentFen);
            
            // Get the current FEN from the game state
            const currentGameState = getCurrentBoard()?.gameState;
            if (currentGameState) {
              const currentStoreFen = currentGameState.fen.split(' ')[0]; // Just the piece positions
              const newFen = currentFen.split(' ')[0]; // Just the piece positions
              
              console.log('🔍 DRAG OPERATION: Comparing FENs:', {
                store: currentStoreFen,
                chessground: newFen,
                different: currentStoreFen !== newFen
              });
              
              if (currentStoreFen !== newFen) {
                // Reconstruct full FEN with proper metadata
                const fenParts = currentGameState.fen.split(' ');
                const fullFen = [
                  newFen, // new piece positions
                  fenParts[1] || 'w', // active color
                  fenParts[2] || '-', // castling
                  fenParts[3] || '-', // en passant
                  fenParts[4] || '0', // halfmove
                  fenParts[5] || '1'  // fullmove
                ].join(' ');
                
                console.log('📝 DRAG OPERATION: Updating FEN via drag operation:', fullFen);
                console.log('🚀 DRAG OPERATION: Calling updateGameStateOnly to sync with backend...');
                updateGameStateOnly(fullFen);
              } else {
                console.log('✅ DRAG OPERATION: No FEN change detected, skipping update');
              }
            } else {
              console.log('❌ DRAG OPERATION: No current game state found');
            }
          }, 50); // Small delay to ensure chessground has finished updating
        },
      },
      animation: {
        enabled: true,
        duration: 500, // 0.5 seconds for smooth movement
        curve: [0.25, 0.1, 0.25, 1],
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

    // Destroy existing instance if it exists
    if (chessgroundRef.current) {
      chessgroundRef.current.destroy?.();
      chessgroundRef.current = null;
    }
    
    try {
      chessgroundRef.current = Chessground(boardRef.current, config);
      
      // Set the instance in the store so spare pieces can use it
      setChessgroundInstance(chessgroundRef.current);
      
      // Calculate and set legal moves immediately after creation
      updateBoardMovability();
      
      // Force correct dimensions on the Chessground elements
      setTimeout(() => {
        const cgWrap = boardRef.current?.querySelector('.cg-wrap') as HTMLElement;
        const cgBoard = boardRef.current?.querySelector('.cg-board') as HTMLElement;
        
        if (cgWrap) {
          cgWrap.style.width = `${boardWidth}px`;
          cgWrap.style.height = `${boardWidth}px`;
        }
        if (cgBoard) {
          cgBoard.style.width = `${boardWidth}px`;
          cgBoard.style.height = `${boardWidth}px`;
        }
        
        
        // Force redraw after dimension changes
        if (chessgroundRef.current) {
          chessgroundRef.current.redrawAll?.();
        }
      }, 50);
      
    } catch (error) {
      console.error('Failed to initialize Chessground:', error);
    }
    
    return () => {
      if (chessgroundRef.current) {
        chessgroundRef.current.destroy?.();
        chessgroundRef.current = null;
      }
    };
  }, [currentBoard?.id, boardWidth]); // Only re-initialize when switching boards or board size changes

  // Update board when game state changes
  useEffect(() => {
    if (chessgroundRef.current && gameState && game) {
      
      // Create a fresh Chess instance for legal move calculation to avoid state conflicts
      const tempGame = new Chess();
      
      try {
        tempGame.load(gameState.fen);
      } catch (e) {
        console.error('Invalid FEN in game state:', gameState.fen, e);
        return;
      }
      
      // Calculate legal moves for both white and black pieces
      const dests = new Map<Key, Key[]>();
      const originalFen = tempGame.fen();
      
      // Get legal moves for both colors by temporarily switching turns
      const colors = ['w', 'b'];
      colors.forEach(color => {
        try {
          // Create a temporary FEN with the specified turn
          const fenParts = originalFen.split(' ');
          fenParts[1] = color; // Set the turn
          const tempFen = fenParts.join(' ');
          
          // Load the temporary position
          tempGame.load(tempFen);
          
          // Get all legal moves for this color
          const moves = tempGame.moves({ verbose: true });
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
      
      
      chessgroundRef.current.set({
        fen: gameState.fen,
        orientation: boardOrientation as 'white' | 'black',
        turnColor: gameState.turn === 'w' ? 'white' : 'black',
        movable: {
          free: false,
          color: 'both',
          dests, // Legal destinations for both colors
        },
        animation: {
          enabled: true,
          duration: 500, // 0.5 seconds for smooth movement
          curve: [0.25, 0.1, 0.25, 1],
        },
      });
      
      // Clear arrow numbers and shapes when the game state changes (after moves)
      // Always clear arrow numbers when game state changes (moves made)
      const existingNumbers = boardRef.current?.querySelectorAll('.pv-arrow-number');
      existingNumbers?.forEach(el => el.remove());
      
      if (engineOptions.mode !== 'show') {
        chessgroundRef.current.setShapes([]);
      }
    }
  }, [gameState?.fen, gameState?.turn, currentBoard?.id, engineOptions.mode]);


  // Update board orientation without re-initializing
  useEffect(() => {
    if (chessgroundRef.current) {
      chessgroundRef.current.set({
        orientation: boardOrientation as 'white' | 'black',
      });
    }
  }, [boardOrientation]);

  // Update position and FEN without re-initializing
  useEffect(() => {
    if (chessgroundRef.current && currentBoard?.gameState) {
      chessgroundRef.current.set({
        fen: currentBoard.gameState.fen,
      });
    }
  }, [currentBoard?.gameState?.fen]);

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
    
    
    pvMoves.forEach((moveStr, index) => {
      if (!moveStr) return;
      
      // Extract move without piece notation if present (same as original)
      const fromSquare = moveStr.slice(0, 2);
      const toSquare = moveStr.slice(2, 4);
      
      
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
      
      
      // Define colors to match arrows (like original)
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']; // Green, Blue, Orange, Purple
      
      // Create numbered circle with nice colors matching the arrows
      const numberElement = document.createElement('div');
      numberElement.className = 'pv-arrow-number';
      numberElement.innerHTML = (index + 1).toString();
      
      // Use inline styles with nice colors - reduced diameter by 25%
      numberElement.style.cssText = `
        position: absolute !important;
        left: ${midX - 12}px !important;
        top: ${midY - 12}px !important;
        width: 24px !important;
        height: 24px !important;
        max-width: 24px !important;
        max-height: 24px !important;
        min-width: 24px !important;
        min-height: 24px !important;
        background: ${colors[index] || '#4CAF50'} !important;
        color: white !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 8px !important;
        font-weight: bold !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
        line-height: 1 !important;
        z-index: 1001 !important;
        pointer-events: none !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
        border: 2px solid white !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
        overflow: hidden !important;
      `;
      
      // Append to board element (like original .append())
      boardElement.appendChild(numberElement);
    });
    
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
    
  };

  // Highlight best moves with colored square borders and numbered PV sequence
  useEffect(() => {
    
    if (chessgroundRef.current && analysisResults.length > 0 && engineOptions.mode === 'show') {
      const shapes: DrawShape[] = [];
      
      // Helper function to extract squares from formatted move
      const extractSquares = (formattedMove: string) => {
        if (!formattedMove) return null;
        
        // Remove piece letter at the beginning (like 'p', 'K', 'Q', etc.)
        let moveStr = formattedMove;
        if (moveStr.length > 4 && /^[a-zA-Z]/.test(moveStr)) {
          moveStr = moveStr.slice(1); // Remove first character if it's a letter
        }
        
        if (moveStr.length >= 4) {
          return {
            from: moveStr.slice(0, 2) as Key,
            to: moveStr.slice(2, 4) as Key
          };
        }
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
      
      chessgroundRef.current.setShapes(shapes);
      
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
          width: `${boardWidth}px`,
          height: `${boardWidth}px`,
          minWidth: '200px',
          minHeight: '200px',
          maxWidth: `${boardWidth}px`,
          maxHeight: `${boardWidth}px`,
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

export default ChessBoard;

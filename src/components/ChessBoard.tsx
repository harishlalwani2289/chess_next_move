import React, { useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { useChessStore } from '../store/chessStore';

interface ChessBoardProps {
  width?: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ width = 500 }) => {
  const {
    gameState,
    boardOrientation,
    boardTheme,
    makeMove,
    game,
    analysisResults,
    engineOptions
  } = useChessStore();

  // Handle piece drops (moves)
  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    // Check if move is legal first
    const possibleMoves = game.moves({ square: sourceSquare, verbose: true });
    const moveExists = possibleMoves.some(move => move.to === targetSquare);
    
    if (!moveExists) {
      return false;
    }

    // Make the move
    const success = makeMove(sourceSquare, targetSquare);
    return success;
  }, [game, makeMove]);

  // Get custom squares for highlighting best moves
  const getCustomSquares = useCallback(() => {
    const customSquares: Record<string, { backgroundColor: string; borderRadius?: string }> = {};
    
    if (engineOptions.mode === 'show' && analysisResults.length > 0) {
      // Highlight best moves with different colors
      const colors = [
        'rgba(255, 255, 0, 0.4)', // Yellow for best move
        'rgba(0, 255, 255, 0.4)', // Cyan for second best
        'rgba(255, 0, 255, 0.4)', // Magenta for third best
      ];
      
      analysisResults.slice(0, 3).forEach((result, index) => {
        if (result.bestMove && result.bestMove.length >= 4) {
          const from = result.bestMove.slice(-4, -2);
          const to = result.bestMove.slice(-2);
          
          if (from && to) {
            customSquares[from] = { backgroundColor: colors[index] };
            customSquares[to] = { backgroundColor: colors[index] };
          }
        }
      });
    }
    
    return customSquares;
  }, [engineOptions.mode, analysisResults]);

  // Custom pieces - could be used for theming later
  const customPieces = useCallback(() => {
    return ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'].reduce((pieces, piece) => {
      return {
        ...pieces,
        [piece]: ({ squareWidth }: { squareWidth: number }) => (
          <div
            style={{
              width: squareWidth,
              height: squareWidth,
              backgroundImage: `url(/img/chesspieces/wikipedia/${piece}.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          />
        ),
      };
    }, {});
  }, []);

  return (
    <div className="chess-board-container">
      <Chessboard
        id="chess-board"
        position={gameState.fen}
        onPieceDrop={handlePieceDrop}
        boardOrientation={boardOrientation}
        boardWidth={width}
        customSquareStyles={getCustomSquares()}
        customPieces={customPieces()}
        animationDuration={200}
        areArrowsAllowed={true}
        customBoardStyle={{
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
        customDarkSquareStyle={{
          backgroundColor: boardTheme === 'brown' ? '#b58863' : 
                          boardTheme === 'blue' ? '#4a90e2' :
                          boardTheme === 'green' ? '#50c878' :
                          boardTheme === 'purple' ? '#8a2be2' : 
                          '#8b4513'
        }}
        customLightSquareStyle={{
          backgroundColor: boardTheme === 'brown' ? '#f0d9b5' : 
                          boardTheme === 'blue' ? '#87ceeb' :
                          boardTheme === 'green' ? '#90ee90' :
                          boardTheme === 'purple' ? '#dda0dd' : 
                          '#deb887'
        }}
      />
    </div>
  );
};

export default ChessBoard;

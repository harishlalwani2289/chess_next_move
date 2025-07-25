import React from 'react';
import { useChessStore } from '../store/chessStore';

interface ChessBoardProps {
  width?: number;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ width = 500 }) => {
  const {
    gameState,
    boardOrientation,
  } = useChessStore();

  return (
    <div className="chess-board-container">
      <div 
        className="chess-board-placeholder"
        style={{
          width,
          height: width,
          backgroundColor: '#f0d9b5',
          border: '2px solid #8b4513',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ fontSize: '4rem' }}>♟️</div>
        <div style={{ textAlign: 'center', color: '#8b4513' }}>
          <div><strong>Chess Board</strong></div>
          <div>Orientation: {boardOrientation}</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            FEN: {gameState.fen.slice(0, 30)}...
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;

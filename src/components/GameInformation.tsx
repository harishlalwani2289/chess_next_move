import React from 'react';
import { useChessStore } from '../store/chessStore';

interface GameInformation {
  white?: string;
  black?: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
}

export const GameInformation: React.FC = () => {
  const { gameInformation } = useChessStore();

  if (!gameInformation || Object.keys(gameInformation).length === 0) {
    return null;
  }

  return (
    <div className="game-information">
      <h3>Game Information</h3>
      <div className="game-info-content">
        {gameInformation.white && gameInformation.black && (
          <div className="players">
            <strong>{gameInformation.white}</strong> vs <strong>{gameInformation.black}</strong>
          </div>
        )}
        <div className="game-meta">
          {gameInformation.event && (
            <div className="game-event">{gameInformation.event}</div>
          )}
          {gameInformation.date && (
            <div className="game-date">{gameInformation.date}</div>
          )}
          {gameInformation.result && (
            <div className="game-result">Result: {gameInformation.result}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameInformation;

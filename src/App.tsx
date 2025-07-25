import React from 'react';
import ChessBoard from './components/ChessBoard';
import BoardControls from './components/BoardControls';
import AnalysisResults from './components/AnalysisResults';
import { useChessStore } from './store/chessStore';
import './App.css'

function App() {
  const { gameState } = useChessStore();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chess Position Analyzer</h1>
        <p>Analyze any chess position with the powerful Stockfish engine</p>
      </header>

      <main className="main-content">
        <div className="board-column">
          <div className="board-section">
            <ChessBoard width={500} />
          </div>
          
          <div className="fen-display">
            <label>Current FEN:</label>
            <input 
              type="text" 
              value={gameState.fen} 
              readOnly 
              className="fen-input"
            />
          </div>
        </div>

        <div className="controls-column">
          <BoardControls />
          
          <div className="engine-controls">
            <div className="control-group">
              <label>Turn:</label>
              <div className="turn-indicator">
                <span className={`turn-badge ${gameState.turn === 'w' ? 'active' : ''}`}>
                  ♔ White {gameState.turn === 'w' ? '(to move)' : ''}
                </span>
                <span className={`turn-badge ${gameState.turn === 'b' ? 'active' : ''}`}>
                  ♚ Black {gameState.turn === 'b' ? '(to move)' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="results-column">
          <AnalysisResults />
        </div>
      </main>
    </div>
  )
}

export default App

import ChessBoard from './components/ChessBoard';
import BoardControls from './components/BoardControls';
import GameControls from './components/GameControls';
import { GameInformation } from './components/GameInformation';
import GameNavigation from './components/GameNavigation';
import AnalysisResults from './components/AnalysisResults';
import './App.css'

function App() {

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chess Position Analyzer</h1>
        <p>Analyze chess positions with Stockfish engine and get the best moves with AI explanations</p>
      </header>

      <main className="main-content">
        <div className="board-column">
          <div className="board-section">
            <ChessBoard width={500} />
          </div>
          <GameNavigation />
          <GameInformation />
        </div>

        <div className="controls-column">
          <BoardControls />
          
          <GameControls />
          
        </div>

        <div className="results-column">
          <AnalysisResults />
        </div>
      </main>
    </div>
  )
}

export default App

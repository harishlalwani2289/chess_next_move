import { useState, useEffect } from 'react';
import { LogIn } from 'lucide-react';
import ChessBoard from './components/ChessBoard';
import BoardControls from './components/BoardControls';
import GameControls from './components/GameControls';
import { GameInformation } from './components/GameInformation';
import GameNavigation from './components/GameNavigation';
import AnalysisResults from './components/AnalysisResults';
import BoardsManager from './components/BoardsManager';
import MobileNavigation from './components/MobileNavigation';
import MobileCalculateButton from './components/MobileCalculateButton';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import OAuthCallback from './components/OAuthCallback';
import { useAuthStore } from './store/authStore';
import './App.css'

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check if this is an OAuth callback
  const currentPath = window.location.pathname;
  const isOAuthCallback = currentPath.startsWith('/oauth/callback/');
  
  if (isOAuthCallback) {
    const provider = currentPath.split('/oauth/callback/')[1];
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-text">
              <h1>Chess Position Analyzer</h1>
            </div>
          </div>
        </header>
        <main className="main-content">
          <OAuthCallback provider={provider} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <MobileNavigation />
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Chess Position Analyzer</h1>
            <p>Analyze chess positions with Stockfish engine and get the best moves with AI explanations</p>
          </div>
          <div className="header-right">
            <div className="auth-section">
              {isAuthenticated ? (
                <UserProfile />
              ) : (
                <button 
                  className="btn btn-secondary login-button"
                  onClick={() => setShowAuthModal(true)}
                >
                  <LogIn size={18} />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="boards-sidebar">
          <BoardsManager />
        </div>
        
        <div className="board-column">
          <div className="board-section">
            <ChessBoard />
          </div>
          <MobileCalculateButton />
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
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}

export default App

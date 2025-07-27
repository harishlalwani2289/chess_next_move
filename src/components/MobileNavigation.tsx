import React, { useState } from 'react';
import { Menu, X, Home, Grid } from 'lucide-react';
import BoardsManager from './BoardsManager';

export const MobileNavigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [boardsExpanded, setBoardsExpanded] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleBoards = () => {
    setBoardsExpanded(!boardsExpanded);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setBoardsExpanded(false);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button className="mobile-menu-button" onClick={toggleMenu}>
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>Navigation</h2>
              <button className="mobile-menu-close" onClick={closeMenu}>
                <X size={20} />
              </button>
            </div>

            <div className="mobile-menu-items">
              {/* Home Section */}
              <div className="mobile-menu-item">
                <div className="mobile-menu-item-header" onClick={closeMenu}>
                  <Home size={20} />
                  <span>Home</span>
                </div>
              </div>

              {/* Boards Section */}
              <div className="mobile-menu-item">
                <div className="mobile-menu-item-header" onClick={toggleBoards}>
                  <Grid size={20} />
                  <span>Boards</span>
                  <div className={`expand-icon ${boardsExpanded ? 'expanded' : ''}`}>
                    ▼
                  </div>
                </div>
                
                {boardsExpanded && (
                  <div className="mobile-boards-container">
                    <BoardsManager />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation;

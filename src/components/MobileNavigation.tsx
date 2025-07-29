import React, { useState, useEffect } from 'react';
import { X, Home, Grid } from 'lucide-react';
import BoardsManager from './BoardsManager';
import ThemeToggle from './ThemeToggle';

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

  useEffect(() => {
    const createOrUpdateButton = () => {
      const existingButton = document.getElementById('mobile-floating-menu');
      if (window.innerWidth <= 768) {
        if (!existingButton) {
          const floatingButton = document.createElement('button');
          floatingButton.id = 'mobile-floating-menu';
          floatingButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
          
          // Apply styles directly
          Object.assign(floatingButton.style, {
            position: 'absolute',
            top: '0px',
            left: '0px',
            zIndex: '999999',
            backgroundColor: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: isMenuOpen ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px'
          });

          floatingButton.onclick = toggleMenu;
          document.body.appendChild(floatingButton);
        } else {
          // Update existing button visibility based on menu state
          existingButton.style.display = isMenuOpen ? 'none' : 'flex';
        }
      } else if (existingButton) {
        existingButton.style.display = 'none';
      }
    };

    createOrUpdateButton();

    const handleResize = () => {
      const button = document.getElementById('mobile-floating-menu');
      if (button && window.innerWidth > 768) {
        button.style.display = 'none';
        // Close menu when switching to desktop view
        if (isMenuOpen) {
          closeMenu();
        }
      } else {
        createOrUpdateButton();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      const button = document.getElementById('mobile-floating-menu');
      if (button) {
        button.remove();
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isMenuOpen, toggleMenu]);


  return (
    <>
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

              {/* Theme Toggle Section */}
              <div className="mobile-menu-item">
                <div className="mobile-menu-item-header">
                  <span>Theme</span>
                  <ThemeToggle />
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

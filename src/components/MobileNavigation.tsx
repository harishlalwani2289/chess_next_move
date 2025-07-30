import React, { useState, useEffect } from 'react';
import { X, Home, Grid } from 'lucide-react';
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

  useEffect(() => {
    const createOrUpdateButton = () => {
      const existingButton = document.getElementById('mobile-floating-menu');
      
      // Smart device detection for consistent tablet experience
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isTablet = isTouch && (
        // Screen size indicators for tablets
        (window.innerWidth >= 768 && window.innerWidth <= 1400) ||
        // Device pixel ratio indicators (high-DPI tablets)
        (window.devicePixelRatio >= 1.5 && window.innerWidth <= 1600) ||
        // User agent detection for known tablets
        /iPad|Android.*Tablet|Surface/i.test(navigator.userAgent)
      );
      const shouldShowMobileMenu = window.innerWidth <= 1200 || isTablet;
      
      if (shouldShowMobileMenu) {
        if (!existingButton) {
          const floatingButton = document.createElement('button');
          floatingButton.id = 'mobile-floating-menu';
          floatingButton.className = 'mobile-floating-menu-btn';
          floatingButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
          
          // Apply minimal positioning styles, let CSS handle theming
          Object.assign(floatingButton.style, {
            display: isMenuOpen ? 'none' : 'flex'
          });

          floatingButton.onclick = toggleMenu;
          document.body.appendChild(floatingButton);
        } else {
          // Update existing button visibility only, CSS handles theming
          existingButton.style.display = isMenuOpen ? 'none' : 'flex';
          existingButton.className = 'mobile-floating-menu-btn';
        }
      } else if (existingButton) {
        existingButton.style.display = 'none';
      }
    };

    createOrUpdateButton();

    const handleResize = () => {
      const button = document.getElementById('mobile-floating-menu');
      if (button && window.innerWidth > 1200) {
        button.style.display = 'none';
        // Close menu when switching to desktop view
        if (isMenuOpen) {
          closeMenu();
        }
      } else {
        createOrUpdateButton();
      }
    };

    // Listen for theme changes
    const handleThemeChange = () => {
      createOrUpdateButton();
    };

    // Create a MutationObserver to watch for class changes on the html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          handleThemeChange();
        }
      });
    });

    // Start observing the html element for class changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      const button = document.getElementById('mobile-floating-menu');
      if (button) {
        button.remove();
      }
      observer.disconnect();
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
              <h2>Chess Menu</h2>
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

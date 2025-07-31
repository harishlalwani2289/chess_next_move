import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Trash2, FileText } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import type { GameInformation } from '../types/chess';

interface PgnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PgnModal: React.FC<PgnModalProps> = ({ isOpen, onClose }) => {
  const { loadPgnWithHistory, resetToStartPosition, setGameInformation } = useChessStore();
  const [pgnInput, setPgnInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleLoadPgn = () => {
    if (!pgnInput.trim()) {
      setError('Please enter a PGN to load.');
      return;
    }

    // Extract game information from PGN headers
    const gameInfo: GameInformation = {};
    const lines = pgnInput.trim().split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('[')) {
        const match = trimmedLine.match(/\[\s*(\w+)\s*"([^"]*?)"\s*\]/);
        if (match) {
          const [, key, value] = match;
          switch (key) {
            case 'White':
              gameInfo.white = value;
              break;
            case 'Black':
              gameInfo.black = value;
              break;
            case 'Event':
              gameInfo.event = value;
              break;
            case 'Site':
              gameInfo.site = value;
              break;
            case 'Date':
              gameInfo.date = value;
              break;
            case 'Round':
              gameInfo.round = value;
              break;
            case 'Result':
              gameInfo.result = value;
              break;
            case 'Variant':
              if (value === 'Chess960' || value === 'Fischer Random') {
                gameInfo.event = gameInfo.event ? `${gameInfo.event} (Chess960)` : 'Chess960';
              }
              break;
          }
        }
      }
    }
    
    // Try to load the PGN with full history
    const success = loadPgnWithHistory(pgnInput.trim());
    
    if (success) {
      // Set game information
      setGameInformation(gameInfo);
      
      setSuccess('PGN loaded successfully!');
      setError('');
      
      // Auto-close after successful load
      setTimeout(() => {
        onClose();
        setSuccess('');
        setPgnInput('');
      }, 1500);
    } else {
      setError('Invalid PGN format. Please check your input and try again.');
      setSuccess('');
    }
  };

  const handleClearPgn = () => {
    setPgnInput('');
    setError('');
    setSuccess('');
  };

  const handleReset = () => {
    resetToStartPosition();
    setSuccess('Board reset to starting position!');
    setError('');
    
    setTimeout(() => {
      onClose();
      setSuccess('');
    }, 1500);
  };

  const handleClose = () => {
    setPgnInput('');
    setError('');
    setSuccess('');
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content pgn-modal">
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={20} />
            <h3>Load Game PGN</h3>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="pgn-input-section">
            <label htmlFor="pgn-textarea">Paste PGN notation:</label>
            <textarea
              id="pgn-textarea"
              value={pgnInput}
              onChange={(e) => {
                setPgnInput(e.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
              className="pgn-textarea"
              rows={8}
              spellCheck="false"
            />
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          <div className="pgn-info">
            <p>
              <strong>Instructions:</strong> Paste a valid PGN (Portable Game Notation) 
              into the text area above. The PGN should contain standard algebraic notation 
              moves like "1. e4 e5 2. Nf3 Nc6". Chess960/Fischer Random games are supported.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={handleClearPgn}
            disabled={!pgnInput.trim()}
          >
            <Trash2 size={16} />
            Clear
          </button>
          
          <button 
            className="btn btn-warning"
            onClick={handleReset}
          >
            Reset Board
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={handleLoadPgn}
            disabled={!pgnInput.trim()}
          >
            <Upload size={16} />
            Load PGN
          </button>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render the modal at the document body level
  return createPortal(modalContent, document.body);
};

export default PgnModal;

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Pencil, Check, Trash2 } from 'lucide-react';
import { useChessStore } from '../store/chessStore';

export const MobileBoardsSelector: React.FC = () => {
  const {
    boards,
    currentBoardId,
    addBoard,
    removeBoard,
    switchToBoard,
    renameBoardNormal,
  } = useChessStore();

  const [isOpen, setIsOpen] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentBoard = boards.find(board => board.id === currentBoardId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingBoardId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus and select text when editing starts
  useEffect(() => {
    if (editingBoardId && editInputRef.current) {
      setTimeout(() => {
        if (editInputRef.current) {
          editInputRef.current.focus();
          editInputRef.current.select();
        }
      }, 10);
    }
  }, [editingBoardId]);

  const handleAddBoard = () => {
    const newBoardName = `Board ${boards.length + 1}`;
    const newBoardId = addBoard(newBoardName);
    switchToBoard(newBoardId);
    setIsOpen(false);
  };

  const handleRemoveBoard = (boardId: string) => {
    if (boards.length <= 1) {
      alert('Cannot remove the last board');
      return;
    }
    removeBoard(boardId);
    setEditingBoardId(null);
  };

  const startEditing = (e: React.MouseEvent, boardId: string, currentName: string) => {
    e.stopPropagation();
    setEditingBoardId(boardId);
    setEditName(currentName);
  };

  const finishEditing = () => {
    if (editingBoardId && editName.trim()) {
      renameBoardNormal(editingBoardId, editName.trim());
    }
    setEditingBoardId(null);
    setEditName('');
  };

  const cancelEditing = () => {
    setEditingBoardId(null);
    setEditName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleBoardSelect = (boardId: string) => {
    if (editingBoardId) return; // Don't switch if editing
    switchToBoard(boardId);
    setIsOpen(false);
  };

  return (
    <div className="mobile-boards-selector" ref={dropdownRef}>
      <div className="mobile-dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="current-board-info">
          <span className="current-board-name">{currentBoard?.name || 'No Board'}</span>
          <span className="board-count">({boards.length} board{boards.length !== 1 ? 's' : ''})</span>
        </div>
        <ChevronDown 
          className={`dropdown-chevron ${isOpen ? 'open' : ''}`} 
          size={16} 
        />
      </div>

      {isOpen && (
        <div className="mobile-dropdown-menu">
          <div className="dropdown-header">
            <span className="dropdown-title">Chess Boards</span>
            <button
              onClick={handleAddBoard}
              className="mobile-add-board-button"
              title="Add new board"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="dropdown-boards-list">
            {boards
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((board) => (
                <div
                  key={board.id}
                  className={`dropdown-board-item ${board.id === currentBoardId ? 'active' : ''}`}
                  onClick={() => handleBoardSelect(board.id)}
                >
                  <div className="dropdown-board-content">
                    {editingBoardId === board.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={finishEditing}
                        onClick={(e) => e.stopPropagation()}
                        className="mobile-board-name-input"
                        aria-label="Edit board name"
                      />
                    ) : (
                      <span className="dropdown-board-name">
                        {board.name}
                      </span>
                    )}
                  </div>
                  
                  <div className="dropdown-board-actions">
                    {editingBoardId === board.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          finishEditing();
                        }}
                        className="mobile-action-button confirm"
                        title="Confirm rename"
                      >
                        <Check size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => startEditing(e, board.id, board.name)}
                        className="mobile-action-button edit"
                        title="Rename board"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    
                    {boards.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBoard(board.id);
                        }}
                        className="mobile-action-button remove"
                        title="Remove board"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileBoardsSelector;

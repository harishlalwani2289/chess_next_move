import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { useChessStore } from '../store/chessStore';

export const BoardsManager: React.FC = () => {
  const {
    boards,
    currentBoardId,
    addBoard,
    removeBoard,
    switchToBoard,
    renameBoardNormal,
  } = useChessStore();

  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const boardsListRef = useRef<HTMLDivElement>(null);
  const activeBoardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active board when currentBoardId changes
  useEffect(() => {
    if (activeBoardRef.current && boardsListRef.current) {
      const boardElement = activeBoardRef.current;
      const listElement = boardsListRef.current;
      
      const boardTop = boardElement.offsetTop;
      const boardHeight = boardElement.offsetHeight;
      const listScrollTop = listElement.scrollTop;
      const listHeight = listElement.clientHeight;
      
      // Check if board is fully visible
      const isVisible = boardTop >= listScrollTop && 
                       (boardTop + boardHeight) <= (listScrollTop + listHeight);
      
      if (!isVisible) {
        // Scroll to center the active board in the view
        const scrollTo = boardTop - (listHeight / 2) + (boardHeight / 2);
        listElement.scrollTo({
          top: Math.max(0, scrollTo),
          behavior: 'smooth'
        });
      }
    }
  }, [currentBoardId]);

  const handleAddBoard = () => {
    const newBoardName = `Board ${boards.length + 1}`;
    const newBoardId = addBoard(newBoardName);
    switchToBoard(newBoardId);
  };

  const handleRemoveBoard = (boardId: string) => {
    if (boards.length <= 1) {
      alert('Cannot remove the last board');
      return;
    }
    
    removeBoard(boardId);
  };

  const startEditing = (boardId: string, currentName: string) => {
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

  const handleBoardNameClick = (e: React.MouseEvent, boardId: string, boardName: string) => {
    e.stopPropagation(); // Prevent switching to board when editing
    startEditing(boardId, boardName);
  };

  return (
    <div className="boards-manager">
      <div className="boards-header">
        <h3>Chess Boards</h3>
        <button
          onClick={handleAddBoard}
          className="add-board-button"
          title="Add new board"
        >
          <Plus size={16} />
        </button>
      </div>
      
      <div className="boards-list" ref={boardsListRef}>
        {boards
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((board) => (
          <div
            key={board.id}
            className={`board-item ${board.id === currentBoardId ? 'active' : ''}`}
            ref={board.id === currentBoardId ? activeBoardRef : null}
          >
            <div
              className="board-name-section"
              onClick={() => switchToBoard(board.id)}
            >
              {editingBoardId === board.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={finishEditing}
                  autoFocus
                  className="board-name-input"
                />
              ) : (
                <span 
                  className="board-name clickable"
                  onClick={(e) => handleBoardNameClick(e, board.id, board.name)}
                  title="Click to edit board name"
                >
                  {board.name}
                </span>
              )}
            </div>
            
            <div className="board-actions">
              {editingBoardId === board.id ? (
                <button
                  onClick={finishEditing}
                  className="action-button confirm"
                  title="Confirm rename"
                >
                  <Check size={14} />
                </button>
              ) : (
                <button
                  onClick={() => startEditing(board.id, board.name)}
                  className="action-button edit"
                  title="Rename board"
                >
                  <Edit2 size={14} />
                </button>
              )}
              
              {boards.length > 1 && (
                <button
                  onClick={() => handleRemoveBoard(board.id)}
                  className="action-button remove"
                  title="Remove board"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="boards-info">
        <small>
          {boards.length} board{boards.length !== 1 ? 's' : ''} total
          {boards.length > 15 && (
            <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
              • Scroll for more
            </span>
          )}
        </small>
      </div>
    </div>
  );
};

export default BoardsManager;

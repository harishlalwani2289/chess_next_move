import React from 'react';
import { useChessStore } from '../store/chessStore';
import { useAuthStore } from '../store/authStore';

interface SyncStatusProps {
  className?: string;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ className = '' }) => {
  const { 
    isSyncing, 
    lastSyncTime, 
    pendingChanges,
    syncAllBoardsToBackend,
    loadBoardsFromBackend
  } = useChessStore();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleSyncAll = async () => {
    try {
      // First load from server to get latest data, then sync all local changes
      await loadBoardsFromBackend();
      await syncAllBoardsToBackend();
    } catch (error) {
      console.error('Failed to sync all boards:', error);
    }
  };

  return (
    <div className={`sync-status ${className}`}>
      <div className="sync-info-with-button">
        <div className="sync-info">
          {isSyncing ? (
            <div className="syncing-indicator">
              <div className="spinner"></div>
              <span>Syncing...</span>
            </div>
          ) : (
            <div className="sync-details">
              <span className={`sync-time ${pendingChanges ? 'pending' : ''}`}>
                {pendingChanges && '• '}
                Last sync: {formatLastSync(lastSyncTime)}
              </span>
              {pendingChanges && (
                <span className="pending-changes">Unsaved changes</span>
              )}
            </div>
          )}
        </div>
        
        <button 
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="sync-all-btn"
          title="Sync all boards with server"
        >
          <div className="sync-icon">
            <div className={`sync-dot ${isSyncing ? 'syncing' : pendingChanges ? 'pending' : 'synced'}`}></div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SyncStatus;


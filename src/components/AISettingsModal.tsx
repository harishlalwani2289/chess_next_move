import React, { useState, useEffect } from 'react';
import { X, Key, Info, ExternalLink } from 'lucide-react';
import { useChessStore } from '../store/chessStore';
import { aiService } from '../services/aiService';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const { setAISettings } = useChessStore();
  const [keys, setKeys] = useState({
    geminiApiKey: '',
    openaiApiKey: '',
    claudeApiKey: '',
    groqApiKey: '',
  });
  const [loading, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load existing keys
      setKeys({
        geminiApiKey: localStorage.getItem('geminiApiKey') || '',
        openaiApiKey: localStorage.getItem('openaiApiKey') || '',
        claudeApiKey: localStorage.getItem('claudeApiKey') || '',
        groqApiKey: localStorage.getItem('groqApiKey') || '',
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    setSaving(true);
    
    // Save to localStorage
    Object.entries(keys).forEach(([key, value]) => {
      if (value.trim()) {
        localStorage.setItem(key, value.trim());
      } else {
        localStorage.removeItem(key);
      }
    });

    // Update store
    setAISettings(keys);
    
    setSaving(false);
    onClose();
  };

  const handleKeyChange = (provider: keyof typeof keys, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
  };

  const isConfigured = (key: string) => {
    return key.trim().length > 0;
  };

  const getStatusText = (key: string) => {
    return isConfigured(key) ? 'Configured ✓' : 'Not configured';
  };

  const getStatusClass = (key: string) => {
    return isConfigured(key) ? 'status-connected' : 'status-disconnected';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Key size={24} />
            <h3>AI API Settings</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="ai-settings-info">
            <div className="info-banner">
              <Info size={16} />
              <div>
                <p><strong>Environment Variables (Recommended for Deployment)</strong></p>
                <p>Set these environment variables in your deployment platform:</p>
                <code>
                  VITE_GEMINI_API_KEY, VITE_OPENAI_API_KEY, VITE_CLAUDE_API_KEY, VITE_GROQ_API_KEY
                </code>
                <p className="env-note">Environment variables take precedence over manually entered keys.</p>
              </div>
            </div>
          </div>

          <div className="api-services">
            {/* Gemini */}
            <div className="api-service">
              <div className="service-header">
                <h4>🟡 Google Gemini <span className="free-badge">FREE</span></h4>
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="api-link"
                >
                  Get API Key <ExternalLink size={14} />
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter your Gemini API key..."
                value={keys.geminiApiKey}
                onChange={(e) => handleKeyChange('geminiApiKey', e.target.value)}
                className="api-key-input"
              />
              <div className={`api-status ${getStatusClass(keys.geminiApiKey)}`}>
                {import.meta.env.VITE_GEMINI_API_KEY ? '🌍 Using environment variable' : getStatusText(keys.geminiApiKey)}
              </div>
            </div>

            {/* OpenAI */}
            <div className="api-service">
              <div className="service-header">
                <h4>🟢 OpenAI GPT <span className="paid-badge">PAID</span></h4>
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="api-link"
                >
                  Get API Key <ExternalLink size={14} />
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter your OpenAI API key..."
                value={keys.openaiApiKey}
                onChange={(e) => handleKeyChange('openaiApiKey', e.target.value)}
                className="api-key-input"
              />
              <div className={`api-status ${getStatusClass(keys.openaiApiKey)}`}>
                {import.meta.env.VITE_OPENAI_API_KEY ? '🌍 Using environment variable' : getStatusText(keys.openaiApiKey)}
              </div>
            </div>

            {/* Claude */}
            <div className="api-service">
              <div className="service-header">
                <h4>🟠 Anthropic Claude <span className="paid-badge">PAID</span></h4>
                <a 
                  href="https://console.anthropic.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="api-link"
                >
                  Get API Key <ExternalLink size={14} />
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter your Claude API key..."
                value={keys.claudeApiKey}
                onChange={(e) => handleKeyChange('claudeApiKey', e.target.value)}
                className="api-key-input"
              />
              <div className={`api-status ${getStatusClass(keys.claudeApiKey)}`}>
                {import.meta.env.VITE_CLAUDE_API_KEY ? '🌍 Using environment variable' : getStatusText(keys.claudeApiKey)}
              </div>
            </div>

            {/* Groq */}
            <div className="api-service">
              <div className="service-header">
                <h4>🔵 Groq <span className="free-badge">FREE</span></h4>
                <a 
                  href="https://console.groq.com/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="api-link"
                >
                  Get API Key <ExternalLink size={14} />
                </a>
              </div>
              <input
                type="password"
                placeholder="Enter your Groq API key..."
                value={keys.groqApiKey}
                onChange={(e) => handleKeyChange('groqApiKey', e.target.value)}
                className="api-key-input"
              />
              <div className={`api-status ${getStatusClass(keys.groqApiKey)}`}>
                {import.meta.env.VITE_GROQ_API_KEY ? '🌍 Using environment variable' : getStatusText(keys.groqApiKey)}
              </div>
            </div>
          </div>

          <div className="providers-info">
            <h5>Available Providers:</h5>
            <div className="providers-list">
              {aiService.getAvailableProviders().length > 0 ? (
                aiService.getAvailableProviders().map(provider => (
                  <span key={provider} className="provider-badge">{provider}</span>
                ))
              ) : (
                <span className="no-providers">No API keys configured</span>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;

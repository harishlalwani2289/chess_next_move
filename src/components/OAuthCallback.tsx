import React, { useEffect, useState } from 'react';

interface OAuthCallbackProps {
  provider: string;
}

export const OAuthCallback: React.FC<OAuthCallbackProps> = ({ provider }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token or error from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const errorParam = urlParams.get('error');

        if (errorParam) {
          setStatus('error');
          setError(`OAuth error: ${errorParam}`);
          return;
        }

        if (!token) {
          setStatus('error');
          setError('No authentication token received');
          return;
        }

        // Set the token and authenticate the user
        const apiService = (await import('../services/api')).default;
        apiService.setAuthToken(token);
        
        // Get user profile to validate token and set user state
        const response = await apiService.getProfile();
        
        if (response.success && response.data) {
          const { useAuthStore } = await import('../store/authStore');
          const { useChessStore } = await import('../store/chessStore');
          
          // Update auth state
          useAuthStore.setState({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          // Load user's boards from backend
          try {
            await useChessStore.getState().loadBoardsFromBackend();
            useChessStore.getState().startAutoSync();
          } catch (error) {
            console.warn('Failed to load boards after OAuth login:', error);
            useChessStore.getState().startAutoSync();
          }
          
          setStatus('success');
          
          // Get redirect URL from localStorage (if set)
          const redirectUrl = localStorage.getItem('oauth_redirect_url') || '/';
          localStorage.removeItem('oauth_redirect_url');
          
          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 1500);
        } else {
          setStatus('error');
          setError('Failed to validate authentication token');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    handleCallback();
  }, [provider]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      {status === 'loading' && (
        <>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }} />
          <h2>Authenticating...</h2>
          <p>Please wait while we complete your {provider} login.</p>
        </>
      )}
      
      {status === 'success' && (
        <>
          <div style={{ 
            fontSize: '3rem', 
            color: 'green', 
            marginBottom: '1rem' 
          }}>✓</div>
          <h2>Success!</h2>
          <p>You have been successfully authenticated. Redirecting...</p>
        </>
      )}
      
      {status === 'error' && (
        <>
          <div style={{ 
            fontSize: '3rem', 
            color: 'red', 
            marginBottom: '1rem' 
          }}>✗</div>
          <h2>Authentication Failed</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Return to Home
          </button>
        </>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OAuthCallback;

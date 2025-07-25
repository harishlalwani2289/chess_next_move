import { useEffect, useRef, useCallback } from 'react';
import { useChessStore } from '../store/chessStore';
import { AnalysisResult } from '../types/chess';

interface StockfishMessage {
  data: string;
}

export const useStockfish = () => {
  const workerRef = useRef<Worker | null>(null);
  const { 
    gameState, 
    engineOptions, 
    setAnalysisResults, 
    setEngineThinking,
    clearAnalysisResults 
  } = useChessStore();

  // Initialize Stockfish worker
  useEffect(() => {
    const initWorker = () => {
      try {
        // Load Stockfish from public directory
        workerRef.current = new Worker('/stockfish.asm.js');
        
        workerRef.current.onmessage = (event: StockfishMessage) => {
          handleEngineMessage(event.data);
        };
        
        workerRef.current.onerror = (error) => {
          console.error('Stockfish worker error:', error);
        };
        
        // Initialize UCI
        workerRef.current.postMessage('uci');
        console.log('Stockfish initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Parse evaluation score
  const parseEvaluation = (line: string): string => {
    const cpMatch = line.match(/cp (-?\d+)/);
    const mateMatch = line.match(/mate (-?\d+)/);
    
    if (mateMatch) {
      const mateIn = parseInt(mateMatch[1]);
      let displayMate = mateIn;
      
      if (gameState.turn === 'b') {
        displayMate = -mateIn;
      }
      
      if (displayMate > 0) {
        return `+M${Math.abs(displayMate)}`;
      } else if (displayMate < 0) {
        return `-M${Math.abs(displayMate)}`;
      } else {
        return 'M0';
      }
    } else if (cpMatch) {
      let evalScore = parseInt(cpMatch[1]);
      
      if (gameState.turn === 'b') {
        evalScore = -evalScore;
      }
      
      return evalScore > 0 ? `+${(evalScore / 100).toFixed(2)}` : (evalScore / 100).toFixed(2);
    }
    
    return '';
  };

  // Format move for display
  const formatMove = (move: string): string => {
    if (move.length >= 4) {
      // For now, return the move as-is
      // TODO: Add piece notation based on current position
      return move;
    }
    return move;
  };

  // Format principal variation
  const formatPrincipalVariation = (pv: string): string => {
    return pv.split(' ').map(move => formatMove(move)).join(' ');
  };

  // Handle engine messages
  const handleEngineMessage = useCallback((line: string) => {
    console.log('Stockfish:', line);
    
    // Parse multi-PV analysis
    if (line.includes('multipv')) {
      const match = line.match(/multipv (\d+).*?pv\s+(.+)/);
      if (match) {
        const pvNumber = parseInt(match[1]);
        const pv = match[2].trim();
        const move = pv.split(' ')[0];
        const evaluation = parseEvaluation(line);
        
        const result: AnalysisResult = {
          bestMove: formatMove(move),
          evaluation,
          principalVariation: formatPrincipalVariation(pv),
          moveNumber: pvNumber,
        };
        
        // Update analysis results
        setAnalysisResults((prev: AnalysisResult[]) => {
          const newResults = [...prev];
          const existingIndex = newResults.findIndex(r => r.moveNumber === pvNumber);
          
          if (existingIndex >= 0) {
            newResults[existingIndex] = result;
          } else {
            newResults.push(result);
          }
          
          return newResults.sort((a, b) => a.moveNumber - b.moveNumber);
        });
      }
    }
    
    // Handle analysis completion
    if (line.startsWith('bestmove')) {
      setEngineThinking(false);
    }
  }, [gameState.turn, setAnalysisResults, setEngineThinking]);

  // Start analysis
  const analyzePosition = useCallback(() => {
    if (!workerRef.current) {
      console.error('Stockfish not initialized');
      return;
    }

    console.log('Starting analysis for position:', gameState.fen);
    
    clearAnalysisResults();
    setEngineThinking(true);
    
    // Set up position
    workerRef.current.postMessage('ucinewgame');
    workerRef.current.postMessage(`position fen ${gameState.fen}`);
    
    // Configure multi-PV for top 3 moves
    workerRef.current.postMessage('setoption name MultiPV value 3');
    
    // Start analysis
    const thinkTime = engineOptions.thinkTime * 1000; // Convert to milliseconds
    workerRef.current.postMessage(`go movetime ${thinkTime}`);
  }, [gameState.fen, engineOptions.thinkTime, clearAnalysisResults, setEngineThinking]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
    }
    setEngineThinking(false);
  }, [setEngineThinking]);

  return {
    analyzePosition,
    stopAnalysis,
    isReady: workerRef.current !== null,
  };
};

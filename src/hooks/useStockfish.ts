import { useEffect, useRef, useCallback } from 'react';
import { useChessStore } from '../store/chessStore';
import type { AnalysisResult } from '../types/chess';

interface StockfishMessage {
  data: string;
}

export const useStockfish = () => {
  const workerRef = useRef<Worker | null>(null);
  const isReadyRef = useRef<boolean>(false);
  const { 
    gameState, 
    engineOptions, 
    setAnalysisResults, 
    setEngineThinking,
    clearAnalysisResults,
    game
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
      
      if (gameState?.turn === 'b') {
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
      
      if (gameState?.turn === 'b') {
        evalScore = -evalScore;
      }
      
      return evalScore > 0 ? `+${(evalScore / 100).toFixed(2)}` : (evalScore / 100).toFixed(2);
    }
    
    return '';
  };

  // Format move for display with piece notation
  const formatMove = (move: string): string => {
    if (move.length >= 4) {
      const fromSquare = move.slice(0, 2);
      const toSquare = move.slice(2, 4);
      
      // Get the piece at the source square from chess.js
      const piece = game?.get(fromSquare as any);
      
      if (piece) {
        const pieceSymbol = piece.type === 'p' ? 'p' : piece.type.toUpperCase();
        return pieceSymbol + fromSquare + toSquare;
      }
      
      return move;
    }
    return move;
  };

  // Format principal variation
  const formatPrincipalVariation = (pv: string): string => {
    return pv.split(' ').map(move => formatMove(move)).join(' ');
  };

  // Update progress bars
  const updateProgressBars = useCallback((evaluation: string) => {
    const analysisProgress = document.getElementById('analysisProgress') as HTMLProgressElement;
    
    if (analysisProgress) {
      if (evaluation.includes('M')) {
        // Mate - set to max or min based on sign
        analysisProgress.value = evaluation.startsWith('+') ? 100 : 1;
      } else {
        // Regular evaluation - convert to progress (0-100)
        const score = parseFloat(evaluation);
        const progressValue = Math.max(1, Math.min(99, 50 + score * 5));
        analysisProgress.value = progressValue;
      }
    }
  }, []);

  // Handle engine messages
  const handleEngineMessage = useCallback((line: string) => {
    console.log('Stockfish:', line);
    
    // Check if UCI is ready
    if (line === 'uciok') {
      isReadyRef.current = true;
      console.log('Stockfish UCI ready');
      // Send isready command to ensure engine is fully initialized
      if (workerRef.current) {
        workerRef.current.postMessage('isready');
      }
      return;
    }
    
    // Confirm engine is ready for commands
    if (line === 'readyok') {
      console.log('Stockfish ready for commands');
      return;
    }
    
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
        
        // Update progress bar for the best move (PV 1)
        if (pvNumber === 1) {
          updateProgressBars(evaluation);
        }
      }
    }
    
    // Handle analysis completion
    if (line.startsWith('bestmove')) {
      setEngineThinking(false);
      // Animate time progress to completion
      const timeProgress = document.getElementById('timeProgress') as HTMLProgressElement;
      if (timeProgress) timeProgress.value = 100;
    }
  }, [gameState?.turn, setAnalysisResults, setEngineThinking, updateProgressBars]);
  
  // Start analysis
  const analyzePosition = useCallback(() => {
    if (!workerRef.current) {
      console.error('Stockfish not initialized');
      return;
    }

    if (!gameState?.fen) {
      console.error('No position available for analysis');
      return;
    }
    
    console.log('Starting analysis for position:', gameState.fen);
    
    clearAnalysisResults();
    setEngineThinking(true);
    
    // Reset progress bars
    const analysisProgress = document.getElementById('analysisProgress') as HTMLProgressElement;
    const timeProgress = document.getElementById('timeProgress') as HTMLProgressElement;
    if (analysisProgress) analysisProgress.value = 50;
    if (timeProgress) timeProgress.value = 0;
    
    // Set up position
    workerRef.current.postMessage('ucinewgame');
    workerRef.current.postMessage(`position fen ${gameState.fen}`);
    
    // Configure multi-PV for top 3 moves
    workerRef.current.postMessage('setoption name MultiPV value 3');
    
    // Start analysis
    const thinkTime = engineOptions.thinkTime * 1000; // Convert to milliseconds
    workerRef.current.postMessage(`go movetime ${thinkTime}`);
    
    // Animate time progress
    let timeElapsed = 0;
    const timeInterval = setInterval(() => {
      timeElapsed += 100;
      const progress = Math.min(100, (timeElapsed / (thinkTime)) * 100);
      if (timeProgress) timeProgress.value = progress;
      
      if (timeElapsed >= thinkTime) {
        clearInterval(timeInterval);
      }
    }, 100);
  }, [gameState?.fen, engineOptions.thinkTime, clearAnalysisResults, setEngineThinking]);

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
    isReady: workerRef.current !== null && isReadyRef.current,
  };
};

$(document).ready(function() {
    // Initialize variables
    let board = null;
    let game = new Chess();
    let stockfish = null;
    let engineThinking = false;
    let currentProgress = 50;
    
    // Initialize progress bars
    $('#analysisProgress').progressbar({ value: 50 });
    $('#timeProgress').progressbar({ value: 0 });
    
    // Initialize Stockfish engine
    function initStockfish() {
        // Wait for Stockfish to load, then initialize
        if (typeof STOCKFISH === 'function') {
            try {
                stockfish = STOCKFISH();
                stockfish.onmessage = handleEngineMessage;
                stockfish.postMessage('uci');
                console.log('Stockfish initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Stockfish:', error);
                // Try alternative initialization
                setTimeout(initStockfish, 1000);
            }
        } else {
            // Wait for Stockfish to load
            console.log('Waiting for Stockfish to load...');
            setTimeout(initStockfish, 500);
        }
    }
    
    // Function to parse evaluation score
    function parseEvaluation(line) {
        const cpMatch = line.match(/cp (-?\d+)/);
        const mateMatch = line.match(/mate (-?\d+)/);
        let score = '';

        if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            const currentTurn = $('input[name="turn"]:checked').val();
            let displayMate = mateIn;

            if (currentTurn === 'b') {
                displayMate = -mateIn;
            }

            if (displayMate > 0) {
                score = `+M${Math.abs(displayMate)}`;
            } else if (displayMate < 0) {
                score = `-M${Math.abs(displayMate)}`;
            } else {
                score = 'M0';
            }
        } else if (cpMatch) {
            let evalScore = parseInt(cpMatch[1]);
            const currentTurn = $('input[name="turn"]:checked').val();

            if (currentTurn === 'b') {
                evalScore = -evalScore;
            }

            score = evalScore > 0 ? `+${(evalScore / 100).toFixed(2)}` : (evalScore / 100).toFixed(2);
        }

        return score;
    }

    // Handle messages from Stockfish engine
    function handleEngineMessage(event) {
        const line = event.data || event;
        console.log('Stockfish:', line);
        
        // Parse multi pv (best moves)
        if (line.includes('multipv')) {
            const match = line.match(/multipv (\d+) .*?pv ([\s\S]*?)(?=\n|$)/);
            if (match) {
                const pvNumber = match[1];
                const pv = match[2].trim();
                const move = pv.split(' ')[0];

                switch(pvNumber) {
                    case '1':
                        $('#bestMove1').val(formatMove(move));
                        $('#principalVariation1').val(formatPrincipalVariation(pv));
                        $('#evaluation1').val(parseEvaluation(line));
                        break;
                    case '2':
                        $('#bestMove2').val(formatMove(move));
                        $('#principalVariation2').val(formatPrincipalVariation(pv));
                        $('#evaluation2').val(parseEvaluation(line));
                        break;
                    case '3':
                        $('#bestMove3').val(formatMove(move));
                        $('#principalVariation3').val(formatPrincipalVariation(pv));
                        $('#evaluation3').val(parseEvaluation(line));
                        break;
                }

                // For the first move, also update progress bar and handle highlighting/making move
                if (pvNumber === '1') {
                    const mode = $('input[name="mode"]:checked').val();
                    const rawMove = pv.split(' ')[0];
                    
                    if (mode === 'show') {
                        highlightMove(rawMove);
                    } else if (mode === 'make') {
                        makeEngineMove(rawMove);
                    }

                    // Update progress bar based on evaluation
                    const evaluation = parseEvaluation(line);
                    if (evaluation.includes('M')) {
                        setAnalysisProgress(evaluation.startsWith('+') ? 100 : 1);
                    } else {
                        const score = parseFloat(evaluation);
                        const progressValue = Math.max(1, Math.min(99, 50 + score * 5));
                        setAnalysisProgress(board.orientation() === 'white' ? progressValue : 100 - progressValue);
                    }
                }
            }
        }

        // Parse best move completion
        if (line.startsWith('bestmove')) {
            // Re-enable calculate button with animations
            $('#calculateBtn')
                .prop('disabled', false)
                .text('Calculate Best Move')
                .removeClass('thinking');
            
            // Restore visual feedback
            $('#results-section').css('opacity', '1');
            
            engineThinking = false;
            animateProgressBar('#timeProgress', 0, 100);
        }
        
        // Parse search depth
        const depthMatch = line.match(/depth (\d+)/);
        if (depthMatch) {
            $('#depth').val(depthMatch[1]);
        }
    }
    
    // Format move for display (e.g., "e2e4" -> "e2-e4")
    function formatMove(move) {
        if (move.length >= 4) {
            return move.slice(0, 2) + '-' + move.slice(2);
        }
        return move;
    }
    
    // Format principal variation for display
    function formatPrincipalVariation(pv) {
        return pv.split(' ').map(move => formatMove(move)).join(' ');
    }
    
    // Highlight the best move on the board
    function highlightMove(move) {
        removeHighlights();
        if (move && move.length >= 4) {
            const fromSquare = move.slice(0, 2);
            const toSquare = move.slice(2, 4);
            
            $('.square-' + fromSquare).addClass('highlight-from');
            $('.square-' + toSquare).addClass('highlight-to');
        }
    }
    
    // Remove move highlights
    function removeHighlights() {
        $('#myBoard .square-55d63').removeClass('highlight-from highlight-to');
    }
    
    // Make the engine's suggested move
    function makeEngineMove(move) {
        try {
            const moveObj = game.move(move, { sloppy: true });
            if (moveObj) {
                board.position(game.fen());
                updateGameState();
                updateFenDisplay();
            }
        } catch (error) {
            console.error('Failed to make engine move:', error);
        }
    }
    
    // Set analysis progress bar value
    function setAnalysisProgress(value) {
        currentProgress = value;
        animateProgressBar('#analysisProgress', value, 300);
    }
    
    // Animate progress bar
    function animateProgressBar(selector, value, duration) {
        $(selector).progressbar('value', value);
    }
    
    // Initialize chess board
    function initBoard() {
        const config = {
            draggable: true,
            position: 'start',
            dropOffBoard: 'trash',
            sparePieces: true,
            onDrop: onDrop,
            onDragStart: onDragStart,
            onMoveEnd: onMoveEnd
        };
        
        board = Chessboard('myBoard', config);
        updateFenDisplay();
    }
    
    // Handle piece drops
    function onDrop(source, target, piece, newPos, oldPos, orientation) {
        // Handle castling moves
        handleCastlingRights(piece, source);
        
        // Update turn
        const pieceColor = piece.charAt(0);
        if (target !== 'offboard') {
            if (pieceColor === 'w') {
                $('#blackToMove').prop('checked', true);
            } else {
                $('#whiteToMove').prop('checked', true);
            }
        }
        
        // Handle pawn promotion
        handlePawnPromotion(piece, target, newPos);
        
        // Update game state
        setTimeout(() => {
            updateGameState();
            updateFenDisplay();
            clearResults();
            saveGameState(); // Save state after piece move
        }, 50);
    }
    
    // Handle castling rights updates
    function handleCastlingRights(piece, source) {
        if (piece === 'wK') {
            $('#whiteKingSide, #whiteQueenSide').prop('checked', false);
        } else if (piece === 'bK') {
            $('#blackKingSide, #blackQueenSide').prop('checked', false);
        } else if (piece === 'wR') {
            if (source === 'h1') $('#whiteKingSide').prop('checked', false);
            if (source === 'a1') $('#whiteQueenSide').prop('checked', false);
        } else if (piece === 'bR') {
            if (source === 'h8') $('#blackKingSide').prop('checked', false);
            if (source === 'a8') $('#blackQueenSide').prop('checked', false);
        }
    }
    
    // Handle pawn promotion
    function handlePawnPromotion(piece, target, newPos) {
        if (piece === 'wP' && target.charAt(1) === '8') {
            newPos[target] = 'wQ';
            board.position(newPos);
        } else if (piece === 'bP' && target.charAt(1) === '1') {
            newPos[target] = 'bQ';
            board.position(newPos);
        }
    }
    
    // Handle drag start
    function onDragStart(source, piece, position, orientation) {
        return true;
    }
    
    // Handle move end
    function onMoveEnd(oldPos, newPos) {
        updateFenDisplay();
        removeHighlights();
    }
    
    // Update game state from board position
    function updateGameState() {
        try {
            const fen = buildFenString();
            game.load(fen);
        } catch (error) {
            console.error('Failed to update game state:', error);
        }
    }
    
    // Build complete FEN string from current position and settings
    function buildFenString() {
        const position = board.fen();
        const turn = $('input[name="turn"]:checked').val();
        
        let castling = '';
        if ($('#whiteKingSide').is(':checked')) castling += 'K';
        if ($('#whiteQueenSide').is(':checked')) castling += 'Q';
        if ($('#blackKingSide').is(':checked')) castling += 'k';
        if ($('#blackQueenSide').is(':checked')) castling += 'q';
        if (castling === '') castling = '-';
        
        return `${position} ${turn} ${castling} - 0 1`;
    }
    
    // Update FEN display
    function updateFenDisplay() {
        const fen = buildFenString();
        $('#fenInput').val(fen);
    }
    
    // Clear analysis results
    function clearResults() {
        $('#bestMove1, #bestMove2, #bestMove3').val('');
        $('#evaluation1, #evaluation2, #evaluation3').val('');
        $('#principalVariation1, #principalVariation2, #principalVariation3').val('');
        $('#depth').val('');
        removeHighlights();
    }
    
    // Event handlers
    $('#startBtn').click(function() {
        board.start();
        game.reset();
        $('#whiteToMove').prop('checked', true);
        $('#whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').prop('checked', true);
        updateFenDisplay();
        clearResults();
        setAnalysisProgress(50);
    });
    
    $('#clearBtn').click(function() {
        board.clear();
        game.clear();
        $('#whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').prop('checked', false);
        updateFenDisplay();
        clearResults();
        setAnalysisProgress(50);
    });
    
    $('#flipBtn').click(function() {
        board.flip();
        clearResults();
        setAnalysisProgress(100 - currentProgress);
    });
    
    $('#setFenBtn').click(function() {
        const fen = $('#fenInput').val().trim();
        if (fen) {
            try {
                const fenParts = fen.split(' ');
                board.position(fenParts[0]);
                
                if (fenParts.length > 1) {
                    const turn = fenParts[1];
                    if (turn === 'w') {
                        $('#whiteToMove').prop('checked', true);
                    } else {
                        $('#blackToMove').prop('checked', true);
                    }
                }
                
                if (fenParts.length > 2) {
                    const castling = fenParts[2];
                    $('#whiteKingSide').prop('checked', castling.includes('K'));
                    $('#whiteQueenSide').prop('checked', castling.includes('Q'));
                    $('#blackKingSide').prop('checked', castling.includes('k'));
                    $('#blackQueenSide').prop('checked', castling.includes('q'));
                }
                
                updateGameState();
                clearResults();
            } catch (error) {
                alert('Invalid FEN string');
            }
        }
    });
    
    $('#calculateBtn').click(function() {
        if (engineThinking || !stockfish) {
            return;
        }
        
        const fen = buildFenString();
        const thinkTime = parseInt($('#thinkTime').val()) * 1000;
        
        // Clear previous results
        clearResults();
        
        // Set thinking state with animation
        engineThinking = true;
        $('#calculateBtn')
            .prop('disabled', true)
            .text('Thinking...')
            .addClass('thinking');
        
        // Add visual feedback
        $('#results-section').css('opacity', '0.5');
        
        // Start analysis
        stockfish.postMessage('position fen ' + fen);
stockfish.postMessage('setoption name MultiPV value 3');
        stockfish.postMessage('go movetime ' + thinkTime);
        
        // Animate time progress bar
        animateProgressBar('#timeProgress', 100, thinkTime);
    });
    
    // Update FEN when game state controls change
    $('input[name="turn"], #whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').change(function() {
        updateFenDisplay();
        updateGameState();
        saveGameState(); // Save state when controls change
    });
    
    // Save state when other controls change
    $('#thinkTime, input[name="mode"]').change(function() {
        saveGameState();
    });
    
    // Save current state to sessionStorage (per-tab)
    function saveGameState() {
        const currentState = {
            position: board.fen(),
            turn: $('input[name="turn"]:checked').val(),
            castling: {
                whiteKingSide: $('#whiteKingSide').is(':checked'),
                whiteQueenSide: $('#whiteQueenSide').is(':checked'),
                blackKingSide: $('#blackKingSide').is(':checked'),
                blackQueenSide: $('#blackQueenSide').is(':checked')
            },
            orientation: board.orientation(),
            thinkTime: $('#thinkTime').val(),
            mode: $('input[name="mode"]:checked').val(),
            timestamp: Date.now()
        };
        
        try {
            sessionStorage.setItem('chessAnalyzerState', JSON.stringify(currentState));
        } catch (error) {
            console.warn('Could not save game state to sessionStorage:', error);
        }
    }
    
    // Load saved state from sessionStorage (per-tab)
    function loadGameState() {
        try {
            const savedState = sessionStorage.getItem('chessAnalyzerState');
            if (!savedState) return false;
            
            const state = JSON.parse(savedState);
            
            // SessionStorage doesn't need expiry check as it's cleared when tab closes
            // But we can still include it for consistency
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            if (Date.now() - state.timestamp > maxAge) {
                sessionStorage.removeItem('chessAnalyzerState');
                return false;
            }
            
            // Restore board position
            if (state.position) {
                board.position(state.position);
            }
            
            // Restore turn
            if (state.turn === 'w') {
                $('#whiteToMove').prop('checked', true);
            } else {
                $('#blackToMove').prop('checked', true);
            }
            
            // Restore castling rights
            if (state.castling) {
                $('#whiteKingSide').prop('checked', state.castling.whiteKingSide);
                $('#whiteQueenSide').prop('checked', state.castling.whiteQueenSide);
                $('#blackKingSide').prop('checked', state.castling.blackKingSide);
                $('#blackQueenSide').prop('checked', state.castling.blackQueenSide);
            }
            
            // Restore board orientation
            if (state.orientation && state.orientation !== board.orientation()) {
                board.flip();
            }
            
            // Restore think time
            if (state.thinkTime) {
                $('#thinkTime').val(state.thinkTime);
            }
            
            // Restore analysis mode
            if (state.mode === 'show') {
                $('#showMove').prop('checked', true);
            } else if (state.mode === 'make') {
                $('#makeMove').prop('checked', true);
            }
            
            // Update game state and FEN display
            updateGameState();
            updateFenDisplay();
            
            console.log('Game state restored from sessionStorage for this tab');
            return true;
            
        } catch (error) {
            console.warn('Could not load game state from sessionStorage:', error);
            sessionStorage.removeItem('chessAnalyzerState');
            return false;
        }
    }
    
    // Clear saved state
    function clearSavedState() {
        try {
            sessionStorage.removeItem('chessAnalyzerState');
            console.log('Saved game state cleared for this tab');
        } catch (error) {
            console.warn('Could not clear saved state:', error);
        }
    }
    
    // Initialize everything
    initBoard();
    initStockfish();
    
    // Try to load saved state after board is initialized
    setTimeout(() => {
        loadGameState();
    }, 100);
});

// Add CSS for move highlighting
const style = document.createElement('style');
style.textContent = `
    .highlight-from {
        box-shadow: inset 0 0 3px 3px yellow !important;
    }
    .highlight-to {
        box-shadow: inset 0 0 3px 3px red !important;
    }
`;
document.head.appendChild(style);

$(document).ready(function() {
    // Initialize variables
    let board = null;
    let game = new Chess();
    let stockfish = null;
    let engineThinking = false;
    let currentProgress = 50;
    
    // Move history for navigation
    let moveHistory = [];
    let currentHistoryIndex = -1;
    
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
                const evaluation = parseEvaluation(line);

                switch(pvNumber) {
                    case '1':
                        $('#bestMove1').val(formatMove(move));
                        $('#principalVariation1').val(formatPrincipalVariation(pv));
                        $('#evaluation1').val(evaluation);
                        updateMoveDetails(move, evaluation, 1);
                        break;
                    case '2':
                        $('#bestMove2').val(formatMove(move));
                        $('#principalVariation2').val(formatPrincipalVariation(pv));
                        $('#evaluation2').val(evaluation);
                        updateMoveDetails(move, evaluation, 2);
                        break;
                    case '3':
                        $('#bestMove3').val(formatMove(move));
                        $('#principalVariation3').val(formatPrincipalVariation(pv));
                        $('#evaluation3').val(evaluation);
                        updateMoveDetails(move, evaluation, 3);
                        break;
                }

                // For the first move, also update progress bar and handle highlighting/making move
                if (pvNumber === '1') {
                    const mode = $('input[name="mode"]:checked').val();
                    const rawMove = pv.split(' ')[0];
                    
                    if (mode === 'make') {
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
                
                // Highlight moves after each one is processed if in show mode
                const mode = $('input[name="mode"]:checked').val();
                if (mode === 'show') {
                    setTimeout(() => highlightAllMoves(), 50);
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
    
    // Format move for display with piece notation (e.g., "e2e4" -> "pe2e4" for pawn)
    function formatMove(move) {
        if (move.length >= 4) {
            const fromSquare = move.slice(0, 2);
            const toSquare = move.slice(2, 4);
            const position = board.position();
            const piece = position[fromSquare];
            
            if (piece) {
                const pieceChar = piece.charAt(1).toLowerCase();
                const pieceSymbol = pieceChar === 'p' ? 'p' : pieceChar.toUpperCase();
                return pieceSymbol + fromSquare + toSquare;
            }
            return move.slice(0, 2) + move.slice(2);
        }
        return move;
    }
    
    // Format principal variation for display
    function formatPrincipalVariation(pv) {
        return pv.split(' ').map(move => formatMove(move)).join(' ');
    }
    
    // Highlight moves on the board - now handles all three moves
    function highlightMove(move) {
        // Don't remove highlights here - we want to show all three moves
        if (move && move.length >= 4) {
            const fromSquare = move.slice(0, 2);
            const toSquare = move.slice(2, 4);
            
            $('.square-' + fromSquare).addClass('highlight-from');
            $('.square-' + toSquare).addClass('highlight-to');
        }
    }
    
    // Highlight all three best moves on the board
    function highlightAllMoves() {
        removeHighlights();
        
        // Get all three moves and highlight them
        const move1 = $('#bestMove1').val();
        const move2 = $('#bestMove2').val();
        const move3 = $('#bestMove3').val();
        
        console.log('Highlighting moves:', { move1, move2, move3 });
        
        // Helper function to extract squares from formatted move
        function extractSquares(formattedMove) {
            if (!formattedMove) return null;
            
            // Remove piece letter at the beginning (like 'p', 'K', 'Q', etc.)
            let moveStr = formattedMove;
            if (moveStr.length > 4 && /^[a-zA-Z]/.test(moveStr)) {
                moveStr = moveStr.slice(1); // Remove first character if it's a letter
            }
            
            if (moveStr.length >= 4) {
                return {
                    from: moveStr.slice(0, 2),
                    to: moveStr.slice(2, 4)
                };
            }
            return null;
        }
        
        // Highlight move 1 in green shades (best move)
        if (move1) {
            const squares1 = extractSquares(move1);
            console.log('Move 1 extraction:', move1, '->', squares1);
            if (squares1) {
                console.log('Highlighting move 1:', squares1.from, '->', squares1.to);
                $('.square-' + squares1.from).addClass('highlight-move1-from');
                $('.square-' + squares1.to).addClass('highlight-move1-to');
            }
        }
        
        // Highlight move 2 in pink shades
        if (move2) {
            const squares2 = extractSquares(move2);
            console.log('Move 2 extraction:', move2, '->', squares2);
            if (squares2) {
                console.log('Highlighting move 2:', squares2.from, '->', squares2.to);
                $('.square-' + squares2.from).addClass('highlight-move2-from');
                $('.square-' + squares2.to).addClass('highlight-move2-to');
            }
        }
        
        // Highlight move 3 in orange shades
        if (move3) {
            const squares3 = extractSquares(move3);
            console.log('Move 3 extraction:', move3, '->', squares3);
            if (squares3) {
                console.log('Highlighting move 3:', squares3.from, '->', squares3.to);
                $('.square-' + squares3.from).addClass('highlight-move3-from');
                $('.square-' + squares3.to).addClass('highlight-move3-to');
            }
        }
    }
    
    // Remove move highlights
    function removeHighlights() {
        $('#myBoard .square-55d63').removeClass('highlight-from highlight-to highlight-move1-from highlight-move1-to highlight-move2-from highlight-move2-to highlight-move3-from highlight-move3-to');
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
            addToHistory(); // Add position to history after piece move
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
        $('#moveDescription1, #moveDescription2, #moveDescription3').text('');
        $('#resultingValue1, #resultingValue2, #resultingValue3').text('').removeClass('negative mate');
        $('#depth').val('');
        removeHighlights();
    }
    
    // Update move details - now just shows the evaluation, no verbose description
    function updateMoveDetails(move, evaluation, moveNumber) {
        if (!move || move.length < 4) {
            return;
        }
        
        try {
            // Clear the description as we don't want verbose text anymore
            $(`#moveDescription${moveNumber}`).text('');
            
            // Update resulting value with appropriate styling
            const resultingElement = $(`#resultingValue${moveNumber}`);
            resultingElement.text(`${evaluation}`);
            
            // Apply styling based on evaluation
            resultingElement.removeClass('negative mate');
            if (evaluation.includes('M')) {
                resultingElement.addClass('mate');
            } else if (evaluation.startsWith('-')) {
                resultingElement.addClass('negative');
            }
            
        } catch (error) {
            console.error('Error updating move details:', error);
            $(`#moveDescription${moveNumber}`).text('');
            $(`#resultingValue${moveNumber}`).text(`${evaluation}`);
        }
    }
    
    // Helper function to get piece type name
    function getPieceTypeName(pieceChar) {
        const pieceNames = {
            'p': 'Pawn',
            'r': 'Rook',
            'n': 'Knight',
            'b': 'Bishop',
            'q': 'Queen',
            'k': 'King'
        };
        return pieceNames[pieceChar.toLowerCase()] || 'Piece';
    }
    
    // Add position to history
    function addToHistory() {
        const currentState = {
            position: board.fen(),
            turn: $('input[name="turn"]:checked').val(),
            castling: {
                whiteKingSide: $('#whiteKingSide').is(':checked'),
                whiteQueenSide: $('#whiteQueenSide').is(':checked'),
                blackKingSide: $('#blackKingSide').is(':checked'),
                blackQueenSide: $('#blackQueenSide').is(':checked')
            }
        };
        
        // If we're not at the end of history, remove everything after current position
        if (currentHistoryIndex < moveHistory.length - 1) {
            moveHistory = moveHistory.slice(0, currentHistoryIndex + 1);
        }
        
        // Add new state
        moveHistory.push(currentState);
        currentHistoryIndex = moveHistory.length - 1;
        
        // Update navigation buttons
        updateNavigationButtons();
    }
    
    // Navigate to previous position
    function navigateToPrevious() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            const state = moveHistory[currentHistoryIndex];
            restoreState(state);
            updateNavigationButtons();
        }
    }
    
    // Navigate to next position
    function navigateToNext() {
        if (currentHistoryIndex < moveHistory.length - 1) {
            currentHistoryIndex++;
            const state = moveHistory[currentHistoryIndex];
            restoreState(state);
            updateNavigationButtons();
        }
    }
    
    // Restore board state
    function restoreState(state) {
        // Restore board position
        board.position(state.position);
        
        // Restore turn
        if (state.turn === 'w') {
            $('#whiteToMove').prop('checked', true);
        } else {
            $('#blackToMove').prop('checked', true);
        }
        
        // Restore castling rights
        $('#whiteKingSide').prop('checked', state.castling.whiteKingSide);
        $('#whiteQueenSide').prop('checked', state.castling.whiteQueenSide);
        $('#blackKingSide').prop('checked', state.castling.blackKingSide);
        $('#blackQueenSide').prop('checked', state.castling.blackQueenSide);
        
        // Update game state and FEN display
        updateGameState();
        updateFenDisplay();
        clearResults();
    }
    
    // Update navigation button states
    function updateNavigationButtons() {
        const prevBtn = $('#prevBtn');
        const nextBtn = $('#nextBtn');
        
        // Update Previous button
        if (currentHistoryIndex <= 0) {
            prevBtn.prop('disabled', true);
        } else {
            prevBtn.prop('disabled', false);
        }
        
        // Update Next button
        if (currentHistoryIndex >= moveHistory.length - 1) {
            nextBtn.prop('disabled', true);
        } else {
            nextBtn.prop('disabled', false);
        }
    }
    
    // Clear move history
    function clearHistory() {
        moveHistory = [];
        currentHistoryIndex = -1;
        updateNavigationButtons();
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
        clearHistory();
        addToHistory(); // Add starting position to history
    });
    
    $('#clearBtn').click(function() {
        board.clear();
        game.clear();
        $('#whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').prop('checked', false);
        updateFenDisplay();
        clearResults();
        setAnalysisProgress(50);
        clearHistory();
        addToHistory(); // Add empty position to history
    });
    
    $('#flipBtn').click(function() {
        board.flip();
        clearResults();
        setAnalysisProgress(100 - currentProgress);
    });
    
    // Navigation button handlers
    $('#prevBtn').click(function() {
        navigateToPrevious();
    });
    
    $('#nextBtn').click(function() {
        navigateToNext();
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
    
    /* Move 1 highlighting - Gentle green shades (Best move) */
    .highlight-move1-from {
        box-shadow: inset 0 0 4px 4px #90EE90 !important;
        border: 2px solid #7CB342 !important;
    }
    .highlight-move1-to {
        box-shadow: inset 0 0 4px 4px #C8E6C9 !important;
        border: 2px solid #90EE90 !important;
    }
    
    /* Move 2 highlighting - Gentle pink shades */
    .highlight-move2-from {
        box-shadow: inset 0 0 4px 4px #F8BBD9 !important;
        border: 2px solid #E1A0C4 !important;
    }
    .highlight-move2-to {
        box-shadow: inset 0 0 4px 4px #FCE4EC !important;
        border: 2px solid #F8BBD9 !important;
    }
    
    /* Move 3 highlighting - Gentle orange shades */
    .highlight-move3-from {
        box-shadow: inset 0 0 4px 4px #FFCC80 !important;
        border: 2px solid #FF9800 !important;
    }
    .highlight-move3-to {
        box-shadow: inset 0 0 4px 4px #FFF3E0 !important;
        border: 2px solid #FFCC80 !important;
    }
`;
document.head.appendChild(style);

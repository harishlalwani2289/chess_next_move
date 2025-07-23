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
    
    // Handle messages from Stockfish engine
    function handleEngineMessage(event) {
        const line = event.data || event;
        console.log('Stockfish:', line);
        
        // Parse best move
        if (line.startsWith('bestmove')) {
            const moveMatch = line.match(/bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/);
            if (moveMatch) {
                const bestMove = moveMatch[1];
                const formattedMove = formatMove(bestMove);
                $('#bestMove').val(formattedMove);
                
                const mode = $('input[name="mode"]:checked').val();
                if (mode === 'show') {
                    highlightMove(bestMove);
                } else if (mode === 'make') {
                    makeEngineMove(bestMove);
                }
            }
            
            // Re-enable calculate button
            $('#calculateBtn').prop('disabled', false).text('Calculate Best Move');
            engineThinking = false;
            animateProgressBar('#timeProgress', 0, 100);
        }
        
        // Parse evaluation score
        const cpMatch = line.match(/cp (-?\d+)/);
        const mateMatch = line.match(/mate (-?\d+)/);
        
        if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            const currentTurn = $('input[name="turn"]:checked').val();
            let displayMate = mateIn;
            
            if (currentTurn === 'b') {
                displayMate = -mateIn;
            }
            
            if (displayMate > 0) {
                $('#evaluation').val(`+M${Math.abs(displayMate)}`);
                setAnalysisProgress(board.orientation() === 'white' ? 100 : 1);
            } else if (displayMate < 0) {
                $('#evaluation').val(`-M${Math.abs(displayMate)}`);
                setAnalysisProgress(board.orientation() === 'white' ? 1 : 100);
            } else {
                $('#evaluation').val('M0');
                setAnalysisProgress(50);
            }
        } else if (cpMatch) {
            let score = parseInt(cpMatch[1]);
            const currentTurn = $('input[name="turn"]:checked').val();
            
            if (currentTurn === 'b') {
                score = -score;
            }
            
            const pawnScore = (score / 100).toFixed(2);
            $('#evaluation').val(score > 0 ? `+${pawnScore}` : pawnScore);
            
            // Update progress bar based on evaluation
            const progressValue = Math.max(1, Math.min(99, 50 + (score / 100) * 5));
            setAnalysisProgress(board.orientation() === 'white' ? progressValue : 100 - progressValue);
        }
        
        // Parse search depth
        const depthMatch = line.match(/depth (\d+)/);
        if (depthMatch) {
            $('#depth').val(depthMatch[1]);
        }
        
        // Parse principal variation
        const pvMatch = line.match(/pv (.+?)(?:\s|$)/);
        if (pvMatch) {
            const pv = pvMatch[1].trim();
            $('#principalVariation').val(formatPrincipalVariation(pv));
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
        $('#bestMove, #evaluation, #depth, #principalVariation').val('');
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
        
        // Set thinking state
        engineThinking = true;
        $('#calculateBtn').prop('disabled', true).text('Thinking...');
        
        // Start analysis
        stockfish.postMessage('position fen ' + fen);
        stockfish.postMessage('go movetime ' + thinkTime);
        
        // Animate time progress bar
        animateProgressBar('#timeProgress', 100, thinkTime);
    });
    
    // Update FEN when game state controls change
    $('input[name="turn"], #whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').change(function() {
        updateFenDisplay();
        updateGameState();
    });
    
    // Initialize everything
    initBoard();
    initStockfish();
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

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
        const line = typeof event === 'string' ? event : (event.data || event);
        if (typeof line !== 'string') {
            console.log('Stockfish (non-string):', line);
            return;
        }
        console.log('Stockfish:', line);
        
        // Parse multi pv (best moves)
        if (line.includes('multipv')) {
            // More flexible regex to capture PV moves
            const match = line.match(/multipv (\d+).*?pv\s+(.+)/);
            if (match) {
                console.log('Raw PV match:', match[2]);
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
                        setAnalysisProgress(board.state.orientation === 'white' ? progressValue : 100 - progressValue);
                    }
                }
                
                // Always highlight moves in show mode, regardless of which PV this is
                const mode = $('input[name="mode"]:checked').val();
                console.log('Current mode:', mode, 'PV Number:', pvNumber);
                if (mode === 'show') {
                    // Only highlight after we have the first move to avoid multiple calls
                    if (pvNumber === '1') {
                        console.log('Scheduling highlighting in 100ms');
                        setTimeout(() => {
                            console.log('Now calling highlightAllMoves');
                            highlightAllMoves();
                        }, 100);
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
    
    // Format move for display with piece notation (e.g., "e2e4" -> "pe2e4" for pawn)
    function formatMove(move) {
        if (move.length >= 4) {
            const fromSquare = move.slice(0, 2);
            const toSquare = move.slice(2, 4);
            
            // Get position from chess.js since it maintains the board state
            const position = game.board();
            
            // Find the piece at the source square
            let piece = null;
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = String.fromCharCode(97 + col) + (8 - row);
                    if (square === fromSquare && position[row][col]) {
                        piece = position[row][col];
                        break;
                    }
                }
                if (piece) break;
            }
            
            if (piece) {
                const pieceChar = piece.type.toLowerCase();
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
    
    // Highlight all three best moves on the board using Chessground's native highlighting
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
        
        // Collect all squares to highlight using Chessground's built-in highlighting
        const highlightMap = new Map();
        
        // Add move 1 (best move) with green highlighting
        if (move1) {
            const squares1 = extractSquares(move1);
            console.log('Move 1 extraction:', move1, '->', squares1);
            if (squares1) {
                console.log('Adding move 1 highlighting:', squares1.from, '->', squares1.to);
                highlightMap.set(squares1.from, 'move1-from');
                highlightMap.set(squares1.to, 'move1-to');
            }
        }
        
        // Add move 2 with pink highlighting
        if (move2) {
            const squares2 = extractSquares(move2);
            console.log('Move 2 extraction:', move2, '->', squares2);
            if (squares2) {
                console.log('Adding move 2 highlighting:', squares2.from, '->', squares2.to);
                // If square already highlighted by move 1, keep move 1 (best move) priority
                if (!highlightMap.has(squares2.from)) {
                    highlightMap.set(squares2.from, 'move2-from');
                }
                if (!highlightMap.has(squares2.to)) {
                    highlightMap.set(squares2.to, 'move2-to');
                }
            }
        }
        
        // Add move 3 with orange highlighting
        if (move3) {
            const squares3 = extractSquares(move3);
            console.log('Move 3 extraction:', move3, '->', squares3);
            if (squares3) {
                console.log('Adding move 3 highlighting:', squares3.from, '->', squares3.to);
                // If square already highlighted by move 1 or 2, keep higher priority
                if (!highlightMap.has(squares3.from)) {
                    highlightMap.set(squares3.from, 'move3-from');
                }
                if (!highlightMap.has(squares3.to)) {
                    highlightMap.set(squares3.to, 'move3-to');
                }
            }
        }
        
        // Apply all highlights using Chessground's shapes API
        console.log('Applying highlights to Chessground:', Array.from(highlightMap.entries()));
        
        // Convert highlights to shapes with custom colors and styles
        const shapes = [];
        highlightMap.forEach((cssClass, square) => {
            let brush = 'green';
            
            if (cssClass.includes('move1')) {
                // Best move - green with different shades for from/to
                brush = cssClass.includes('-from') ? 'paleGreen' : 'green';
            } else if (cssClass.includes('move2')) {
                // Second move - blue/purple
                brush = cssClass.includes('-from') ? 'paleBlue' : 'blue';
            } else if (cssClass.includes('move3')) {
                // Third move - orange/yellow
                brush = cssClass.includes('-from') ? 'paleRed' : 'red';
            }
            
            shapes.push({
                orig: square,
                brush: brush
            });
        });
        
        console.log('Setting shapes:', shapes);
        board.setShapes(shapes);
        
        // Add PV arrows for the best move
        showPVArrows();
    }
    
    // Remove move highlights
    function removeHighlights() {
        console.log('Removing highlights');
        // Clear Chessground's shapes and highlighting
        board.setShapes([]);
        board.set({
            highlight: {
                lastMove: true, // Re-enable last move highlighting
                check: true,
                custom: new Map() // Clear custom highlights
            }
        });
        removePVArrows();
    }
    
    // Show arrows for principal variation moves (first 4 moves of best line)
    function showPVArrows() {
        const pv1 = $('#principalVariation1').val();
        if (!pv1) return;
        
        console.log('PV1 for arrows:', pv1);
        
        // Parse the PV moves - extract clean moves without piece notation
        const allTokens = pv1.trim().split(' ');
        const cleanMoves = [];
        
        // Process each token to extract clean moves
        for (const token of allTokens) {
            let cleanMove = token;
            
            // Remove piece notation if present (e.g., "pe2e4" -> "e2e4")
            if (cleanMove.length > 4 && /^[a-zA-Z]/.test(cleanMove)) {
                cleanMove = cleanMove.slice(1);
            }
            
            // Validate it's a proper move format
            if (cleanMove.length >= 4 && cleanMove.length <= 5 && /^[a-h][1-8][a-h][1-8][qrnb]?$/.test(cleanMove)) {
                cleanMoves.push(cleanMove);
            }
        }
        
        // Take first 4 moves for arrows
        const pvMoves = cleanMoves.slice(0, 4);
        console.log('Clean PV moves for arrows:', pvMoves);
        
        // Get current shapes (highlights) and add arrows to them
        const currentShapes = board.state.drawable.shapes || [];
        
        // Remove any existing PV arrows (they would have specific identifiers)
        const nonArrowShapes = currentShapes.filter(shape => !shape.dest); // Arrows have dest, highlights don't
        
        const arrowShapes = [];
        
        // Define arrow colors for sequence: 1=green, 2=blue, 3=orange, 4=purple
        const arrowColors = ['green', 'blue', 'yellow', 'red'];
        
        pvMoves.forEach((moveStr, index) => {
            if (!moveStr) return;
            
            const fromSquare = moveStr.slice(0, 2);
            const toSquare = moveStr.slice(2, 4);
            
            // Validate square names
            if (/^[a-h][1-8]$/.test(fromSquare) && /^[a-h][1-8]$/.test(toSquare)) {
                console.log(`Creating PV arrow ${index + 1}: ${fromSquare} -> ${toSquare}`);
                
                arrowShapes.push({
                    orig: fromSquare,
                    dest: toSquare,
                    brush: arrowColors[index] || 'green'
                });
            } else {
                console.log(`Invalid squares for PV arrow: ${fromSquare} -> ${toSquare}`);
            }
        });
        
        // Combine highlight shapes with new arrows
        const allShapes = [...nonArrowShapes, ...arrowShapes];
        console.log('Setting shapes with PV arrows:', allShapes);
        board.setShapes(allShapes);
        
        // Add numbered labels on top of the arrows using DOM overlay
        addArrowNumbers(pvMoves);
    }
    
    // Add numbered labels on arrows using DOM overlay
    function addArrowNumbers(pvMoves) {
        // Remove any existing arrow numbers
        $('.pv-arrow-number').remove();
        
        if (!pvMoves || pvMoves.length === 0) return;
        
        const boardElement = $('#myBoard');
        const boardRect = boardElement[0].getBoundingClientRect();
        const squareSize = boardRect.width / 8;
        
        pvMoves.forEach((moveStr, index) => {
            if (!moveStr) return;
            
            const fromSquare = moveStr.slice(0, 2);
            const toSquare = moveStr.slice(2, 4);
            
            // Convert square notation to coordinates
            const fromFile = fromSquare.charCodeAt(0) - 97; // a=0, b=1, etc.
            const fromRank = parseInt(fromSquare[1]) - 1;   // 1=0, 2=1, etc.
            const toFile = toSquare.charCodeAt(0) - 97;
            const toRank = parseInt(toSquare[1]) - 1;
            
            // Check board orientation
            const isFlipped = board.state.orientation === 'black';
            
            // Calculate pixel positions (adjust for flipped board)
            const fromX = isFlipped ? (7 - fromFile) * squareSize : fromFile * squareSize;
            const fromY = isFlipped ? fromRank * squareSize : (7 - fromRank) * squareSize;
            const toX = isFlipped ? (7 - toFile) * squareSize : toFile * squareSize;
            const toY = isFlipped ? toRank * squareSize : (7 - toRank) * squareSize;
            
            // Calculate arrow midpoint for number placement
            const midX = (fromX + toX) / 2 + squareSize / 2;
            const midY = (fromY + toY) / 2 + squareSize / 2;
            
            // Define colors to match arrows
            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']; // Green, Blue, Orange, Purple
            
            // Create numbered circle
            const numberElement = $(`
                <div class="pv-arrow-number" style="
                    position: absolute;
                    left: ${midX - 12}px;
                    top: ${midY - 12}px;
                    width: 24px;
                    height: 24px;
                    background: ${colors[index] || '#4CAF50'};
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: bold;
                    z-index: 1001;
                    pointer-events: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    border: 2px solid white;
                ">${index + 1}</div>
            `);
            
            boardElement.css('position', 'relative').append(numberElement);
        });
    }
    
    // Remove all PV arrows - now handled by Chessground shapes
    function removePVArrows() {
        // Remove DOM-based arrow numbers
        $('.pv-arrow-number').remove();
        // PV arrows are now part of the shapes system, so they're cleared with removeHighlights()
    }
    
    // Make the engine's suggested move
    function makeEngineMove(move) {
        try {
            const moveObj = game.move(move, { sloppy: true });
            if (moveObj) {
                board.set({ fen: game.fen() });
                updateValidMoves();
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
    
    // Initialize chess board with Chessground
    function initBoard(initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
        console.log('🔧 Starting board initialization with FEN:', initialFen);
        
        // Load the initial position into chess.js first if it's not the starting position
        if (initialFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
            try {
                game.load(initialFen);
                console.log('🔄 Loaded initial position into chess.js');
            } catch (error) {
                console.error('Error loading initial FEN:', error);
                initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                game.reset();
            }
        }
        
        // Comprehensive mobile debugging
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('📱 Screen dimensions:', window.screen.width, 'x', window.screen.height);
        console.log('📱 Viewport dimensions:', window.innerWidth, 'x', window.innerHeight);
        console.log('📱 Device pixel ratio:', window.devicePixelRatio);
        console.log('📱 Touch support:', 'ontouchstart' in window);
        
        // Check if the board element exists
        const boardElement = document.getElementById('myBoard');
        console.log('📋 Board element found:', boardElement);
        console.log('📋 Board element dimensions:', boardElement ? boardElement.getBoundingClientRect() : 'N/A');
        
        // Set initial theme classes on board element
        if (boardElement) {
            // Remove any existing classes and add default theme classes: brown board + cburnett pieces
            boardElement.className = '';
            boardElement.classList.add('brown', 'cburnett');
            console.log('🎨 Applied default theme classes:', boardElement.className);
        }
        
        // Check parent elements
        if (boardElement) {
            console.log('📋 Parent element (#board-section):', boardElement.parentElement);
            console.log('📋 Parent dimensions:', boardElement.parentElement ? boardElement.parentElement.getBoundingClientRect() : 'N/A');
            console.log('📋 Board element styles:', window.getComputedStyle(boardElement));
        }
        
        // Check if Chessground is available
        console.log('♟️ Chessground available:', typeof Chessground);
        
        const config = {
            fen: initialFen,
            movable: {
                free: false,
                color: 'both', // Allow both colors to move freely
                dests: getValidMoves(),
                events: {
                    after: onMove
                }
            },
            draggable: {
                enabled: true,
                showGhost: true
            },
            highlight: {
                lastMove: true,
                check: true
            },
            coordinates: true,
            resizable: true, // Chessground handles responsive resizing
            events: {
                move: onMove
            },
            drawable: {
                enabled: true,
                visible: true
            }
        };
        
        console.log('⚙️ Board config:', config);
        
        try {
            board = Chessground(boardElement, config);
            console.log('✅ Chessground board created:', board);
            console.log('📋 Board state after creation:', board.state);
            
            // Ensure pieces are visible after creation with multiple checks
            const ensurePieces = () => {
                console.log('🔍 Checking board state:', board.state.pieces);
                // Handle both Map and Object piece storage
                let pieceCount = 0;
                if (board.state.pieces) {
                    if (board.state.pieces instanceof Map) {
                        pieceCount = board.state.pieces.size;
                    } else {
                        pieceCount = Object.keys(board.state.pieces).length;
                    }
                }
                console.log('📊 Piece count:', pieceCount);
                
                // Check if pieces are actually visible in DOM
                const visiblePieces = document.querySelectorAll('#myBoard piece');
                console.log('👁️ Visible pieces in DOM:', visiblePieces.length);
                
                if (pieceCount < 32 || visiblePieces.length === 0) {
                    if (visiblePieces.length === 0) {
                        console.log('🚨 No pieces visible in DOM! Force redrawing...');
                    } else {
                        console.log('⚠️ Missing pieces detected! Restoring starting position...');
                    }
                    
                    // Force a complete redraw
                    board.redrawAll();
                    
                    // If still no pieces, try setting the position again
                    setTimeout(() => {
                        const stillVisiblePieces = document.querySelectorAll('#myBoard piece');
                        console.log('🔄 After redraw, visible pieces:', stillVisiblePieces.length);
                        
                        if (stillVisiblePieces.length === 0) {
                            console.log('🔧 Still no visible pieces, forcing position reset...');
                            board.set({
                                fen: initialFen,
                                animation: { enabled: false }
                            });
                            
                            // Final check
                            setTimeout(() => {
                                const finalVisiblePieces = document.querySelectorAll('#myBoard piece');
                                console.log('🎯 Final check - visible pieces:', finalVisiblePieces.length);
                                if (finalVisiblePieces.length === 0) {
                                    console.error('❌ Unable to make pieces visible!');
                                } else {
                                    console.log('✅ Pieces are now visible!');
                                }
                            }, 100);
                        } else {
                            console.log('✅ Pieces successfully restored!');
                        }
                    }, 100);
                } else {
                    console.log('✅ All pieces present and accounted for!');
                    // Even if pieces are "present", force a redraw to ensure visibility
                    board.redrawAll();
                }
            };
            
            // Check pieces multiple times to catch any vanishing
            setTimeout(ensurePieces, 100);
            setTimeout(ensurePieces, 300);
            setTimeout(ensurePieces, 500);
            
            // Simple mobile resize trigger - let Chessground handle the details
            if (window.innerWidth <= 768) {
                console.log('📱 Mobile detected, triggering resize...');
                
                // Give Chessground time to initialize, then trigger a simple redraw
                setTimeout(() => {
                    console.log('🔄 Triggering board redraw for mobile...');
                    board.redrawAll();
                    
                    // Log final dimensions
                    const finalRect = boardElement.getBoundingClientRect();
                    console.log('📐 Board dimensions after redraw:', finalRect);
                }, 200);
            }
        } catch (error) {
            console.error('❌ Failed to create Chessground board:', error);
            return;
        }
        
        // Update valid moves for initial position
        updateValidMoves();
        
        console.log('Chessground initialized successfully');
        
        // Store instances globally for button access
        window.chessAnalyzer.board = board;
        window.chessAnalyzer.game = game;
        
        // Store functions globally for button access
        window.chessAnalyzer.addToHistory = addToHistory;
        window.chessAnalyzer.saveGameState = saveGameState;
        window.chessAnalyzer.updateGameState = updateGameState;
        window.chessAnalyzer.updateFenDisplay = updateFenDisplay;
        window.chessAnalyzer.updateValidMoves = updateValidMoves;
        window.chessAnalyzer.clearResults = clearResults;
        window.chessAnalyzer.removeHighlights = removeHighlights;
        window.chessAnalyzer.updateTurnButtons = updateTurnButtons;
        
        // Delay these calls to prevent them from interfering with piece display
        setTimeout(() => {
            updateFenDisplay();
            addToHistory(); // Add starting position to history
        }, 150);
    }
    
    // Get valid moves for current position - now includes both colors for free movement
    function getValidMoves() {
        const dests = new Map();
        
        // Get moves for the current player
        const currentMoves = game.moves({ verbose: true });
        currentMoves.forEach(move => {
            const from = move.from;
            const to = move.to;
            
            if (dests.has(from)) {
                dests.get(from).push(to);
            } else {
                dests.set(from, [to]);
            }
        });
        
        // To enable free movement, also get moves for the opposite color
        // We'll temporarily switch the turn and get those moves too
        const originalFen = game.fen();
        const fenParts = originalFen.split(' ');
        const oppositeTurn = fenParts[1] === 'w' ? 'b' : 'w';
        const modifiedFen = fenParts[0] + ' ' + oppositeTurn + ' ' + fenParts.slice(2).join(' ');
        
        try {
            // Create a temporary game instance to get opposite color moves
            const tempGame = new Chess();
            if (tempGame.load(modifiedFen)) {
                const oppositeMoves = tempGame.moves({ verbose: true });
                oppositeMoves.forEach(move => {
                    const from = move.from;
                    const to = move.to;
                    
                    if (dests.has(from)) {
                        if (!dests.get(from).includes(to)) {
                            dests.get(from).push(to);
                        }
                    } else {
                        dests.set(from, [to]);
                    }
                });
            }
        } catch (error) {
            console.warn('Could not generate opposite color moves:', error);
        }
        
        return dests;
    }
    
    // Update valid moves on the board
    function updateValidMoves() {
        const currentTurn = game.turn() === 'w' ? 'white' : 'black';
        const validMoves = getValidMoves();
        
        console.log('Updating valid moves for free movement. Total valid moves:', validMoves.size);
        
        // For free movement, we set the movable color to 'both' which allows both sides to move
        // The getValidMoves() function already generates moves for both colors
        board.set({
            movable: {
                free: false,
                color: 'both', // Allow both white and black pieces to move
                dests: validMoves
            },
            turnColor: currentTurn
        });
    }
    
    // Handle moves with Chessground - now supports free movement
    function onMove(orig, dest, metadata) {
        console.log('Chessground move:', orig, '->', dest, 'metadata:', metadata);
        
        try {
            // Check for promotion
            let promotion = 'q'; // Default to queen
            if (metadata && metadata.promotion) {
                promotion = metadata.promotion;
            }
            
            // For free movement, we'll try the move as-is first
            let moveObj = game.move({
                from: orig,
                to: dest,
                promotion: promotion
            });
            
            // If the move failed (e.g., wrong turn), try forcing it
            if (!moveObj) {
                console.log('Move failed with current turn, trying to force move for free movement');
                
                // Get the current FEN and board state
                const currentFen = game.fen();
                const fenParts = currentFen.split(' ');
                
                // Get the piece at the source square
                const board_array = game.board();
                let sourcePiece = null;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const square = String.fromCharCode(97 + col) + (8 - row);
                        if (square === orig && board_array[row][col]) {
                            sourcePiece = board_array[row][col];
                            break;
                        }
                    }
                    if (sourcePiece) break;
                }
                
                if (sourcePiece) {
                    // Temporarily switch the turn to match the piece color
                    const pieceColor = sourcePiece.color; // 'w' or 'b'
                    const currentTurn = fenParts[1];
                    
                    if (pieceColor !== currentTurn) {
                        // Create a temporary FEN with the correct turn
                        const tempFen = fenParts[0] + ' ' + pieceColor + ' ' + fenParts.slice(2).join(' ');
                        
                        // Load the temporary FEN
                        const tempGame = new Chess();
                        if (tempGame.load(tempFen)) {
                            // Try the move with the correct turn
                            moveObj = tempGame.move({
                                from: orig,
                                to: dest,
                                promotion: promotion
                            });
                            
                            if (moveObj) {
                                // Apply the move to the main game by loading the resulting position
                                const resultFen = tempGame.fen();
                                const resultParts = resultFen.split(' ');
                                
                                // Restore the original turn after the move
                                const finalFen = resultParts[0] + ' ' + currentTurn + ' ' + resultParts.slice(2).join(' ');
                                game.load(finalFen);
                                
                                console.log('Free movement successful:', moveObj);
                            }
                        }
                    }
                }
            }
            
            if (moveObj) {
                console.log('Move successful:', moveObj);
                
                // Update valid moves for the new position
                updateValidMoves();
                
                // Update display and save state
                setTimeout(() => {
                    updateFenDisplay();
                    updateTurnButtons(); // Sync visual turn buttons
                    clearResults();
                    addToHistory();
                    saveGameState();
                }, 50);
                
                return true; // Indicate successful move
            } else {
                console.error('Invalid move attempted:', orig, '->', dest);
                // Revert the board to the previous position
                board.set({ fen: game.fen() });
                updateValidMoves();
                return false;
            }
        } catch (error) {
            console.error('Move error:', error);
            // Revert the board to the previous position
            board.set({ fen: game.fen() });
            updateValidMoves();
            return false;
        }
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
            board.set({ pieces: newPos });
        } else if (piece === 'bP' && target.charAt(1) === '1') {
            newPos[target] = 'bQ';
            board.set({ pieces: newPos });
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
            console.log('🔄 Updating game state with FEN:', fen);
            game.load(fen);
        } catch (error) {
            console.error('Failed to update game state:', error);
            console.log('📋 Current board state when error occurred:', board ? board.state : 'no board');
        }
    }
    
    // Build complete FEN string from current position and settings
    function buildFenString() {
        // Since castling rights are now synced from chess.js game state,
        // we can simply use the chess.js FEN which has the correct values
        try {
            const currentFen = game.fen();
            console.log('📋 buildFenString() returning FEN:', currentFen);
            return currentFen;
        } catch (error) {
            console.error('❌ Error getting FEN from game:', error);
            console.log('🔧 Game state:', game);
            console.log('🔧 Game valid:', game.validate_fen ? game.validate_fen(game.fen()) : 'unknown');
            
            // Fallback: try to get FEN from the fenInput field as last resort
            const fenInputValue = $('#fenInput').val().trim();
            if (fenInputValue && fenInputValue !== '') {
                console.log('🔧 Using FEN from input field as fallback:', fenInputValue);
                return fenInputValue;
            }
            
            // Final fallback: build manually if chess.js fails
            const turn = $('input[name="turn"]:checked').val();
            
            let castling = '';
            if ($('#whiteKingSide').is(':checked')) castling += 'K';
            if ($('#whiteQueenSide').is(':checked')) castling += 'Q';
            if ($('#blackKingSide').is(':checked')) castling += 'k';
            if ($('#blackQueenSide').is(':checked')) castling += 'q';
            if (castling === '') castling = '-';
            
            console.log('⚠️ Using manual fallback FEN - this should not happen!');
            return `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR ${turn} ${castling} - 0 1`;
        }
    }
    
    // Update FEN display
    function updateFenDisplay() {
        // First sync castling rights from chess.js game state
        syncCastlingRightsFromGame();
        
        // Get the actual FEN from chess.js (which has correct castling rights)
        const fen = game.fen();
        $('#fenInput').val(fen);
        updateTurnButtons();
        updateCastlingButtons();
    }
    
    // Sync castling rights checkboxes with chess.js game state
    function syncCastlingRightsFromGame() {
        try {
            const fen = game.fen();
            const fenParts = fen.split(' ');
            const castlingRights = fenParts[1] ? fenParts[2] : 'KQkq'; // Default if no castling part
            
            // Update hidden checkboxes to match chess.js game state
            $('#whiteKingSide').prop('checked', castlingRights.includes('K'));
            $('#whiteQueenSide').prop('checked', castlingRights.includes('Q'));
            $('#blackKingSide').prop('checked', castlingRights.includes('k'));
            $('#blackQueenSide').prop('checked', castlingRights.includes('q'));
            
            console.log('Synced castling rights from game:', castlingRights);
        } catch (error) {
            console.error('Error syncing castling rights:', error);
        }
    }
    
    // Update turn button states based on current turn
    function updateTurnButtons() {
        const currentTurn = $('input[name="turn"]:checked').val();
        $('.turn-btn').removeClass('active');
        
        if (currentTurn === 'w') {
            $('#whiteToMoveBtn').addClass('active');
        } else {
            $('#blackToMoveBtn').addClass('active');
        }
    }
    
    // Update castling button states based on current castling rights
    function updateCastlingButtons() {
        // Update visual states to match hidden checkboxes
        $('#whiteKingSideBtn').toggleClass('active', $('#whiteKingSide').is(':checked'));
        $('#whiteQueenSideBtn').toggleClass('active', $('#whiteQueenSide').is(':checked'));
        $('#blackKingSideBtn').toggleClass('active', $('#blackKingSide').is(':checked'));
        $('#blackQueenSideBtn').toggleClass('active', $('#blackQueenSide').is(':checked'));
    }
    
    // Clear analysis results
    function clearResults() {
        $('#bestMove1, #bestMove2, #bestMove3').val('');
        $('#evaluation1, #evaluation2, #evaluation3').val('');
        $('#principalVariation1, #principalVariation2, #principalVariation3').val('');
        $('#moveDescription1, #moveDescription2, #moveDescription3').text('');
        $('#makeMoveBtn1, #makeMoveBtn2, #makeMoveBtn3').hide();
        $('#depth').val('');
        removeHighlights();
        
        // Clear AI explanation cache when moves are recalculated
        if (window.chessAnalyzer && window.chessAnalyzer.explanationCache) {
            window.chessAnalyzer.explanationCache.clear();
            console.log('AI explanation cache cleared');
        }
        
        // Reset tooltip content to default state
        for (let i = 1; i <= 3; i++) {
            $(`#aiText${i}`).text('Hover to get AI explanation');
            $(`#aiContent${i}`).show();
            $(`#aiLoading${i}`).hide();
        }
    }
    
    // Update move details - now shows/hides the Make Move button
    function updateMoveDetails(move, evaluation, moveNumber) {
        if (!move || move.length < 4) {
            // Hide the button if no valid move
            $(`#makeMoveBtn${moveNumber}`).hide();
            return;
        }
        
        try {
            // Clear the description as we don't want verbose text anymore
            $(`#moveDescription${moveNumber}`).text('');
            
            // Show the Make Move button
            $(`#makeMoveBtn${moveNumber}`).show();
            
        } catch (error) {
            console.error('Error updating move details:', error);
            $(`#moveDescription${moveNumber}`).text('');
            $(`#makeMoveBtn${moveNumber}`).hide();
        }
    }
    
    // Function to make a selected move from the best moves list
    function makeSelectedMove(moveNumber) {
        const moveValue = $(`#bestMove${moveNumber}`).val();
        if (!moveValue) {
            console.error('No move available for move number:', moveNumber);
            return;
        }
        
        try {
            // Extract the raw move (remove piece notation)
            let rawMove = moveValue;
            if (rawMove.length > 4 && /^[a-zA-Z]/.test(rawMove)) {
                rawMove = rawMove.slice(1); // Remove piece letter
            }
            
            console.log('Making selected move:', moveValue, '->', rawMove);
            
            // Make the move using the existing game logic
            const moveObj = game.move(rawMove, { sloppy: true });
            if (moveObj) {
                // Update the board position
                board.set({ fen: game.fen() });
                updateValidMoves();
                
                // Update game state and FEN
                updateGameState();
                updateFenDisplay();
                
                // Add to history and save state
                addToHistory();
                saveGameState();
                
                // Clear results since position has changed
                clearResults();
                
                // Remove highlights
                removeHighlights();
                
                console.log('Move made successfully:', moveObj);
            } else {
                console.error('Failed to make move:', rawMove);
                alert('Invalid move: ' + rawMove);
            }
        } catch (error) {
            console.error('Error making selected move:', error);
            alert('Error making move: ' + error.message);
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
            position: game.fen(),
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
        // Load into chess.js first to sync state
        game.load(state.position);
        // Then update board display
        board.set({ fen: state.position });
        
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
        updateValidMoves();
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
        // Reset to starting position using Chessground API
        board.set({
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        });
        game.reset();
        $('#whiteToMove').prop('checked', true);
        $('#whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').prop('checked', true);
        updateFenDisplay();
        updateValidMoves(); // Ensure pieces can be moved after reset
        clearResults();
        setAnalysisProgress(50);
        clearHistory();
        addToHistory(); // Add starting position to history
    });
    
    $('#clearBtn').click(function() {
        // Clear board using Chessground API
        board.set({
            fen: '8/8/8/8/8/8/8/8'
        });
        game.clear();
        $('#whiteKingSide, #whiteQueenSide, #blackKingSide, #blackQueenSide').prop('checked', false);
        updateFenDisplay();
        clearResults();
        setAnalysisProgress(50);
        clearHistory();
        addToHistory(); // Add empty position to history
    });
    
    $('#flipBtn').click(function() {
        // Flip board using Chessground API
        board.toggleOrientation();
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
        console.log('🎯 SET FEN BUTTON CLICKED - Input FEN:', fen);
        
        if (fen) {
            try {
                const fenParts = fen.split(' ');
                console.log('🎯 FEN Parts:', fenParts);
                
                // First, validate the FEN format
                if (fenParts.length < 4) {
                    throw new Error('FEN must have at least 4 parts (position, turn, castling, en passant)');
                }
                
                // Check if castling rights are in the expected format
                const castlingPart = fenParts[2];
                console.log('🎯 Original castling rights:', castlingPart);
                
                // Convert non-standard castling formats (like 'Fb') to standard format
                let standardCastling = castlingPart;
                if (castlingPart === 'Fb') {
                    // 'Fb' might mean some specific castling rights - let's try to interpret it
                    console.log('⚠️ Non-standard castling format detected:', castlingPart);
                    standardCastling = '-'; // No castling for now, we'll set it manually
                } else if (castlingPart !== '-' && !/^[KQkq]*$/.test(castlingPart)) {
                    console.log('⚠️ Unknown castling format, using no castling');
                    standardCastling = '-';
                }
                
                // Rebuild FEN with standard castling format
                const standardFen = `${fenParts[0]} ${fenParts[1]} ${standardCastling} ${fenParts[3]} ${fenParts[4] || '0'} ${fenParts[5] || '1'}`;
                console.log('🎯 Standardized FEN:', standardFen);
                
                // Load the standardized FEN into chess.js
                const loadResult = game.load(standardFen);
                console.log('🎯 Chess.js load result:', loadResult);
                console.log('🎯 Chess.js game FEN after load:', game.fen());
                
                if (!loadResult) {
                    throw new Error('Chess.js rejected the FEN - invalid position');
                }
                
                // Then update the board display
                board.set({ fen: standardFen });
                console.log('🎯 Board position updated');
                
                // Update turn radio buttons
                if (fenParts.length > 1) {
                    const turn = fenParts[1];
                    if (turn === 'w') {
                        $('#whiteToMove').prop('checked', true);
                    } else {
                        $('#blackToMove').prop('checked', true);
                    }
                    console.log('🎯 Turn set to:', turn);
                }
                
                // Update castling rights based on original or interpreted values
                if (fenParts.length > 2) {
                    let castling = fenParts[2];
                    
                    // Handle special castling formats
                    if (castling === 'Fb') {
                        // Interpret 'Fb' - this might be Fischer Random or some other notation
                        // For now, let's assume it means some specific castling rights
                        $('#whiteKingSide').prop('checked', false);
                        $('#whiteQueenSide').prop('checked', false);
                        $('#blackKingSide').prop('checked', true);  // Assuming 'b' means black kingside
                        $('#blackQueenSide').prop('checked', false);
                        console.log('🎯 Interpreted Fb castling as black kingside only');
                    } else {
                        $('#whiteKingSide').prop('checked', castling.includes('K'));
                        $('#whiteQueenSide').prop('checked', castling.includes('Q'));
                        $('#blackKingSide').prop('checked', castling.includes('k'));
                        $('#blackQueenSide').prop('checked', castling.includes('q'));
                        console.log('🎯 Standard castling rights applied:', castling);
                    }
                }
                
                // Update the FEN input to show the standardized version
                $('#fenInput').val(game.fen());
                
                // Just update the display and buttons to reflect the loaded position
                updateTurnButtons();
                updateCastlingButtons();
                updateValidMoves();
                clearResults();
                addToHistory(); // Add the new position to history
                saveGameState(); // Save the new state
                
                console.log('✅ FEN loaded successfully. Final game FEN:', game.fen());
                
            } catch (error) {
                console.error('❌ FEN loading error:', error);
                alert('Invalid FEN string: ' + error.message);
            }
        }
    });
    
    
    $('#calculateBtn').click(function() {
        if (engineThinking || !stockfish) {
            return;
        }
        
        const fen = buildFenString();
        console.log('🚀 CALCULATE BUTTON CLICKED - FEN being sent to Stockfish:', fen);
        console.log('🚀 Current chess.js game FEN:', game.fen());
        console.log('🚀 FEN input field value:', $('#fenInput').val());
        
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
        console.log('🚀 Sending to Stockfish: position fen ' + fen);
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
    
    // Turn button handlers
    $('.turn-btn').click(function() {
        const clickedTurn = $(this).data('turn');
        
        // Update button states
        $('.turn-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update hidden radio buttons for compatibility
        if (clickedTurn === 'w') {
            $('#whiteToMove').prop('checked', true);
            $('#blackToMove').prop('checked', false);
        } else {
            $('#blackToMove').prop('checked', true);
            $('#whiteToMove').prop('checked', false);
        }
        
        // Update FEN and game state
        updateFenDisplay();
        updateGameState();
        saveGameState();
    });
    
    // Castling button handlers
    $('.castling-btn').click(function() {
        const castlingType = $(this).data('castling');
        const isActive = $(this).hasClass('active');
        
        // Toggle button state
        if (isActive) {
            $(this).removeClass('active');
        } else {
            $(this).addClass('active');
        }
        
        // Update hidden checkbox for compatibility
        $('#' + castlingType).prop('checked', !isActive);
        
        // Update FEN and game state
        updateFenDisplay();
        updateGameState();
        saveGameState();
    });
    
    // Mode button handlers
    $('.mode-btn').click(function() {
        const clickedMode = $(this).data('mode');
        
        // Update button states
        $('.mode-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update hidden radio buttons for compatibility
        if (clickedMode === 'show') {
            $('#showMove').prop('checked', true);
            $('#makeMove').prop('checked', false);
        } else {
            $('#makeMove').prop('checked', true);
            $('#showMove').prop('checked', false);
        }
        
        // Save state
        saveGameState();
    });
    
    // Save current state to sessionStorage (per-tab)
    function saveGameState() {
        const currentState = {
            position: game.fen(),
            turn: $('input[name="turn"]:checked').val(),
            castling: {
                whiteKingSide: $('#whiteKingSide').is(':checked'),
                whiteQueenSide: $('#whiteQueenSide').is(':checked'),
                blackKingSide: $('#blackKingSide').is(':checked'),
                blackQueenSide: $('#blackQueenSide').is(':checked')
            },
            orientation: board.state.orientation,
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
            
            console.log('📁 Loading saved state:', state);
            
            // Only restore non-starting positions to avoid overriding the default setup
            const isStartingPosition = state.position === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            
            if (state.position && !isStartingPosition) {
                console.log('🔄 Restoring saved position:', state.position);
                // Load into chess.js first
                game.load(state.position);
                // Then update board display - but ensure pieces stay visible
                setTimeout(() => {
                    board.set({ fen: state.position });
                    // Double-check pieces are still there
                    setTimeout(() => {
                        let pieceCount = 0;
                        if (board.state.pieces) {
                            if (board.state.pieces instanceof Map) {
                                pieceCount = board.state.pieces.size;
                            } else {
                                pieceCount = Object.keys(board.state.pieces).length;
                            }
                        }
                        if (pieceCount === 0) {
                            console.log('⚠️ Pieces vanished during state restore! Restoring...');
                            board.set({ fen: state.position });
                        }
                    }, 50);
                }, 50);
            } else {
                console.log('📋 Keeping starting position, only restoring settings');
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
            if (state.orientation && state.orientation !== board.state.orientation) {
                board.toggleOrientation();
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
            
            // Update game state and FEN display - but delay to avoid conflicts
            setTimeout(() => {
                if (!isStartingPosition) {
                    updateGameState();
                }
                updateFenDisplay();
                updateValidMoves();
                
                // Ensure visual button states are synchronized
                updateTurnButtons();
                updateCastlingButtons();
            }, 100);
            
            console.log('✅ Game state restored from sessionStorage for this tab');
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
    
    
    // PGN handling functionality
    let pgnGame = null;
    let pgnMoves = [];
    let currentPgnMoveIndex = -1;
    
    function initPgnHandlers() {
        // Main Load PGN button - opens modal
        $('#loadPgnBtn').click(function() {
            $('#pgnModal').show();
        });
        
        // Modal Load PGN button
        $('#loadPgnModalBtn').click(function() {
            const pgnText = $('#pgnInput').val().trim();
            if (!pgnText) {
                alert('Please enter a PGN game first.');
                return;
            }
            
            try {
                loadPgnGame(pgnText);
                // Close modal after successful load
                $('#pgnModal').hide();
            } catch (error) {
                alert('Error loading PGN: ' + error.message);
                console.error('PGN load error:', error);
            }
        });
        
        // Close modal button
        $('#closePgnModal').click(function() {
            $('#pgnModal').hide();
        });
        
        // Close modal when clicking outside
        $('#pgnModal').click(function(e) {
            if (e.target === this) {
                $('#pgnModal').hide();
            }
        });
        
        // Close modal with Escape key
        $(document).keydown(function(e) {
            if (e.key === 'Escape' && $('#pgnModal').is(':visible')) {
                $('#pgnModal').hide();
            }
        });
        
        // Clear PGN button
        $('#clearPgnBtn').click(function() {
            clearPgnGame();
        });
        
        // Load sample PGN button
        $('#samplePgnBtn').click(function() {
            const samplePgn = `[Event "Immortal Game"]
[Site "London"]
[Date "1851.06.21"]
[Round "?"]
[White "Adolf Anderssen"]
[Black "Lionel Kieseritzky"]
[Result "1-0"]

1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g3 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`;
            
            $('#pgnInput').val(samplePgn);
        });
        
        // PGN navigation buttons
        $('#startPosBtn').click(function() {
            if (pgnGame) {
                goToMove(-1);
            }
        });
        
        $('#prevMoveBtn').click(function() {
            if (pgnGame && currentPgnMoveIndex > 0) {
                goToMove(currentPgnMoveIndex - 1);
            }
        });
        
        $('#nextMoveBtn').click(function() {
            if (pgnGame && currentPgnMoveIndex < pgnMoves.length - 1) {
                goToMove(currentPgnMoveIndex + 1);
            }
        });
        
        $('#endPosBtn').click(function() {
            if (pgnGame) {
                goToMove(pgnMoves.length - 1);
            }
        });
    }
    
    function loadPgnGame(pgnText) {
        // Create a new chess instance for PGN parsing
        const tempGame = new Chess();
        
        // Clean and prepare PGN text
        let cleanedPgn = pgnText.trim();
        
        // Fix common PGN formatting issues
        // 1. Handle escaped quotes in header values
        cleanedPgn = cleanedPgn.replace(/\\\\/g, '');
        
        // 2. Ensure proper spacing after move numbers
        cleanedPgn = cleanedPgn.replace(/(\d+)\./g, '$1. ');
        
        // 3. Clean up extra whitespace
        cleanedPgn = cleanedPgn.replace(/\s+/g, ' ');
        
        console.log('Original PGN:', JSON.stringify(pgnText).substring(0, 200) + '...'); // Log to debug formatting issues
        console.log('Cleaned PGN:', cleanedPgn.substring(0, 200) + '...');
        
        console.log('Attempting to load PGN...', JSON.stringify(cleanedPgn).substring(0, 200)); // Debug cleaned PGN format
        try {
            const loadResult = tempGame.load_pgn(cleanedPgn);
            if (!loadResult) {
                // If standard loading fails, try with more aggressive cleaning
                console.warn('Standard PGN loading failed, trying with aggressive cleaning...');
                
                // More aggressive cleaning - extract just the moves
                // First try to extract complete moves with both white and black moves
                let extractedMoves = [];
                
                // Pattern to match complete move pairs: "1. e4 e5" or individual moves "1. e4" "1... e5"
                const moveLinePattern = /\d+\.\s*([NBRQK]?[a-h]?[1-8]?[x]?[a-h][1-8](?:=[QRNB])?[+#]?|O-O-O|O-O)(?:\s+([NBRQK]?[a-h]?[1-8]?[x]?[a-h][1-8](?:=[QRNB])?[+#]?|O-O-O|O-O))?/g;
                
                let match;
                while ((match = moveLinePattern.exec(cleanedPgn)) !== null) {
                    // Add white move
                    if (match[1]) {
                        extractedMoves.push(match[1].trim());
                    }
                    // Add black move if present
                    if (match[2]) {
                        extractedMoves.push(match[2].trim());
                    }
                }
                
                console.log('Extracted moves using regex:', extractedMoves.slice(0, 20)); // Show first 20 moves
                
                // If the move pattern doesn't work, try an even simpler approach
                if (!extractedMoves || extractedMoves.length === 0) {
                    console.log('Move pattern failed, trying line-by-line extraction...');
                    
                    // Split by lines and extract just the move portion
                    const lines = cleanedPgn.split('\n');
                    const moveLines = lines.filter(line => /\d+\./.test(line) && !line.startsWith('['));
                    
                    if (moveLines.length > 0) {
                        // Extract moves from each line manually
                        for (const line of moveLines) {
                            // Remove move numbers and extract just the moves
                            const cleanLine = line.replace(/\d+\./g, '').replace(/\*/g, '').trim();
                            const movesInLine = cleanLine.split(/\s+/).filter(move => 
                                move && /^([NBRQK]?[a-h]?[1-8]?[x]?[a-h][1-8](?:=[QRNB])?[+#]?|O-O-O|O-O)$/.test(move)
                            );
                            extractedMoves.push(...movesInLine);
                        }
                        
                        console.log('Extracted moves from lines:', extractedMoves.slice(0, 20));
                    }
                    
                    if (extractedMoves.length === 0) {
                        throw new Error('No move lines found in PGN.');
                    }
                }
                
                if (extractedMoves && extractedMoves.length > 0) {
                    // Create a minimal PGN with just the moves
                    const minimalPgn = extractedMoves.join(' ');
                    console.log('Trying minimal PGN:', minimalPgn);
                    
                    // Reset and try again
                    const retryGame = new Chess();
                    if (!retryGame.load_pgn(minimalPgn)) {
                        throw new Error('Could not parse PGN moves. Please check the game format.');
                    }
                    tempGame.load_pgn(minimalPgn);
                } else {
                    throw new Error('No valid chess moves found in PGN.');
                }
            }
        } catch (error) {
            console.error('PGN loading error:', error);
            throw new Error('Invalid PGN format: ' + error.message);
        }
        
        // Store the game and moves
        pgnGame = tempGame;
        pgnMoves = pgnGame.history({ verbose: true });
        currentPgnMoveIndex = -1;
        
        // Extract game information from headers
        const headers = pgnGame.header();
        displayGameInfo(headers);
        
        // Show PGN sections
        $('#pgn-info-section').show();
        $('#pgn-navigation-section').show();
        
        // Reset to starting position
        game.reset();
        board.set({ fen: game.fen() });
        
        // Update display
        updateFenDisplay();
        updateValidMoves();
        updatePgnNavigation();
        
        console.log('PGN loaded successfully:', pgnMoves.length, 'moves');
    }
    
    function displayGameInfo(headers) {
        $('#gameWhite').text(headers.White || 'Unknown');
        $('#gameBlack').text(headers.Black || 'Unknown');
        $('#gameEvent').text(headers.Event || '');
        $('#gameDate').text(headers.Date || '');
        $('#gameResult').text(headers.Result || '');
    }
    
    function goToMove(moveIndex) {
        if (!pgnGame || moveIndex < -1 || moveIndex >= pgnMoves.length) {
            return;
        }
        
        // Reset game to starting position
        game.reset();
        
        // Play moves up to the specified index (skip if starting position)
        if (moveIndex >= 0) {
            for (let i = 0; i <= moveIndex; i++) {
                const move = pgnMoves[i];
                game.move(move);
            }
        }
        
        // Update the board
        board.set({ fen: game.fen() });
        
        // Update game state
        updateGameState();
        updateFenDisplay();
        updateValidMoves();
        
        // Update current move index
        currentPgnMoveIndex = moveIndex;
        
        // Update navigation display
        updatePgnNavigation();
        
        // Clear analysis results since we're in a different position
        clearResults();
    }
    
    function updatePgnNavigation() {
        if (!pgnGame) {
            return;
        }
        
        const totalMoves = pgnMoves.length;
        const currentMove = currentPgnMoveIndex + 1;
        
        // Update move counter
        if (currentPgnMoveIndex === -1) {
            $('#moveCounter').text('Start');
            $('#currentMoveDisplay').text('');
        } else {
            $('#moveCounter').text(`${currentMove}/${totalMoves}`);
            
            // Show current move
            const move = pgnMoves[currentPgnMoveIndex];
            const moveNumber = Math.ceil((currentPgnMoveIndex + 1) / 2);
            const isWhite = (currentPgnMoveIndex % 2) === 0;
            const moveDisplay = isWhite ? `${moveNumber}. ${move.san}` : `${moveNumber}...${move.san}`;
            $('#currentMoveDisplay').text(moveDisplay);
        }
        
        // Update navigation button states
        $('#startPosBtn').prop('disabled', currentPgnMoveIndex === -1);
        $('#prevMoveBtn').prop('disabled', currentPgnMoveIndex <= -1);
        $('#nextMoveBtn').prop('disabled', currentPgnMoveIndex >= totalMoves - 1);
        $('#endPosBtn').prop('disabled', currentPgnMoveIndex >= totalMoves - 1);
    }
    
    function clearPgnGame() {
        pgnGame = null;
        pgnMoves = [];
        currentPgnMoveIndex = -1;
        
        // Clear input
        $('#pgnInput').val('');
        
        // Hide PGN sections
        $('#pgn-info-section').hide();
        $('#pgn-navigation-section').hide();
        
        // Reset to starting position
        game.reset();
        board.set({ fen: game.fen() });
        
        // Update display
        updateFenDisplay();
        updateValidMoves();
        clearResults();
        
        console.log('PGN game cleared');
    }
    
    // Theme switching functionality
    function applyTheme(boardTheme, pieceSet) {
        const boardElement = document.getElementById('myBoard');
        if (boardElement) {
            // Update the CSS classes on the board element
            boardElement.className = `${boardTheme} ${pieceSet}`;
            console.log('🎨 Applied theme:', boardElement.className);
            
            // Save theme preference
            try {
                localStorage.setItem('chessAnalyzerTheme', JSON.stringify({
                    boardTheme: boardTheme,
                    pieceSet: pieceSet
                }));
            } catch (error) {
                console.warn('Could not save theme preference:', error);
            }
        }
    }
    
    // Load saved theme preference
    function loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem('chessAnalyzerTheme');
            if (savedTheme) {
                const theme = JSON.parse(savedTheme);
                $('#boardThemeSelect').val(theme.boardTheme);
                $('#pieceSetSelect').val(theme.pieceSet);
                applyTheme(theme.boardTheme, theme.pieceSet);
                console.log('🎨 Loaded saved theme:', theme);
            }
        } catch (error) {
            console.warn('Could not load saved theme:', error);
        }
    }
    
    // Theme selector event handlers
    $('#boardThemeSelect').on('change', function() {
        const boardTheme = $(this).val();
        const pieceSet = $('#pieceSetSelect').val();
        applyTheme(boardTheme, pieceSet);
    });
    
    $('#pieceSetSelect').on('change', function() {
        const boardTheme = $('#boardThemeSelect').val();
        const pieceSet = $(this).val();
        applyTheme(boardTheme, pieceSet);
    });
    
    // AI Explanation Feature
    // Toggle AI explanations visibility
    $('#aiExplanationsToggle').on('change', function() {
        const isEnabled = $(this).is(':checked');
        console.log('AI explanations toggled:', isEnabled);
        
        // Show/hide all AI explanation containers
        if (isEnabled) {
            $('.ai-explanation').show();
        } else {
            $('.ai-explanation').hide();
        }
        
        // Save preference to localStorage
        localStorage.setItem('aiExplanationsEnabled', isEnabled);
    });
    
    // Load saved AI explanations preference
    const savedAIPreference = localStorage.getItem('aiExplanationsEnabled');
    if (savedAIPreference === 'true') {
        $('#aiExplanationsToggle').prop('checked', true);
        $('.ai-explanation').show();
    }
    
    // Initialize tooltip functionality for AI explanations
    initAITooltips();
    
    // Function to initialize AI tooltips
    function initAITooltips() {
        // Cache for explanations to avoid repeated API calls
        const explanationCache = new Map();
        
        // Store cache globally so it can be cleared when moves are recalculated
        window.chessAnalyzer.explanationCache = explanationCache;
        
        // Tooltip hover handlers for each move
        for (let i = 1; i <= 3; i++) {
            const $icon = $(`#infoIcon${i}`);
            const $tooltip = $(`#aiTooltip${i}`);
            const $aiText = $(`#aiText${i}`);
            const $aiLoading = $(`#aiLoading${i}`);
            const $aiContent = $(`#aiContent${i}`);
            
            let hoverTimeout;
            let isLoading = false;
            
            $icon.on('mouseenter', function() {
                // Clear any existing timeout
                clearTimeout(hoverTimeout);
                
                // Show tooltip immediately
                $tooltip.addClass('visible');
                
                // Check if we already have an explanation cached
                const move = $(`#bestMove${i}`).val();
                const cacheKey = `${move}_${$(`#evaluation${i}`).val()}`;
                
                if (explanationCache.has(cacheKey)) {
                    // Use cached explanation
                    $aiText.text(explanationCache.get(cacheKey));
                    $aiContent.show();
                    $aiLoading.hide();
                    return;
                }
                
                // Only fetch explanation if we don't have it and AI explanations are enabled
                if (!$('#aiExplanationsToggle').is(':checked')) {
                    $aiText.text('Enable AI explanations to get move analysis');
                    $aiContent.show();
                    $aiLoading.hide();
                    return;
                }
                
                if (!move) {
                    $aiText.text('No move available to explain');
                    $aiContent.show();
                    $aiLoading.hide();
                    return;
                }
                
                if (isLoading) {
                    return; // Already loading
                }
                
                // Start loading explanation immediately (no delay)
                isLoading = true;
                $aiLoading.show();
                $aiContent.hide();
                
                // Get current position FEN
                const currentFen = window.chessAnalyzer.game ? window.chessAnalyzer.game.fen() : $('#fenInput').val();
                const evaluation = $(`#evaluation${i}`).val();
                const principalVariation = $(`#principalVariation${i}`).val();
                
                // Prepare the prompt for AI explanation
                const prompt = generateExplanationPrompt(move, evaluation, principalVariation, currentFen, i);
                
                // Call AI service
                getAIExplanationFromService(prompt, i)
                    .then(explanation => {
                        if ($tooltip.hasClass('visible')) { // Only show if tooltip is still visible
                            // Cache the explanation
                            explanationCache.set(cacheKey, explanation);
                            $aiText.text(explanation);
                            $aiContent.show();
                        }
                    })
                    .catch(error => {
                        if ($tooltip.hasClass('visible')) {
                            console.error('AI explanation error:', error);
                            $aiText.text('Unable to generate explanation at this time');
                            $aiContent.show();
                        }
                    })
                    .finally(() => {
                        isLoading = false;
                        $aiLoading.hide();
                    });
            });
            
            $icon.on('mouseleave', function() {
                // Clear timeout to prevent loading if user moves away quickly
                clearTimeout(hoverTimeout);
                
                // Hide tooltip after a short delay
                setTimeout(() => {
                    if (!$tooltip.is(':hover')) {
                        $tooltip.removeClass('visible');
                    }
                }, 100);
            });
            
            // Keep tooltip visible when hovering over it
            $tooltip.on('mouseenter', function() {
                clearTimeout(hoverTimeout);
                $tooltip.addClass('visible');
            });
            
            $tooltip.on('mouseleave', function() {
                $tooltip.removeClass('visible');
            });
        }
    }
    
    // Initialize everything
    initStockfish();
    initPgnHandlers();
    
    // Initialize board after checking for saved state to prevent flickering
    setTimeout(() => {
        console.log('🔧 Checking for saved game state before board initialization...');
        const savedState = sessionStorage.getItem('chessAnalyzerState');
        let initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                if (state.position && Date.now() - state.timestamp <= maxAge) {
                    const isStartingPosition = state.position === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                    if (!isStartingPosition) {
                        initialFen = state.position;
                        console.log('🔄 Will initialize board with saved position:', initialFen);
                    }
                }
            } catch (error) {
                console.warn('Error parsing saved state:', error);
            }
        }
        
        // Initialize board with the correct starting position
        initBoard(initialFen);
        
        // Load saved theme after board is initialized
        setTimeout(() => {
            loadSavedTheme();
        }, 100);
        
        // Load full saved state after board is ready
        setTimeout(() => {
            console.log('🔧 Loading complete saved game state...');
            const stateLoaded = loadGameState();
            if (stateLoaded) {
                console.log('✅ Saved game state loaded successfully');
            } else {
                console.log('📋 No saved state found, using default chess position');
            }
        }, 200);
    }, 50);
});

// Store board and game instances globally so they can be accessed from button clicks
window.chessAnalyzer = {
    board: null,
    game: null
};

// Make this function global so it can be called from HTML onclick
window.makeSelectedMove = function(moveNumber) {
    const moveValue = $(`#bestMove${moveNumber}`).val();
    if (!moveValue) {
        console.error('No move available for move number:', moveNumber);
        return;
    }
    
    try {
        // Extract the raw move (remove piece notation)
        let rawMove = moveValue;
        if (rawMove.length > 4 && /^[a-zA-Z]/.test(rawMove)) {
            rawMove = rawMove.slice(1); // Remove piece letter
        }
        
        console.log('Making selected move:', moveValue, '->', rawMove);
        
        // Use the global instances and functions
        const board = window.chessAnalyzer.board;
        const game = window.chessAnalyzer.game;
        const addToHistory = window.chessAnalyzer.addToHistory;
        const saveGameState = window.chessAnalyzer.saveGameState;
        const updateGameState = window.chessAnalyzer.updateGameState;
        const updateFenDisplay = window.chessAnalyzer.updateFenDisplay;
        const updateValidMoves = window.chessAnalyzer.updateValidMoves;
        const removeHighlights = window.chessAnalyzer.removeHighlights;
        const clearResults = window.chessAnalyzer.clearResults;
        
        if (!board || !game || !addToHistory || !saveGameState || !updateValidMoves || !clearResults) {
            console.error('Board, game, or required functions not available');
            return;
        }
        
        // Make the move using the existing game instance
        const moveObj = game.move(rawMove, { sloppy: true });
        if (moveObj) {
            // Update the board position
            board.set({ fen: game.fen() });
            
            // Update turn radio buttons based on the current turn AFTER the move
            // game.turn() returns whose turn it is NOW (after the move was made)
            if (game.turn() === 'w') {
                $('#whiteToMove').prop('checked', true);
                $('#blackToMove').prop('checked', false);
            } else {
                $('#blackToMove').prop('checked', true);
                $('#whiteToMove').prop('checked', false);
            }
            
            updateValidMoves();
            
            // Update game state and FEN display using the stored functions
            updateGameState();
            updateFenDisplay();
            
            // Sync visual turn buttons to match the radio buttons
            const updateTurnButtons = window.chessAnalyzer.updateTurnButtons;
            if (updateTurnButtons) {
                updateTurnButtons();
            }
            
            console.log('Turn after move:', game.turn() === 'w' ? 'White' : 'Black');
            
            // Add the new position to history - this will enable Previous/Next buttons
            addToHistory();
            saveGameState();
            
            // Clear results since position has changed after making a move
            clearResults();
            
            // Remove highlights since the position has changed
            if (removeHighlights) {
                removeHighlights();
            }
            
            console.log('Move made successfully:', moveObj);
            console.log('New FEN:', game.fen());
        } else {
            console.error('Failed to make move:', rawMove);
            alert('Invalid move: ' + rawMove);
        }
    } catch (error) {
        console.error('Error making selected move:', error);
        alert('Error making move: ' + error.message);
    }
};

// Add CSS for move highlighting
const style = document.createElement('style');
style.textContent = `
    .highlight-from {
        box-shadow: inset 0 0 3px 3px yellow !important;
    }
    .highlight-to {
        box-shadow: inset 0 0 3px 3px red !important;
    }
    
    /* Chessground custom highlighting for move analysis */
    cg-board square.move1-from {
        background-color: rgba(144, 238, 144, 0.7) !important;
        box-shadow: inset 0 0 0 3px #7CB342 !important;
    }
    cg-board square.move1-to {
        background-color: rgba(200, 230, 201, 0.7) !important;
        box-shadow: inset 0 0 0 3px #90EE90 !important;
    }
    
    cg-board square.move2-from {
        background-color: rgba(248, 187, 217, 0.7) !important;
        box-shadow: inset 0 0 0 3px #E1A0C4 !important;
    }
    cg-board square.move2-to {
        background-color: rgba(252, 228, 236, 0.7) !important;
        box-shadow: inset 0 0 0 3px #F8BBD9 !important;
    }
    
    cg-board square.move3-from {
        background-color: rgba(255, 204, 128, 0.7) !important;
        box-shadow: inset 0 0 0 3px #FF9800 !important;
    }
    cg-board square.move3-to {
        background-color: rgba(255, 243, 224, 0.7) !important;
        box-shadow: inset 0 0 0 3px #FFCC80 !important;
    }
    
    /* Legacy highlighting classes - kept for compatibility */
    .highlight-move1-from {
        box-shadow: inset 0 0 4px 4px #90EE90 !important;
        border: 2px solid #7CB342 !important;
    }
    .highlight-move1-to {
        box-shadow: inset 0 0 4px 4px #C8E6C9 !important;
        border: 2px solid #90EE90 !important;
    }
    
    .highlight-move2-from {
        box-shadow: inset 0 0 4px 4px #F8BBD9 !important;
        border: 2px solid #E1A0C4 !important;
    }
    .highlight-move2-to {
        box-shadow: inset 0 0 4px 4px #FCE4EC !important;
        border: 2px solid #F8BBD9 !important;
    }
    
    .highlight-move3-from {
        box-shadow: inset 0 0 4px 4px #FFCC80 !important;
        border: 2px solid #FF9800 !important;
    }
    .highlight-move3-to {
        box-shadow: inset 0 0 4px 4px #FFF3E0 !important;
        border: 2px solid #FFCC80 !important;
    }
    
    /* AI Info Icon and Tooltip Styling */
    .ai-info-icon {
        color: #4a90e2;
        font-size: 16px;
        cursor: pointer;
        margin-left: 8px;
        transition: color 0.3s ease;
        position: relative;
    }
    
    .ai-info-icon:hover {
        color: #2171b5;
    }
    
    .ai-explanation {
        position: relative;
        display: inline-block;
    }
    
    .ai-tooltip {
        position: absolute;
        top: -10px;
        left: 25px;
        background: #2c3e50 !important;
        color: white !important;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 250px;
        max-width: 400px;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-5px);
        transition: all 0.3s ease;
        font-size: 14px;
        line-height: 1.4;
        pointer-events: none;
    }
    
    .ai-tooltip.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        pointer-events: auto;
    }
    
    .ai-tooltip::before {
        content: '';
        position: absolute;
        top: 15px;
        left: -8px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-right: 8px solid #2c3e50;
    }
    
    .ai-tooltip .ai-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        font-style: italic;
        color: #bdc3c7;
    }
    
    .ai-tooltip .ai-loading i {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .ai-tooltip .ai-text {
        color: white !important;
        font-weight: normal;
        background: transparent !important;
    }
    
    .ai-tooltip .ai-content {
        color: white !important;
        background: transparent !important;
    }
    
    /* Make Move button styling */
    .make-move-btn {
        background: linear-gradient(135deg, #8fbddf 0%, #7bc4c4 100%);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: all 0.3s ease;
        display: none; /* Hidden by default until moves are available */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
    }
    
    .make-move-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
    }
    
    .make-move-btn:hover::before {
        left: 100%;
    }
    
    .make-move-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(143, 189, 223, 0.3);
    }
    
    .make-move-btn:active {
        transform: translateY(0px);
        box-shadow: 0 2px 6px rgba(143, 189, 223, 0.2);
    }
`;
document.head.appendChild(style);

// Global function for AI explanations - triggered by tooltip hover
window.getAIExplanation = function(moveNumber) {
    console.log('AI explanation requested for move', moveNumber);
    
    // Check if AI explanations are enabled
    if (!$('#aiExplanationsToggle').is(':checked')) {
        return 'Please enable AI explanations first using the toggle switch.';
    }
    
    // Get the move and evaluation
    const move = $(`#bestMove${moveNumber}`).val();
    const evaluation = $(`#evaluation${moveNumber}`).val();
    const principalVariation = $(`#principalVariation${moveNumber}`).val();
    
    if (!move) {
        return 'No move available to explain.';
    }
    
    // Get current position FEN
    const currentFen = window.chessAnalyzer.game ? window.chessAnalyzer.game.fen() : $('#fenInput').val();
    
    // Show loading state
    $(`#aiLoading${moveNumber}`).show();
    $(`#aiContent${moveNumber}`).hide();
    
    // Prepare the prompt for AI explanation
    const prompt = generateExplanationPrompt(move, evaluation, principalVariation, currentFen, moveNumber);
    
    // Call AI service (using a free AI API)
    getAIExplanationFromService(prompt, moveNumber)
        .then(explanation => {
            // Show the explanation
            displayAIExplanation(explanation, moveNumber);
        })
        .catch(error => {
            console.error('AI explanation error:', error);
            displayAIError(error.message, moveNumber);
        })
        .finally(() => {
            // Reset loading state
            $(`#aiLoading${moveNumber}`).hide();
        });
};

// Generate a detailed prompt for the AI explanation
function generateExplanationPrompt(move, evaluation, principalVariation, currentFen, moveNumber) {
    const moveRank = moveNumber === 1 ? 'best' : moveNumber === 2 ? 'second-best' : 'third-best';
    
    return `You are a chess expert providing comprehensive move explanations. Please analyze this chess move in detail.I am learning chess.

Current Position (FEN): ${currentFen}
Move: ${move}
Evaluation: ${evaluation}
Rank: ${moveRank} move
Principal Variation: ${principalVariation}

Please provide a detailed explanation covering:
1. What this move accomplishes tactically or strategically
2. Why it's strong in this position
3. What happens if we DON'T make this move - what are the consequences?
4. What can happen in the next 3-4 moves if we DO make this move?
5. Any key threats, plans, or patterns this move creates or prevents
6. Do mention what piece are you talking about , example when you say Ra8a7, also specify Rook in bracket like Ra8a7(Rook).

Structure your response in 3-4 sentences that are educational and accessible for intermediate players. Focus on concrete consequences and future possibilities rather than just general principles.`;
}

// Call AI service for explanation
async function getAIExplanationFromService(prompt, moveNumber) {
    // Try multiple AI services in order of preference
    const aiServices = [
        {
            name: 'Google Gemini',
            call: () => callGeminiAPI(prompt)
        },
        {
            name: 'OpenAI GPT',
            call: () => callOpenAIAPI(prompt)
        },
        {
            name: 'Anthropic Claude',
            call: () => callClaudeAPI(prompt)
        },
        {
            name: 'Groq (Free)',
            call: () => callGroqAPI(prompt)
        },
        {
            name: 'Hugging Face',
            call: () => callHuggingFaceAPI(prompt)
        }
    ];
    
    // Try each service in order
    for (const service of aiServices) {
        try {
            console.log(`Trying ${service.name} for AI explanation...`);
            const result = await service.call();
            if (result && result.trim()) {
                console.log(`✅ ${service.name} provided explanation`);
                return result.trim();
            }
        } catch (error) {
            console.log(`❌ ${service.name} failed:`, error.message);
            continue;
        }
    }
    
    // If all services fail, use fallback
    console.log('All AI services failed, using enhanced fallback');
    return generateFallbackExplanation(prompt, moveNumber);
}

// Google Gemini API call
async function callGeminiAPI(prompt) {
    const GEMINI_API_KEY = localStorage.getItem('geminiApiKey');
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not found. Please add it in settings.');
    }
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt + "\n\nPlease provide a conversational, friendly explanation as if you're a chess coach talking to a student. Keep it engaging and easy to understand."
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 300
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        console.error('Gemini API error response:', errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }
    
    const data = await response.json();
    console.log('Gemini API response:', data);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// OpenAI GPT API call
async function callOpenAIAPI(prompt) {
    const OPENAI_API_KEY = localStorage.getItem('openaiApiKey');
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found. Please add it in settings.');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a friendly chess coach explaining moves in a conversational, encouraging way. Avoid technical jargon and make it engaging.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// Anthropic Claude API call
async function callClaudeAPI(prompt) {
    const CLAUDE_API_KEY = localStorage.getItem('claudeApiKey');
    if (!CLAUDE_API_KEY) {
        throw new Error('Claude API key not found. Please add it in settings.');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 300,
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: prompt + "\n\nPlease explain this like a friendly chess coach would - conversational, encouraging, and easy to understand."
                }
            ]
        })
    });
    
    if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content?.[0]?.text || '';
}

// Groq API call (free tier available)
async function callGroqAPI(prompt) {
    const GROQ_API_KEY = localStorage.getItem('groqApiKey');
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key not found. Please add it in settings.');
    }
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [
                {
                    role: 'system',
                    content: 'You are a friendly chess coach. Explain moves conversationally, like talking to a friend. Be encouraging and avoid technical jargon.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.7
        })
    });
    
    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// Hugging Face API call (backup)
async function callHuggingFaceAPI(prompt) {
    const HF_API_KEY = localStorage.getItem('huggingfaceApiKey');
    
    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(HF_API_KEY && { 'Authorization': `Bearer ${HF_API_KEY}` })
        },
        body: JSON.stringify({
            inputs: prompt + "\n\nExplain this chess move in a friendly, conversational way:",
            parameters: {
                max_length: 300,
                temperature: 0.7,
                return_full_text: false
            }
        })
    });
    
    if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data?.[0]?.generated_text || '';
}

// Generate a fallback explanation when AI service is unavailable
function generateFallbackExplanation(prompt, moveNumber) {
    const move = $(`#bestMove${moveNumber}`).val();
    const evaluation = $(`#evaluation${moveNumber}`).val();
    const principalVariation = $(`#principalVariation${moveNumber}`).val();
    const moveRank = moveNumber === 1 ? 'best' : moveNumber === 2 ? 'second-best' : 'third-best';
    
    // Get current position for more context
    const currentFen = window.chessAnalyzer.game ? window.chessAnalyzer.game.fen() : $('#fenInput').val();
    const turn = currentFen.split(' ')[1]; // w or b
    const playerColor = turn === 'w' ? 'White' : 'Black';
    
    // Parse the move to get detailed information
    let piece = 'piece';
    let moveType = 'move';
    let fromSquare = '';
    let toSquare = '';
    let isCapture = false;
    let isCheck = false;
    
    // Enhanced move parsing
    if (move.includes('O-O-O')) {
        moveType = 'queenside castling';
        piece = 'king';
    } else if (move.includes('O-O')) {
        moveType = 'kingside castling';
        piece = 'king';
    } else {
        // Extract squares from the move
        let cleanMove = move;
        if (cleanMove.length > 4 && /^[a-zA-Z]/.test(cleanMove)) {
            cleanMove = cleanMove.slice(1); // Remove piece letter
        }
        
        if (cleanMove.length >= 4) {
            fromSquare = cleanMove.slice(0, 2);
            toSquare = cleanMove.slice(2, 4);
        }
        
        // Determine piece type
        if (move.startsWith('K')) {
            piece = 'king';
        } else if (move.startsWith('Q')) {
            piece = 'queen';
        } else if (move.startsWith('R')) {
            piece = 'rook';
        } else if (move.startsWith('B')) {
            piece = 'bishop';
        } else if (move.startsWith('N')) {
            piece = 'knight';
        } else if (move.startsWith('p') || /^[a-h]/.test(move)) {
            piece = 'pawn';
        }
        
        // Check for capture (simplified heuristic)
        isCapture = move.includes('x') || 
                   (piece === 'pawn' && fromSquare[0] !== toSquare[0]);
        
        // Check for check notation
        isCheck = move.includes('+') || move.includes('#');
    }
    
    // Generate comprehensive explanation
    let explanation = generateDetailedExplanation({
        move,
        piece,
        moveType,
        fromSquare,
        toSquare,
        isCapture,
        isCheck,
        evaluation,
        principalVariation,
        moveRank,
        moveNumber,
        playerColor,
        turn
    });
    
    return explanation;
}

// Generate detailed explanation based on move analysis
function generateDetailedExplanation(moveData) {
    const {
        move, piece, moveType, fromSquare, toSquare, isCapture, isCheck,
        evaluation, principalVariation, moveRank, moveNumber, playerColor, turn
    } = moveData;
    
    const evalNum = parseFloat(evaluation) || 0;
    const isGoodForYou = evalNum > 0;
    const isBadForYou = evalNum < -0.5;
    const isEqual = Math.abs(evalNum) <= 0.5;
    
    // Start with conversational openings
    const openings = [
        "I really like this move because",
        "This is a smart choice since",
        "Great idea here -",
        "This move works well because",
        "I'd recommend this because",
        "Perfect timing for this move since",
        "This is exactly what you want to do here because"
    ];
    
    const opening = openings[Math.floor(Math.random() * openings.length)];
    let explanation = opening + " ";
    
    // Main explanation - more conversational
    if (moveType.includes('castling')) {
        const castlingSide = moveType.includes('queenside') ? 'queenside' : 'kingside';
        explanation += `you're getting your king to safety on the ${castlingSide}. `;
        explanation += "Your king was getting a bit exposed in the center, and now it's tucked away nicely while your rook joins the party. ";
    } else if (isCapture) {
        explanation += `you're winning material here! Taking that piece gives you a nice advantage. `;
        explanation += "Plus, you're clearing away one of their defenders, which opens up new possibilities. ";
    } else if (isCheck) {
        explanation += `you're putting immediate pressure on their king! `;
        explanation += "They have to deal with this threat right now, which means they can't execute whatever plan they had in mind. ";
    } else {
        // Conversational piece-specific advice
        if (piece === 'pawn') {
            if (toSquare[1] === '7' || toSquare[1] === '2') {
                explanation += `this pawn is marching toward promotion! `;
                explanation += "Your opponent will have to start worrying about you getting a new queen soon. ";
            } else if (toSquare[0] === 'd' || toSquare[0] === 'e') {
                explanation += `you're controlling the center of the board with this pawn. `;
                explanation += "The center is like the highway of chess - control it, and you control the game. ";
            } else {
                explanation += `you're improving your pawn structure and creating some space for your pieces. `;
                explanation += "Sometimes these quiet pawn moves are exactly what you need. ";
            }
        } else if (piece === 'knight') {
            explanation += `knights love to jump to active squares, and this one found a great spot! `;
            explanation += "From here, your knight can influence multiple areas of the board. ";
        } else if (piece === 'bishop') {
            explanation += `this bishop is finding a much better diagonal to work from. `;
            explanation += "Bishops are long-range snipers - they need clear lines of sight to be effective. ";
        } else if (piece === 'rook') {
            explanation += `your rook is getting more active and putting pressure on key areas. `;
            explanation += "Rooks love open files and ranks - they're like bulldozers that need space to operate. ";
        } else if (piece === 'queen') {
            explanation += `your queen is moving to a more influential square where she can cause real problems. `;
            explanation += "The queen is your most powerful piece, so finding the right square for her is crucial. ";
        } else if (piece === 'king') {
            explanation += `your king is stepping up to help out, which is often the key in endgames. `;
            explanation += "Don't forget - the king is a fighting piece too, especially when there are fewer pieces on the board. ";
        }
    }
    
    // Evaluation-based encouragement/advice
    if (evaluation.includes('M')) {
        if (evaluation.startsWith('+')) {
            if (moveRank === 'best') {
                explanation += "And the best part? This leads to checkmate! Your opponent won't be able to escape this time. ";
            } else {
                explanation += "This also leads to mate, though there might be a faster way. Still, a win is a win! ";
            }
        } else {
            explanation += "I won't lie to you - the position is tough, but this gives you the best fighting chance. ";
            explanation += "Sometimes you have to make them work for their victory! ";
        }
    } else {
        if (moveRank === 'best') {
            if (isGoodForYou) {
                explanation += "This keeps you in the driver's seat and maintains your advantage nicely. ";
            } else if (isEqual) {
                explanation += "This keeps things balanced, which is exactly what you want in this position. ";
            } else {
                explanation += "This gives you the best practical chances to create some complications and fight back. ";
            }
        } else {
            explanation += "This is a solid alternative, though there might be something slightly better available. ";
        }
    }
    
    // Conversational consequences
    if (principalVariation && principalVariation.trim()) {
        const pvMoves = principalVariation.trim().split(' ').slice(0, 3);
        if (pvMoves.length >= 2) {
            explanation += `If you play this, the game will likely continue with natural moves, and you'll be in `;
            explanation += isGoodForYou ? "great shape moving forward." : isEqual ? "a balanced, interesting fight." : "a position where you can still create problems.";
        }
    } else {
        // Give strategic advice
        if (moveRank === 'best') {
            if (isCapture) {
                explanation += "Don't let them off the hook - take their pieces when you can! ";
            } else if (piece === 'pawn') {
                explanation += "Sometimes the best moves are the simple ones that improve your position step by step. ";
            } else {
                explanation += "Trust the process - good moves add up to good positions. ";
            }
        }
    }
    
    return explanation;
}

// Generate consequence analysis when PV is not available
function generateConsequenceAnalysis(moveData) {
    const { piece, moveType, evaluation, moveRank, isCapture, isCheck } = moveData;
    
    let consequences = '';
    
    // What happens if we don't make this move
    if (moveRank === 'best') {
        if (isCheck) {
            consequences += "Skipping this move allows your opponent to consolidate their position without immediate pressure. ";
        } else if (isCapture) {
            consequences += "Not capturing here lets your opponent maintain material balance and potentially improve their pieces. ";
        } else if (moveType.includes('castling')) {
            consequences += "Delaying castling leaves your king vulnerable to potential attacks in the center. ";
        } else {
            consequences += "Alternative moves would allow your opponent more freedom to execute their plans. ";
        }
    }
    
    // What happens if we do make this move
    const evalNum = parseFloat(evaluation);
    if (evalNum > 0.5) {
        consequences += "Making this move puts pressure on your opponent and forces them to find precise defensive moves.";
    } else if (evalNum > -0.5) {
        consequences += "This move maintains the balance and keeps all options open for both sides.";
    } else {
        consequences += "While the position remains difficult, this move gives you the best practical chances to create complications.";
    }
    
    return consequences;
}

// Display the AI explanation
function displayAIExplanation(explanation, moveNumber) {
    $(`#aiText${moveNumber}`).text(explanation);
    $(`#aiContent${moveNumber}`).show();
}

// Display AI error
function displayAIError(errorMessage, moveNumber) {
    $(`#aiText${moveNumber}`).html(`<em style="color: #dc2626;">Unable to generate explanation: ${errorMessage}</em>`);
    $(`#aiContent${moveNumber}`).show();
}

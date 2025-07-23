# Chess Position Analyzer

A powerful web-based chess position analyzer powered by the Stockfish chess engine. Set up any chess position and get instant analysis with best move suggestions, evaluations, and detailed analysis.

![Chess Position Analyzer](screenshot.png)

## Features

- **Interactive Chess Board**: Drag and drop pieces to set up any position
- **Stockfish Engine Integration**: Powered by the strongest open-source chess engine
- **Real-time Analysis**: Get instant position evaluations and best moves
- **FEN Import/Export**: Standard chess notation support
- **Customizable Analysis**: Adjustable thinking time and analysis modes
- **Visual Feedback**: Move highlighting and progress indicators
- **Game State Management**: Full control over turn, castling rights, and position setup

## Quick Start

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd chess-position-analyzer
   ```

2. Open `chess-analyzer.html` in your web browser

3. Start analyzing chess positions!

## How to Use

### Setting Up Positions
- **Drag and Drop**: Move pieces around the board to create any position
- **Start Position**: Click to reset to the standard starting position
- **Clear Board**: Remove all pieces to build positions from scratch
- **FEN Import**: Paste a FEN string to load a specific position

### Analysis Controls
- **Turn**: Select whose move it is (White or Black)
- **Castling Rights**: Configure available castling options
- **Think Time**: Set how long the engine should analyze (1-30 seconds)
- **Analysis Mode**: 
  - *Show Move*: Highlights the best move on the board
  - *Make Move*: Automatically plays the best move

### Understanding Results
- **Best Move**: The engine's recommended move in algebraic notation
- **Evaluation**: Position assessment in pawns (+/- or mate in X)
- **Depth**: How many moves ahead the engine calculated
- **Principal Variation**: The sequence of best moves for both sides

## Technical Details

### Dependencies
- **Stockfish.js**: Chess engine (included)
- **Chess.js**: Chess game logic library (included)
- **ChessBoard.js**: Interactive chess board (included)
- **jQuery**: DOM manipulation and UI effects
- **jQuery UI**: Progress bars and animations

### File Structure
```
chess-position-analyzer/
├── chess-analyzer.html    # Main HTML file
├── chess-analyzer.js      # Main JavaScript logic
├── styles.css            # Custom styling
├── chess.js              # Chess game logic library
├── stockfish.asm.js      # Stockfish chess engine
├── chessboard-1.0.0.min.css  # Chess board styling
├── chessboard-1.0.0.min.js   # Chess board functionality
└── chessboardjs-1.0.0/   # Chess piece images and assets
```

### Key Functions

#### When "Calculate Position" is Clicked:
1. **Position Preparation**: Current board state and game settings are converted to FEN format
2. **Engine Communication**: Position is sent to Stockfish with analysis parameters
3. **Real-time Updates**: Engine provides continuous feedback during analysis
4. **Result Processing**: Best moves, evaluations, and variations are parsed and displayed
5. **Visual Feedback**: Moves are highlighted or automatically played based on settings

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] Opening book integration
- [ ] Multi-PV analysis (show multiple best moves)
- [ ] Position evaluation graphs
- [ ] Game analysis from PGN files
- [ ] Mobile-responsive design improvements
- [ ] Dark theme option

## Known Issues

- Large stockfish.asm.js file may take time to load on slower connections
- Some advanced Stockfish options are not exposed in the UI
- Board resize functionality could be improved

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- **Stockfish Team**: For the powerful chess engine
- **Chess.js Contributors**: For the excellent chess logic library  
- **ChessBoard.js Author**: For the interactive chess board component
- **Original Implementation**: Inspired by various online chess analysis tools

## Support

If you encounter any issues or have suggestions, please open an issue on GitHub.

---

**Happy analyzing!** ♟️

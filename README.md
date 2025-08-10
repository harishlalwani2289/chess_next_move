# Chess Bot Analyzer - React + TypeScript + Vite

A powerful chess analysis tool built with React, TypeScript, and Vite. Features chess board editing, AI-powered move analysis, multiple board management, user authentication, and cloud synchronization.

**Live Demo:** [Production Frontend](https://your-vercel-app.vercel.app)  
**Production Backend:** https://chess-backend-production-cb44.up.railway.app/api

## ✨ Features

- 🎯 **Interactive Chess Board** - Drag and drop pieces with full editing capabilities
- 🤖 **AI Analysis** - Get move explanations from multiple AI providers (Gemini, OpenAI, Claude, Groq)
- 📋 **Multiple Boards** - Create and manage multiple chess positions
- 🔄 **Board Validation** - Automatic validation prevents invalid positions (king restrictions, pawn placement)
- 👥 **User Authentication** - Register/login with email or Google OAuth
- ☁️ **Cloud Sync** - Automatically save and sync boards across devices
- 📱 **Mobile Responsive** - Optimized for desktop, tablet, and mobile devices
- 🎨 **Themes & Customization** - Dark/light themes with multiple board styles
- 📈 **Move History** - Navigate through position history
- 🎛️ **Engine Integration** - Stockfish chess engine for analysis

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harishlalwani2289/chess_next_move.git
   cd chess_next_move
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Configure your .env file**
   ```env
   # Backend API URL
   VITE_API_URL=http://localhost:5000/api
   
   # AI API Keys (optional - for AI analysis features)
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_CLAUDE_API_KEY=your_claude_api_key_here
   VITE_GROQ_API_KEY=your_groq_api_key_here
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run check` - Run type check and linting

## 🗂️ Project Structure

```
src/
├── components/          # React components
│   ├── ChessBoard.tsx  # Main chess board component
│   ├── SparePieces.tsx # Draggable spare pieces
│   ├── AuthModal.tsx   # Authentication modal
│   └── ...
├── store/              # Zustand state management
│   ├── chessStore.ts   # Chess game state
│   └── authStore.ts    # Authentication state
├── services/           # API and external services
│   ├── api.ts          # Backend API calls
│   └── aiService.ts    # AI providers integration
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

## 🔗 Backend Setup

This frontend requires a backend API. You can:

1. **Use the production backend** (default):
   ```env
   VITE_API_URL=https://chess-backend-production-cb44.up.railway.app/api
   ```

2. **Set up local backend**:
   ```bash
   # Navigate to backend directory (if you have it)
   cd ../chess-backend
   
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   
   # Start backend server
   npm start
   ```

## 🎮 Usage Guide

### Basic Usage

1. **Chess Board Editing**
   - Drag pieces around the board
   - Use spare pieces to add new pieces
   - Right-click to remove pieces
   - Clear button removes all pieces except kings

2. **Board Management**
   - Create new boards with the "+" button
   - Switch between boards using the board selector
   - Rename boards by clicking the edit icon
   - Delete boards (except the last one)

3. **AI Analysis**
   - Configure AI API keys in settings
   - Select a move and click "Analyze"
   - Get detailed explanations from AI providers

4. **User Authentication**
   - Register/login to sync boards across devices
   - Use Google OAuth for quick access
   - Boards automatically save to the cloud when authenticated

### Advanced Features

1. **Board Validation**
   - Kings cannot be removed or duplicated
   - Pawns cannot be placed on edge ranks (1st/8th)
   - Invalid positions are automatically prevented

2. **Move History**
   - Navigate through position history
   - Undo/redo functionality
   - Export positions as FEN

3. **Customization**
   - Toggle between light/dark themes
   - Adjust board orientation
   - Configure engine analysis depth

## 🔑 API Keys Setup

### Gemini API (Google)
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Add to your `.env` file

### OpenAI API
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to your `.env` file

### Claude API (Anthropic)
1. Sign up at [Anthropic Console](https://console.anthropic.com/)
2. Generate an API key
3. Add to your `.env` file

### Groq API
1. Create account at [Groq](https://console.groq.com/)
2. Get your API key
3. Add to your `.env` file

## 🚀 Deployment

### Frontend Deployment (Vercel)

1. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Set environment variables** in Vercel dashboard:
   - `VITE_API_URL=https://your-backend-url.com/api`
   - Add your AI API keys

### Backend Deployment (Railway)

See the [deployment guide](./deployment-guide.md) for complete backend setup instructions.

## 🔧 Development

### Code Style
- ESLint + TypeScript strict mode
- Prettier for code formatting
- Consistent naming conventions

### State Management
- Zustand for global state
- Separate stores for chess and auth
- Persistent storage for offline capability

### Components
- Functional components with hooks
- TypeScript for type safety
- Responsive design with CSS Grid/Flexbox

## 🐛 Common Issues

### "Board not loading"
- Check if backend is running
- Verify API URL in `.env`
- Check browser console for errors

### "Authentication failed"
- Verify backend connection
- Check if JWT secret is configured
- Clear browser storage and try again

### "AI analysis not working"
- Verify API keys are correct
- Check API key permissions
- Ensure API keys are not expired

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- [Live Demo](https://your-vercel-app.vercel.app)
- [Backend Repository](https://github.com/harishlalwani2289/chess-backend)
- [Issue Tracker](https://github.com/harishlalwani2289/chess_next_move/issues)
- [Deployment Guide](./deployment-guide.md)

## 📊 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **State Management**: Zustand
- **Styling**: CSS3, Responsive Design
- **Chess Logic**: Chess.js, Chessground
- **AI Integration**: Multiple providers (Gemini, OpenAI, Claude, Groq)
- **Authentication**: JWT, OAuth (Google)
- **Deployment**: Vercel (Frontend), Railway (Backend)

---

Built with ❤️ by [Harish Lalwani](https://github.com/harishlalwani2289)

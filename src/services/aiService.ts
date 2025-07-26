export interface AISettings {
  geminiApiKey: string;
  openaiApiKey: string;
  claudeApiKey: string;
  groqApiKey: string;
}

export interface AIExplanation {
  explanation: string;
  confidence?: number;
  provider: string;
}

export interface AIRequest {
  position: string; // FEN string
  bestMove: string;
  evaluation: string;
  principalVariation: string;
  gameContext?: string;
}

class AIService {
  private getApiKeys(): AISettings {
    // First try environment variables (for production deployment)
    const envKeys: AISettings = {
      geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      claudeApiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
      groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    };

    // If no env variables, fall back to localStorage (for development/user input)
    const localKeys: AISettings = {
      geminiApiKey: envKeys.geminiApiKey || localStorage.getItem('geminiApiKey') || '',
      openaiApiKey: envKeys.openaiApiKey || localStorage.getItem('openaiApiKey') || '',
      claudeApiKey: envKeys.claudeApiKey || localStorage.getItem('claudeApiKey') || '',
      groqApiKey: envKeys.groqApiKey || localStorage.getItem('groqApiKey') || '',
    };

    return localKeys;
  }

  private async callGeminiAPI(request: AIRequest): Promise<AIExplanation> {
    const apiKey = this.getApiKeys().geminiApiKey;
    if (!apiKey) throw new Error('Gemini API key not configured');

    const prompt = this.buildChessPrompt(request);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation available';

    return {
      explanation: explanation.trim(),
      provider: 'Gemini',
      confidence: 0.9
    };
  }

  private async callOpenAIAPI(request: AIRequest): Promise<AIExplanation> {
    const apiKey = this.getApiKeys().openaiApiKey;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const prompt = this.buildChessPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a chess grandmaster explaining moves to help players improve their game.'
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
    const explanation = data.choices?.[0]?.message?.content || 'No explanation available';

    return {
      explanation: explanation.trim(),
      provider: 'OpenAI GPT',
      confidence: 0.85
    };
  }

  private async callClaudeAPI(request: AIRequest): Promise<AIExplanation> {
    const apiKey = this.getApiKeys().claudeApiKey;
    if (!apiKey) throw new Error('Claude API key not configured');

    const prompt = this.buildChessPrompt(request);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.content?.[0]?.text || 'No explanation available';

    return {
      explanation: explanation.trim(),
      provider: 'Claude',
      confidence: 0.88
    };
  }

  private async callGroqAPI(request: AIRequest): Promise<AIExplanation> {
    const apiKey = this.getApiKeys().groqApiKey;
    if (!apiKey) throw new Error('Groq API key not configured');

    const prompt = this.buildChessPrompt(request);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a chess expert providing clear, educational explanations about chess moves.'
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
    const explanation = data.choices?.[0]?.message?.content || 'No explanation available';

    return {
      explanation: explanation.trim(),
      provider: 'Groq',
      confidence: 0.8
    };
  }

  private buildChessPrompt(request: AIRequest): string {
    return `Analyze this chess position and explain why the recommended move is good:

Position (FEN): ${request.position}
Best Move: ${request.bestMove}
Evaluation: ${request.evaluation}
Principal Variation: ${request.principalVariation}

Please provide a clear, educational explanation of:
1. Why this move is recommended
2. What tactical or strategic ideas it implements
3. Any potential threats or opportunities it creates
4. How it fits into the overall position

Keep the explanation concise but informative (2-3 sentences max).`;
  }

  public async getExplanation(request: AIRequest): Promise<AIExplanation> {
    const apis = [
      { name: 'Gemini', fn: this.callGeminiAPI.bind(this) },
      { name: 'Groq', fn: this.callGroqAPI.bind(this) },
      { name: 'OpenAI', fn: this.callOpenAIAPI.bind(this) },
      { name: 'Claude', fn: this.callClaudeAPI.bind(this) }
    ];

    let lastError: Error | null = null;

    for (const api of apis) {
      try {
        console.log(`Trying ${api.name} API...`);
        const result = await api.fn(request);
        console.log(`✅ ${api.name} API successful`);
        return result;
      } catch (error) {
        console.log(`❌ ${api.name} API failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All AI services failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  public hasAnyApiKey(): boolean {
    const keys = this.getApiKeys();
    return !!(keys.geminiApiKey || keys.openaiApiKey || keys.claudeApiKey || keys.groqApiKey);
  }

  public getAvailableProviders(): string[] {
    const keys = this.getApiKeys();
    const providers: string[] = [];
    
    if (keys.geminiApiKey) providers.push('Gemini');
    if (keys.openaiApiKey) providers.push('OpenAI');
    if (keys.claudeApiKey) providers.push('Claude');
    if (keys.groqApiKey) providers.push('Groq');
    
    return providers;
  }
}

export const aiService = new AIService();

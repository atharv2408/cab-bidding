class ChatbotService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1/chat/completions';
    this.model = 'openai/gpt-3.5-turbo'; // Fallback to a standard model
    this.fallbackResponses = {
      'how do i book a ride': 'To book a ride: 1) Set your pickup location, 2) Set your destination, 3) Wait for driver bids, 4) Select the best bid, 5) Confirm your ride!',
      'how does bidding work': 'Our bidding system lets multiple drivers compete for your ride by offering competitive prices. You can choose the best offer based on price, driver rating, and estimated time.',
      'how do i become a driver': 'To become a driver, click on "Driver Portal" in the account menu and register with your vehicle details, license, and insurance information.',
      'payment methods': 'We accept credit cards, debit cards, and digital wallets. Payment is processed securely after ride completion.',
      'track my ride': 'You can track your ride in real-time on the map during your trip. You\'ll also receive notifications about your driver\'s arrival and trip progress.'
    };
  }

  async sendMessage(message, conversationHistory = []) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `You are a helpful assistant for a cab booking application. You can help users with:
          - Booking rides and understanding the bidding process
          - Answering questions about the app features
          - Helping with account and profile issues
          - Providing support for both customers and drivers
          - General assistance with the cab booking platform
          
          Keep responses concise and helpful. Always be polite and professional.`
        },
        ...conversationHistory,
        {
          role: 'user',
          content: message
        }
      ];

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Cab Bidding App'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      return {
        message: data.choices[0].message.content,
        usage: data.usage || {}
      };
    } catch (error) {
      console.error('Chatbot service error:', error);
      
      // Try fallback responses first
      const fallbackResponse = this.getFallbackResponse(message);
      if (fallbackResponse) {
        return {
          message: fallbackResponse,
          usage: { fallback: true }
        };
      }
      
      // If no fallback, provide a helpful error message
      return {
        message: "I'm having trouble connecting to my AI service right now. Here are some common questions I can help with:\n\n" +
                "• How do I book a ride?\n" +
                "• How does the bidding system work?\n" +
                "• How do I become a driver?\n" +
                "• What payment methods are accepted?\n" +
                "• How do I track my ride?\n\n" +
                "Please try asking one of these questions, or try again later!",
        usage: { fallback: true, error: true }
      };
    }
  }

  // Get fallback response for common questions
  getFallbackResponse(message) {
    const normalizedMessage = message.toLowerCase().trim();
    
    for (const [key, response] of Object.entries(this.fallbackResponses)) {
      if (normalizedMessage.includes(key) || normalizedMessage.includes(key.replace(/ /g, ''))) {
        return response;
      }
    }
    
    return null;
  }

  // Predefined quick responses for common questions
  getQuickResponses() {
    return [
      "How do I book a ride?",
      "How does the bidding system work?",
      "How do I become a driver?",
      "What are the payment methods?",
      "How do I track my ride?"
    ];
  }

  // Get context-aware system message based on user type
  getContextSystemMessage(userType = 'customer') {
    const baseMessage = `You are a helpful assistant for a cab booking application.`;
    
    if (userType === 'driver') {
      return `${baseMessage} You're specifically helping a driver who can:
      - Accept and manage ride requests
      - View their earnings and ride history
      - Update their profile and availability
      - Understand the bidding process from driver perspective
      Focus on driver-related features and concerns.`;
    } else {
      return `${baseMessage} You're helping a customer who can:
      - Book rides and receive bids from drivers
      - Track their rides and view history
      - Manage their profile and payment methods
      - Understand how the bidding system works
      Focus on customer-related features and booking process.`;
    }
  }
}

export default new ChatbotService();

export default async function handler(req, res) {
  // Set CORS headers for ALL requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: "Method not allowed",
      success: false
    });
  }

  try {
    const { message, history = [] } = req.body || {};
    
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message is required and cannot be empty",
        success: false
      });
    }

    // Check if OpenAI API key exists
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key not configured",
        success: false
      });
    }

    // Build conversation messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant embedded in a website widget. Be friendly, concise, and helpful. Keep responses under 150 words unless specifically asked for more detail.'
      }
    ];

    // Add conversation history (last 10 exchanges to manage context length)
    const recentHistory = history.slice(-20); // Last 20 messages (10 exchanges)
    messages.push(...recentHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: messages,
        max_tokens: 150,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      
      // Handle specific OpenAI errors
      if (response.status === 401) {
        return res.status(500).json({
          error: "Invalid OpenAI API key",
          success: false
        });
      } else if (response.status === 429) {
        return res.status(500).json({
          error: "Rate limit exceeded. Please try again in a moment.",
          success: false
        });
      } else if (response.status === 402) {
        return res.status(500).json({
          error: "OpenAI account has insufficient credits",
          success: false
        });
      } else {
        return res.status(500).json({
          error: "AI service temporarily unavailable",
          success: false
        });
      }
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const aiReply = data.choices[0].message.content.trim();

    // Log for debugging (you'll see this in Vercel function logs)
    console.log(`User: "${message}" | AI: "${aiReply.substring(0, 50)}..."`);

    return res.status(200).json({
      reply: aiReply,
      success: true,
      timestamp: new Date().toISOString(),
      model: 'gpt-4.1-nano-2025-04-14',
      tokensUsed: data.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('Backend error:', error);
    return res.status(500).json({
      error: "Internal server error",
      success: false
    });
  }
}
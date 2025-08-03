export default function handler(req, res) {
  // Set CORS headers for ALL requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Handle POST request
  if (req.method === 'POST') {
    const { message } = req.body || {};
    
    return res.status(200).json({
      reply: "Hello! This is a simple hardcoded response from the backend. Your message was received!",
      success: true,
      receivedMessage: message || "no message"
    });
  }
  
  // Handle other methods
  return res.status(405).json({
    error: "Method not allowed",
    success: false
  });
}
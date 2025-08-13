// mcp-servers/phi4-mcp-server/index.js - Add first tool gradually

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Phi4 MCP Server - Adding Generate Tool...');

// Minimal middleware only
app.use(express.json());

// Root endpoint - instant response
app.get('/', (req, res) => {
  console.log('📊 Root endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    version: 'v2-with-generate-tool'
  });
});

// Health endpoint - instant response
app.get('/health', (req, res) => {
  console.log('🏥 Health endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    version: 'v2-with-generate-tool',
    tools: ['generate'],
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed
  });
});

// Tool: Simple Text Generation
app.post('/tools/generate', (req, res) => {
  try {
    console.log('🤖 Generate tool called');
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Simple response generation - no heavy operations
    const response = `AI Response to "${prompt.substring(0, 30)}..." - This is a mock response from the Phi4 model demonstrating text generation capabilities.`;

    res.json({
      success: true,
      model: 'phi4',
      response: response,
      metadata: {
        tokens_used: Math.floor(Math.random() * max_tokens * 0.8),
        processing_time: Math.random() * 2 + 0.5,
        temperature: temperature,
        prompt_length: prompt.length
      }
    });

  } catch (error) {
    console.error('❌ Generate error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  console.log('📋 Tools list requested');
  res.json({
    service: 'phi4-mcp-server',
    version: 'v2-with-generate-tool',
    available_tools: [
      {
        name: 'generate',
        description: 'Generate text using Phi4 model',
        endpoint: '/tools/generate',
        method: 'POST',
        parameters: ['prompt', 'max_tokens', 'temperature']
      }
    ]
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working with generate tool',
    timestamp: new Date().toISOString(),
    server: 'phi4-mcp-server',
    version: 'v2-with-generate-tool'
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server immediately - no delays
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Phi4 MCP Server started successfully on port ${PORT}`);
  console.log(`🌐 Available at: https://phi4-mcp-server.azurewebsites.net/`);
  console.log(`🛠️ Tools available: generate`);
  console.log(`⚡ Startup time: ${process.uptime()} seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
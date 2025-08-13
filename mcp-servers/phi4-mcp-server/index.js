// mcp-servers/phi4-mcp-server/index.js - remove first tool

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.send('Phi4 MCP Server is running');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Tools endpoint - UPDATED VERSION
app.get('/tools', (req, res) => {
  res.json({
    service: 'phi4-mcp-server',
    version: 'minimal-with-mock',  // Changed from 'minimal'
    available_tools: [              // Now has a tool!
      {
        name: 'generate',
        description: 'Generate text (mock)',
        endpoint: '/tools/generate',
        method: 'POST'
      }
    ]
  });
});

// NEW ENDPOINT - Mock generate
app.post('/tools/generate', (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    res.json({
      success: true,
      model: 'phi4-mock',
      response: `Mock response for: "${prompt.substring(0, 50)}..."`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate',
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
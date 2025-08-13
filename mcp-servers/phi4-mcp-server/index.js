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

// Basic tools endpoint
app.get('/tools', (req, res) => {
  res.json({
    service: 'phi4-mcp-server',
    version: 'minimal',
    available_tools: []
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
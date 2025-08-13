// mcp-servers/phi4-mcp-server/index.js - Ultra-simple version for fast startup

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Phi4 MCP Server - Ultra Simple Version...');

// Minimal middleware only
app.use(express.json());

// Root endpoint - instant response
app.get('/', (req, res) => {
  console.log('📊 Root endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    version: 'ultra-simple-v1'
  });
});

// Health endpoint - instant response
app.get('/health', (req, res) => {
  console.log('🏥 Health endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    version: 'ultra-simple-v1',
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed
  });
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working perfectly',
    timestamp: new Date().toISOString(),
    server: 'phi4-mcp-server'
  });
});

// Start server immediately - no delays or heavy operations
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Phi4 MCP Server started successfully on port ${PORT}`);
  console.log(`🌐 Available at: https://phi4-mcp-server.azurewebsites.net/`);
  console.log(`📝 Version: Ultra-simple for fast startup`);
  console.log(`⚡ Startup time: ${process.uptime()} seconds`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
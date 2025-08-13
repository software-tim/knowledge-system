const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting server...');

app.use(express.json());

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
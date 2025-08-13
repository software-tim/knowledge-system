const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.json({ 
    message: 'Knowledge Orchestrator is running!', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});

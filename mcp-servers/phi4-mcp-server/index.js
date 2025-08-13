// mcp-servers/phi4-mcp-server/index.js - Safe version with tools

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting Phi4 MCP Server...');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  console.log('📊 Root endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString()
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health endpoint hit');
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    tools: ['generate', 'classify', 'extract-entities'],
    uptime: process.uptime()
  });
});

// Tool: Text Generation
app.post('/tools/generate', (req, res) => {
  try {
    console.log('🤖 Generate tool called');
    const { prompt, max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Simple mock response - no async/await issues
    const response = `AI Response to "${prompt.substring(0, 50)}..." - This is a mock response from the Phi4 model demonstrating text generation capabilities.`;

    res.json({
      success: true,
      model: 'phi4',
      response: response,
      metadata: {
        tokens_used: Math.floor(Math.random() * max_tokens * 0.8),
        processing_time: Math.random() * 2 + 0.5,
        temperature: temperature
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

// Tool: Text Classification
app.post('/tools/classify', (req, res) => {
  try {
    console.log('🏷️ Classify tool called');
    const { text, categories } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simple classification logic - no async operations
    const textLower = text.toLowerCase();
    let classification = 'Other';
    let confidence = 0.75;

    if (textLower.includes('research') || textLower.includes('study')) {
      classification = 'Research Paper';
      confidence = 0.92;
    } else if (textLower.includes('meeting') || textLower.includes('agenda')) {
      classification = 'Meeting Notes';
      confidence = 0.88;
    } else if (textLower.includes('technical') || textLower.includes('api') || textLower.includes('documentation')) {
      classification = 'Technical Documentation';
      confidence = 0.90;
    } else if (textLower.includes('business') || textLower.includes('revenue') || textLower.includes('market')) {
      classification = 'Business Report';
      confidence = 0.86;
    } else if (textLower.includes('policy') || textLower.includes('procedure')) {
      classification = 'Policy Document';
      confidence = 0.89;
    }

    res.json({
      success: true,
      classification: classification,
      confidence: confidence,
      text_length: text.length
    });

  } catch (error) {
    console.error('❌ Classification error:', error);
    res.status(500).json({ 
      error: 'Failed to classify text',
      details: error.message 
    });
  }
});

// Tool: Entity Extraction
app.post('/tools/extract-entities', (req, res) => {
  try {
    console.log('🔍 Entity extraction called');
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const entities = [];
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ 
        type: 'EMAIL', 
        value: email, 
        confidence: 0.98
      });
    });
    
    // Extract dates
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      entities.push({ 
        type: 'DATE', 
        value: date, 
        confidence: 0.95
      });
    });
    
    // Extract organizations
    const orgRegex = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
    const orgs = text.match(orgRegex) || [];
    orgs.forEach(org => {
      entities.push({ 
        type: 'ORGANIZATION', 
        value: org, 
        confidence: 0.87
      });
    });
    
    // Extract person names
    const personRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const persons = text.match(personRegex) || [];
    persons.slice(0, 5).forEach(person => { // Limit to 5 to avoid too many matches
      entities.push({ 
        type: 'PERSON', 
        value: person, 
        confidence: 0.82
      });
    });

    // Extract technology terms
    const techTerms = ['AI', 'Machine Learning', 'Deep Learning', 'API', 'Database', 'Cloud', 'Azure', 'Python', 'JavaScript'];
    techTerms.forEach(term => {
      if (text.includes(term)) {
        entities.push({
          type: 'TECHNOLOGY',
          value: term,
          confidence: 0.90
        });
      }
    });

    // Remove duplicates
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => e.type === entity.type && e.value === entity.value)
    );

    res.json({
      success: true,
      entities: uniqueEntities,
      total_count: uniqueEntities.length,
      entity_types: [...new Set(uniqueEntities.map(e => e.type))]
    });

  } catch (error) {
    console.error('❌ Entity extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract entities',
      details: error.message 
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  console.log('📋 Tools list requested');
  res.json({
    service: 'phi4-mcp-server',
    available_tools: [
      {
        name: 'generate',
        description: 'Generate text using Phi4 model',
        endpoint: '/tools/generate',
        method: 'POST',
        parameters: ['prompt', 'max_tokens', 'temperature']
      },
      {
        name: 'classify',
        description: 'Classify text into categories',
        endpoint: '/tools/classify',
        method: 'POST',
        parameters: ['text', 'categories']
      },
      {
        name: 'extract-entities',
        description: 'Extract entities from text',
        endpoint: '/tools/extract-entities',
        method: 'POST',
        parameters: ['text']
      }
    ]
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Phi4 MCP Server started successfully on port ${PORT}`);
  console.log(`🌐 Available at: https://phi4-mcp-server.azurewebsites.net/`);
  console.log(`🛠️ Tools: generate, classify, extract-entities`);
});

module.exports = app;
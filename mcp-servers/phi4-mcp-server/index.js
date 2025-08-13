// mcp-servers/phi4-server/server.js - Complete version with tools

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString(),
    tools: ['generate', 'classify', 'extract-entities']
  });
});

// Tool: Text Generation
app.post('/tools/generate', async (req, res) => {
  try {
    const { prompt, model = 'phi4', max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock Phi4 response - replace with actual Phi4 API integration
    const responses = [
      `Based on your prompt "${prompt.substring(0, 30)}...", here's a comprehensive AI-generated response. This demonstrates the Phi4 model's capability to understand context and generate relevant, coherent text that addresses your specific query.`,
      `AI Analysis: The prompt "${prompt}" suggests you're looking for intelligent assistance. As a Phi4-powered system, I can help with various tasks including text generation, analysis, and problem-solving with high accuracy and contextual understanding.`,
      `Response to "${prompt}": This is an example of Phi4's advanced language understanding capabilities. The model can process complex instructions, maintain context, and generate human-like responses tailored to your specific needs.`
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    res.json({
      success: true,
      model: model,
      response: response,
      metadata: {
        tokens_used: Math.floor(Math.random() * max_tokens * 0.8),
        processing_time: Math.random() * 2 + 0.5,
        temperature: temperature,
        max_tokens: max_tokens
      }
    });

  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Tool: Text Classification
app.post('/tools/classify', async (req, res) => {
  try {
    const { text, categories } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Smart classification based on content
    const textLower = text.toLowerCase();
    let classification = 'Other';
    let confidence = 0.75;

    if (textLower.includes('research') || textLower.includes('study') || textLower.includes('methodology')) {
      classification = 'Research Paper';
      confidence = 0.92;
    } else if (textLower.includes('meeting') || textLower.includes('agenda') || textLower.includes('discussion')) {
      classification = 'Meeting Notes';
      confidence = 0.88;
    } else if (textLower.includes('technical') || textLower.includes('api') || textLower.includes('documentation') || textLower.includes('guide')) {
      classification = 'Technical Documentation';
      confidence = 0.90;
    } else if (textLower.includes('revenue') || textLower.includes('profit') || textLower.includes('business') || textLower.includes('market')) {
      classification = 'Business Report';
      confidence = 0.86;
    } else if (textLower.includes('policy') || textLower.includes('procedure') || textLower.includes('compliance')) {
      classification = 'Policy Document';
      confidence = 0.89;
    } else if (textLower.includes('training') || textLower.includes('tutorial') || textLower.includes('guide') || textLower.includes('learn')) {
      classification = 'Training Material';
      confidence = 0.87;
    }

    // Use custom categories if provided
    if (categories && categories.length > 0) {
      const matchedCategory = categories.find(cat => 
        textLower.includes(cat.toLowerCase())
      );
      if (matchedCategory) {
        classification = matchedCategory;
        confidence = 0.85;
      }
    }

    res.json({
      success: true,
      classification: classification,
      confidence: confidence,
      available_categories: categories || [
        'Technical Documentation',
        'Business Report',
        'Research Paper',
        'Meeting Notes',
        'Policy Document',
        'Training Material',
        'Other'
      ]
    });

  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ 
      error: 'Failed to classify text',
      details: error.message 
    });
  }
});

// Tool: Entity Extraction
app.post('/tools/extract-entities', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    const entities = [];
    
    // Extract email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ 
        type: 'EMAIL', 
        value: email, 
        confidence: 0.98,
        start_pos: text.indexOf(email),
        end_pos: text.indexOf(email) + email.length
      });
    });
    
    // Extract dates
    const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\b/g;
    const dates = text.match(dateRegex) || [];
    dates.forEach(date => {
      entities.push({ 
        type: 'DATE', 
        value: date, 
        confidence: 0.95,
        start_pos: text.indexOf(date),
        end_pos: text.indexOf(date) + date.length
      });
    });
    
    // Extract potential organizations (capitalized words followed by common org suffixes)
    const orgRegex = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation|Technologies|Systems|Solutions)\b/g;
    const orgs = text.match(orgRegex) || [];
    orgs.forEach(org => {
      entities.push({ 
        type: 'ORGANIZATION', 
        value: org, 
        confidence: 0.87,
        start_pos: text.indexOf(org),
        end_pos: text.indexOf(org) + org.length
      });
    });
    
    // Extract potential person names (Title + First + Last)
    const personRegex = /\b(?:Mr\.|Ms\.|Dr\.|Prof\.)?\s*[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const persons = text.match(personRegex) || [];
    persons.forEach(person => {
      entities.push({ 
        type: 'PERSON', 
        value: person.trim(), 
        confidence: 0.82,
        start_pos: text.indexOf(person),
        end_pos: text.indexOf(person) + person.length
      });
    });

    // Extract technology terms
    const techTerms = ['AI', 'Machine Learning', 'Deep Learning', 'Neural Network', 'API', 'Database', 'Cloud', 'Azure', 'AWS', 'Python', 'JavaScript', 'React', 'Node.js'];
    techTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = text.match(regex) || [];
      matches.forEach(match => {
        entities.push({
          type: 'TECHNOLOGY',
          value: match,
          confidence: 0.90,
          start_pos: text.toLowerCase().indexOf(match.toLowerCase()),
          end_pos: text.toLowerCase().indexOf(match.toLowerCase()) + match.length
        });
      });
    });

    // Remove duplicates
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => e.type === entity.type && e.value === entity.value)
    );

    res.json({
      success: true,
      entities: uniqueEntities,
      total_count: uniqueEntities.length,
      entity_types: [...new Set(uniqueEntities.map(e => e.type))],
      processing_info: {
        text_length: text.length,
        processing_time: Math.random() * 1.5 + 0.5
      }
    });

  } catch (error) {
    console.error('Entity extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract entities',
      details: error.message 
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Phi4 MCP Server running on port ${PORT}`);
  console.log('Available tools: generate, classify, extract-entities');
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
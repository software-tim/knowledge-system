// mcp-servers/phi4-mcp-server/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'phi4-mcp-server',
    timestamp: new Date().toISOString()
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'classify_content',
        description: 'Classify and tag content using AI',
        parameters: {
          content: { type: 'string', required: true },
          context: { type: 'string', required: false }
        }
      },
      {
        name: 'synthesize_insights',
        description: 'Generate insights and connections',
        parameters: {
          content: { type: 'string', required: true },
          related_content: { type: 'array', required: false }
        }
      },
      {
        name: 'generate_summary',
        description: 'Generate summary of content',
        parameters: {
          content: { type: 'string', required: true },
          length: { type: 'string', enum: ['short', 'medium', 'long'], required: false },
          focus: { type: 'string', required: false }
        }
      },
      {
        name: 'extract_entities',
        description: 'Extract entities from text',
        parameters: {
          text: { type: 'string', required: true }
        }
      }
    ]
  });
});

// Enhanced content classification
app.post('/tools/classify_content', async (req, res) => {
  try {
    const { content, context } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const prompt = `Classify the following content and suggest relevant tags and categories:
    
Content: ${content}
${context ? `Context: ${context}` : ''}

Respond with JSON containing:
- category: main category (career, technical, research, etc.)
- tags: array of relevant tags
- confidence: confidence score 0-1
- summary: brief 1-sentence summary`;

    // Use OpenAI or simulate if no API key
    let response;
    if (process.env.OPENAI_API_KEY) {
      response = await callOpenAI(prompt);
    } else {
      response = await simulateAIResponse(content, 'classification');
    }

    res.json({
      classification: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate insights and connections
app.post('/tools/synthesize_insights', async (req, res) => {
  try {
    const { content, related_content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const prompt = `Analyze the following content and generate actionable insights:
    
Main Content: ${content}
${related_content ? `Related Content: ${JSON.stringify(related_content)}` : ''}

Provide:
1. Key insights and patterns
2. Connections to related content
3. Actionable recommendations
4. Potential applications or next steps`;

    let response;
    if (process.env.OPENAI_API_KEY) {
      response = await callOpenAI(prompt);
    } else {
      response = await simulateAIResponse(content, 'insights');
    }

    res.json({
      insights: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate summary
app.post('/tools/generate_summary', async (req, res) => {
  try {
    const { content, length = 'medium', focus } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const lengthMap = {
      short: '1-2 sentences',
      medium: '1-2 paragraphs',
      long: '3-4 paragraphs'
    };

    const prompt = `Summarize the following content in ${lengthMap[length]}:
    ${focus ? `Focus on: ${focus}` : ''}
    
${content}`;

    let response;
    if (process.env.OPENAI_API_KEY) {
      response = await callOpenAI(prompt);
    } else {
      response = await simulateAIResponse(content, 'summary');
    }

    res.json({
      summary: response,
      length,
      focus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced entity extraction
app.post('/tools/extract_entities', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const entities = await extractEntities(text);
    
    res.json({
      success: true,
      entities: entities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Entity extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Call OpenAI API (if available)
async function callOpenAI(prompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to call OpenAI API');
  }
}

// Simulate AI response (fallback)
async function simulateAIResponse(content, type) {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  switch (type) {
    case 'classification':
      return JSON.stringify({
        category: classifyContent(content),
        tags: generateTags(content),
        confidence: 0.85,
        summary: `Content about ${content.substring(0, 50)}...`
      }, null, 2);
    
    case 'insights':
      return `Key Insights from Analysis:

1. Primary Theme: The content focuses on ${extractKeywords(content).slice(0, 3).join(', ')}
2. Actionable Items: Consider implementing strategies around these key areas
3. Connections: This content relates to broader topics in the domain
4. Next Steps: Review related documents and expand on key concepts identified

Recommendations:
- Develop deeper analysis on main themes
- Cross-reference with similar content
- Consider practical applications of insights`;
    
    case 'summary':
      const keywords = extractKeywords(content);
      return `This content discusses ${keywords.slice(0, 3).join(', ')} and covers key aspects of the topic. The main points include practical applications and important considerations for implementation.`;
    
    default:
      return `Analysis complete for ${content.substring(0, 100)}...`;
  }
}

// Enhanced entity extraction
async function extractEntities(text) {
  const entities = [];
  
  // Extract email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach(email => {
    entities.push({ type: 'EMAIL', value: email, confidence: 0.95 });
  });
  
  // Extract dates (multiple formats)
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b/gi
  ];
  
  datePatterns.forEach(pattern => {
    const dates = text.match(pattern) || [];
    dates.forEach(date => {
      entities.push({ type: 'DATE', value: date, confidence: 0.90 });
    });
  });
  
  // Extract organizations and companies
  const orgRegex = /\b[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Organization|University|Institute)\b/g;
  const orgs = text.match(orgRegex) || [];
  orgs.forEach(org => {
    entities.push({ type: 'ORGANIZATION', value: org, confidence: 0.85 });
  });
  
  // Extract technology terms
  const techTerms = ['AI', 'ML', 'API', 'SQL', 'JavaScript', 'Python', 'Azure', 'AWS', 'Docker', 'Kubernetes'];
  techTerms.forEach(term => {
    if (text.includes(term)) {
      entities.push({ type: 'TECHNOLOGY', value: term, confidence: 0.80 });
    }
  });
  
  // Extract URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex) || [];
  urls.forEach(url => {
    entities.push({ type: 'URL', value: url, confidence: 0.95 });
  });

  return entities;
}

// Helper functions
function classifyContent(content) {
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('research') || contentLower.includes('study') || contentLower.includes('analysis')) {
    return 'Research';
  } else if (contentLower.includes('meeting') || contentLower.includes('agenda') || contentLower.includes('minutes')) {
    return 'Meeting Notes';
  } else if (contentLower.includes('technical') || contentLower.includes('api') || contentLower.includes('code')) {
    return 'Technical';
  } else if (contentLower.includes('business') || contentLower.includes('revenue') || contentLower.includes('strategy')) {
    return 'Business';
  } else if (contentLower.includes('personal') || contentLower.includes('note') || contentLower.includes('thought')) {
    return 'Personal';
  }
  
  return 'General';
}

function generateTags(content) {
  const tags = [];
  const contentLower = content.toLowerCase();
  
  const tagMap = {
    'important': ['important', 'critical', 'urgent', 'priority'],
    'technical': ['technical', 'code', 'programming', 'development'],
    'business': ['business', 'strategy', 'revenue', 'profit'],
    'research': ['research', 'study', 'analysis', 'data'],
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml'],
    'cloud': ['cloud', 'azure', 'aws', 'gcp'],
    'meeting': ['meeting', 'discussion', 'agenda']
  };
  
  Object.keys(tagMap).forEach(tag => {
    if (tagMap[tag].some(keyword => contentLower.includes(keyword))) {
      tags.push(tag);
    }
  });
  
  return tags.length > 0 ? tags : ['general'];
}

function extractKeywords(content) {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'about'].includes(word));
  
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.keys(frequency)
    .sort((a, b) => frequency[b] - frequency[a])
    .slice(0, 10);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Phi4 MCP Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /tools');
  console.log('  POST /tools/classify_content');
  console.log('  POST /tools/synthesize_insights');
  console.log('  POST /tools/generate_summary');
  console.log('  POST /tools/extract_entities');
});
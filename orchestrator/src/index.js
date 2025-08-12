// orchestrator/src/index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// MCP Server URLs
const MCP_SERVERS = {
  phi4: process.env.PHI4_SERVER_URL || 'https://phi4-mcp-server.azurewebsites.net',
  sql: process.env.SQL_SERVER_URL || 'https://azure-sql-mcp-server.azurewebsites.net',
  graphrag: process.env.GRAPHRAG_SERVER_URL || 'https://graphrag-mcp-server.azurewebsites.net',
  search: process.env.SEARCH_SERVER_URL || 'https://web-search-mcp-server.azurewebsites.net'
};

// Database configuration
const dbConfig = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USERNAME,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let pool;

// Initialize database connection
async function initializeDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('Orchestrator connected to Azure SQL Database');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Helper function to call MCP servers
async function callMCPServer(serverName, endpoint, data, method = 'POST') {
  try {
    const url = `${MCP_SERVERS[serverName]}${endpoint}`;
    console.log(`Calling ${serverName}: ${method} ${url}`);
    
    const config = {
      method,
      url,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    };
    
    if (data && method === 'POST') {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${serverName} server:`, error.message);
    throw new Error(`${serverName} server error: ${error.response?.status || error.message}`);
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const serverHealth = {};
    
    // Check each MCP server
    for (const [name, url] of Object.entries(MCP_SERVERS)) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        serverHealth[name] = response.status === 200 ? 'healthy' : 'unhealthy';
      } catch (error) {
        serverHealth[name] = 'unreachable';
      }
    }

    res.json({ 
      status: 'healthy', 
      service: 'knowledge-orchestrator',
      servers: serverHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload and process document
app.post('/api/upload-document', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { title, category, tags, user_id = 'anonymous' } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = file.buffer.toString('utf8');
    
    // Step 1: Classify content using Phi-4
    console.log('Classifying content with Phi-4...');
    let classification;
    try {
      classification = await callMCPServer('phi4', '/tools/classify_content', {
        content: fileContent,
        context: `Title: ${title}, Category: ${category}`
      });
    } catch (error) {
      console.log('Phi4 classification failed, using fallback');
      classification = { classification: JSON.stringify({ category: category || 'General', tags: [], confidence: 0.5 }) };
    }

    // Step 2: Extract entities and build knowledge graph
    console.log('Extracting entities for knowledge graph...');
    let entities;
    try {
      entities = await callMCPServer('graphrag', '/tools/extract_entities', {
        text: fileContent,
        auto_add_to_graph: true
      });
    } catch (error) {
      console.log('GraphRAG extraction failed, using fallback');
      entities = { entities: [], relationships: [] };
    }

    // Step 3: Store document in database
    console.log('Storing document in database...');
    let document;
    try {
      document = await callMCPServer('sql', '/tools/store_document', {
        title: title || file.originalname,
        content: fileContent,
        category,
        tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
        file_path: file.originalname,
        embeddings: [] // TODO: Generate embeddings
      });
    } catch (error) {
      console.log('SQL storage failed:', error.message);
      throw new Error('Failed to store document in database');
    }

    // Step 4: Generate insights
    console.log('Generating insights...');
    let insights;
    try {
      insights = await callMCPServer('phi4', '/tools/synthesize_insights', {
        content: fileContent,
        related_content: entities.entities
      });
    } catch (error) {
      console.log('Insights generation failed, using fallback');
      insights = { insights: 'Document processed successfully. Insights generation temporarily unavailable.' };
    }

    // Step 5: Log user interaction
    if (pool) {
      try {
        const request = pool.request();
        await request
          .input('user_id', sql.NVarChar, user_id)
          .input('action_type', sql.NVarChar, 'upload')
          .input('target_type', sql.NVarChar, 'document')
          .input('target_id', sql.NVarChar, document.document_id?.toString() || 'unknown')
          .input('metadata', sql.NVarChar, JSON.stringify({
            file_name: file.originalname,
            file_size: file.size,
            classification: classification,
            entities_count: entities.entities?.length || 0
          }))
          .query(`
            INSERT INTO user_interactions (user_id, action_type, target_type, target_id, metadata)
            VALUES (@user_id, @action_type, @target_type, @target_id, @metadata)
          `);
      } catch (dbError) {
        console.error('Failed to log interaction:', dbError);
      }
    }

    res.json({
      success: true,
      document_id: document.document_id,
      classification,
      entities: entities.entities,
      insights,
      message: 'Document uploaded and processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search across all knowledge sources
app.post('/api/search', async (req, res) => {
  try {
    const { query, include_web = false, user_id = 'anonymous' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = {};

    // Step 1: Search documents in database
    console.log('Searching documents...');
    try {
      results.documents = await callMCPServer('sql', '/tools/search_documents', {
        query,
        limit: 20
      });
    } catch (error) {
      console.log('Document search failed:', error.message);
      results.documents = { documents: [], count: 0 };
    }

    // Step 2: Search knowledge graph
    console.log('Searching knowledge graph...');
    try {
      results.graph = await callMCPServer('graphrag', '/tools/query_graph', {
        limit: 10
      });
    } catch (error) {
      console.log('Graph search failed:', error.message);
      results.graph = { graph_data: [], count: 0 };
    }

    // Step 3: Web search (if requested)
    if (include_web) {
      console.log('Performing web search...');
      try {
        results.web = await callMCPServer('search', '/tools/search_and_summarize', {
          query,
          count: 5
        });
      } catch (error) {
        console.log('Web search failed:', error.message);
        results.web = { results: [], summary: 'Web search temporarily unavailable' };
      }
    }

    // Step 4: Generate AI insights on search results
    console.log('Generating search insights...');
    const searchContext = {
      query,
      document_count: results.documents.count || 0,
      graph_nodes: results.graph.count || 0,
      web_results: results.web?.results?.length || 0
    };

    let insights;
    try {
      insights = await callMCPServer('phi4', '/tools/synthesize_insights', {
        content: `Search query: "${query}"`,
        related_content: [
          ...(results.documents.documents || []).slice(0, 3),
          ...(results.graph.graph_data || []).slice(0, 3)
        ]
      });
    } catch (error) {
      console.log('Search insights failed:', error.message);
      insights = { insights: `Search completed for "${query}". Found ${searchContext.document_count} documents and ${searchContext.graph_nodes} graph nodes.` };
    }

    // Step 5: Log search interaction
    if (pool) {
      try {
        const request = pool.request();
        await request
          .input('user_id', sql.NVarChar, user_id)
          .input('action_type', sql.NVarChar, 'search')
          .input('target_type', sql.NVarChar, 'system')
          .input('target_id', sql.NVarChar, 'search_results')
          .input('metadata', sql.NVarChar, JSON.stringify(searchContext))
          .query(`
            INSERT INTO user_interactions (user_id, action_type, target_type, target_id, metadata)
            VALUES (@user_id, @action_type, @target_type, @target_id, @metadata)
          `);
      } catch (dbError) {
        console.error('Failed to log search:', dbError);
      }
    }

    res.json({
      query,
      results,
      insights,
      summary: {
        total_documents: results.documents.count || 0,
        total_graph_nodes: results.graph.count || 0,
        web_results: results.web?.results?.length || 0,
        include_web
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get system status and analytics
app.get('/api/status', async (req, res) => {
  try {
    const status = {};

    // Get database statistics
    if (pool) {
      try {
        const request = pool.request();
        const dbStats = await request.query(`
          SELECT 
            (SELECT COUNT(*) FROM documents WHERE status = 1) as total_documents,
            (SELECT COUNT(*) FROM categories) as total_categories,
            (SELECT COUNT(*) FROM tags) as total_tags,
            (SELECT COUNT(*) FROM knowledge_graph_nodes) as total_graph_nodes,
            (SELECT COUNT(*) FROM knowledge_graph_edges) as total_graph_edges,
            (SELECT COUNT(*) FROM user_interactions WHERE created_at >= DATEADD(day, -1, GETUTCDATE())) as interactions_today
        `);
        status.database = dbStats.recordset[0];
      } catch (error) {
        console.log('Database stats failed:', error.message);
        status.database = { error: 'Database stats unavailable' };
      }
    }

    // Get server health
    status.servers = {};
    for (const [name, url] of Object.entries(MCP_SERVERS)) {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        status.servers[name] = response.status === 200 ? 'healthy' : 'unhealthy';
      } catch (error) {
        status.servers[name] = 'unreachable';
      }
    }

    // Get recent activity
    if (pool) {
      try {
        const request = pool.request();
        const recentActivity = await request.query(`
          SELECT TOP 10 
            action_type,
            target_type,
            created_at,
            user_id
          FROM user_interactions 
          ORDER BY created_at DESC
        `);
        status.recent_activity = recentActivity.recordset;
      } catch (error) {
        status.recent_activity = [];
      }
    }

    res.json({
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID with enhanced details
app.get('/api/document/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document from database
    let document;
    try {
      document = await callMCPServer('sql', `/tools/get_document/${id}`, null, 'GET');
    } catch (error) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get related graph nodes
    let graphData;
    try {
      graphData = await callMCPServer('graphrag', '/tools/query_graph', {
        limit: 20
      });
    } catch (error) {
      graphData = { graph_data: [] };
    }

    // Generate summary
    let summary;
    try {
      summary = await callMCPServer('phi4', '/tools/generate_summary', {
        content: document.document.content,
        length: 'medium'
      });
    } catch (error) {
      summary = { summary: 'Summary generation temporarily unavailable' };
    }

    res.json({
      document: document.document,
      related_graph_data: graphData.graph_data,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Smart recommendations based on user activity
app.get('/api/recommendations/:user_id?', async (req, res) => {
  try {
    const { user_id = 'anonymous' } = req.params;

    // Get user's recent interactions
    let recentInteractions = [];
    if (pool) {
      try {
        const request = pool.request();
        const interactions = await request
          .input('user_id', sql.NVarChar, user_id)
          .query(`
            SELECT TOP 10 target_type, target_id, metadata, created_at
            FROM user_interactions 
            WHERE user_id = @user_id 
            ORDER BY created_at DESC
          `);
        recentInteractions = interactions.recordset;
      } catch (error) {
        console.log('Failed to get user interactions:', error.message);
      }
    }

    // Get trending documents
    let trendingDocs;
    try {
      trendingDocs = await callMCPServer('sql', '/tools/search_documents', {
        limit: 5
      });
    } catch (error) {
      trendingDocs = { documents: [] };
    }

    // Get graph insights
    let graphStats;
    try {
      graphStats = await callMCPServer('graphrag', '/tools/graph_stats', null, 'GET');
    } catch (error) {
      graphStats = { stats: {} };
    }

    res.json({
      user_id,
      recent_interactions: recentInteractions,
      trending_documents: trendingDocs.documents || [],
      graph_insights: graphStats.stats,
      recommendations: [
        'Explore recently uploaded documents',
        'Check out trending knowledge graph connections',
        'Search for topics related to your recent activity'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all available tools across all servers
app.get('/api/tools', async (req, res) => {
  try {
    const allTools = {};

    for (const [serverName, serverUrl] of Object.entries(MCP_SERVERS)) {
      try {
        const response = await axios.get(`${serverUrl}/tools`, { timeout: 5000 });
        allTools[serverName] = response.data.tools || [];
      } catch (error) {
        console.error(`Failed to get tools from ${serverName}:`, error.message);
        allTools[serverName] = [];
      }
    }

    res.json({
      orchestrator_tools: [
        'upload-document',
        'search', 
        'status',
        'recommendations'
      ],
      mcp_servers: allTools,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Knowledge System Orchestrator running on port ${PORT}`);
    console.log('MCP Servers:', MCP_SERVERS);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  POST /api/upload-document');
    console.log('  POST /api/search');
    console.log('  GET  /api/status');
    console.log('  GET  /api/document/:id');
    console.log('  GET  /api/recommendations/:user_id');
    console.log('  GET  /api/tools');
  });
});
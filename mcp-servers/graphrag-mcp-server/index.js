// mcp-servers/graphrag-mcp-server/src/index.js
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
    console.log('GraphRAG MCP Server connected to Azure SQL Database');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'graphrag-mcp-server',
    timestamp: new Date().toISOString()
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'add_graph_node',
        description: 'Add a node to the knowledge graph',
        parameters: {
          id: { type: 'string', required: true },
          label: { type: 'string', required: true },
          node_type: { type: 'string', required: true },
          properties: { type: 'object', required: false },
          embedding_vector: { type: 'array', required: false }
        }
      },
      {
        name: 'add_graph_edge',
        description: 'Add a relationship between nodes',
        parameters: {
          source_node_id: { type: 'string', required: true },
          target_node_id: { type: 'string', required: true },
          relationship_type: { type: 'string', required: true },
          weight: { type: 'number', required: false },
          properties: { type: 'object', required: false }
        }
      },
      {
        name: 'query_graph',
        description: 'Query the knowledge graph',
        parameters: {
          node_id: { type: 'string', required: false },
          relationship_type: { type: 'string', required: false },
          depth: { type: 'number', required: false },
          limit: { type: 'number', required: false }
        }
      },
      {
        name: 'extract_entities',
        description: 'Extract entities and relationships from text',
        parameters: {
          text: { type: 'string', required: true },
          auto_add_to_graph: { type: 'boolean', required: false }
        }
      },
      {
        name: 'graph_stats',
        description: 'Get knowledge graph statistics',
        parameters: {}
      }
    ]
  });
});

// Add a node to the knowledge graph
app.post('/tools/add_graph_node', async (req, res) => {
  try {
    const { id, label, node_type, properties, embedding_vector } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    await request
      .input('id', sql.NVarChar, id)
      .input('label', sql.NVarChar, label)
      .input('node_type', sql.NVarChar, node_type)
      .input('properties', sql.NVarChar, JSON.stringify(properties || {}))
      .input('embedding_vector', sql.NVarChar, JSON.stringify(embedding_vector || []))
      .query(`
        MERGE knowledge_graph_nodes AS target
        USING (SELECT @id as id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET 
            label = @label,
            node_type = @node_type,
            properties = @properties,
            embedding_vector = @embedding_vector,
            updated_at = GETUTCDATE()
        WHEN NOT MATCHED THEN
          INSERT (id, label, node_type, properties, embedding_vector, created_at)
          VALUES (@id, @label, @node_type, @properties, @embedding_vector, GETUTCDATE());
      `);

    res.json({
      message: 'Graph node added/updated successfully',
      node_id: id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Add graph node error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add an edge (relationship) between nodes
app.post('/tools/add_graph_edge', async (req, res) => {
  try {
    const { source_node_id, target_node_id, relationship_type, weight = 1.0, properties } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    const result = await request
      .input('source_node_id', sql.NVarChar, source_node_id)
      .input('target_node_id', sql.NVarChar, target_node_id)
      .input('relationship_type', sql.NVarChar, relationship_type)
      .input('weight', sql.Float, weight)
      .input('properties', sql.NVarChar, JSON.stringify(properties || {}))
      .query(`
        INSERT INTO knowledge_graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
        OUTPUT INSERTED.id
        VALUES (@source_node_id, @target_node_id, @relationship_type, @weight, @properties)
      `);

    res.json({
      message: 'Graph edge added successfully',
      edge_id: result.recordset[0].id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Add graph edge error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query the knowledge graph
app.post('/tools/query_graph', async (req, res) => {
  try {
    const { node_id, relationship_type, depth = 1, limit = 50 } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    let query;
    const request = pool.request();

    if (node_id) {
      // Get connections for a specific node
      query = `
        WITH GraphTraversal AS (
          -- Direct connections
          SELECT 
            n1.id as source_id, n1.label as source_label, n1.node_type as source_type,
            e.relationship_type,
            n2.id as target_id, n2.label as target_label, n2.node_type as target_type,
            e.weight,
            1 as depth
          FROM knowledge_graph_nodes n1
          JOIN knowledge_graph_edges e ON n1.id = e.source_node_id
          JOIN knowledge_graph_nodes n2 ON e.target_node_id = n2.id
          WHERE n1.id = @node_id
          ${relationship_type ? 'AND e.relationship_type = @relationship_type' : ''}
          
          UNION ALL
          
          -- Reverse connections
          SELECT 
            n2.id as source_id, n2.label as source_label, n2.node_type as source_type,
            e.relationship_type,
            n1.id as target_id, n1.label as target_label, n1.node_type as target_type,
            e.weight,
            1 as depth
          FROM knowledge_graph_nodes n1
          JOIN knowledge_graph_edges e ON n1.id = e.target_node_id
          JOIN knowledge_graph_nodes n2 ON e.source_node_id = n2.id
          WHERE n1.id = @node_id
          ${relationship_type ? 'AND e.relationship_type = @relationship_type' : ''}
        )
        SELECT TOP (@limit) * FROM GraphTraversal
        ORDER BY weight DESC
      `;
      
      request.input('node_id', sql.NVarChar, node_id);
      if (relationship_type) {
        request.input('relationship_type', sql.NVarChar, relationship_type);
      }
    } else {
      // Get all nodes and relationships
      query = `
        SELECT TOP (@limit)
          n.id, n.label, n.node_type, n.properties, n.created_at
        FROM knowledge_graph_nodes n
        ORDER BY n.created_at DESC
      `;
    }

    request.input('limit', sql.Int, limit);
    const result = await request.query(query);

    res.json({
      graph_data: result.recordset,
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Query graph error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract entities from text and build graph
app.post('/tools/extract_entities', async (req, res) => {
  try {
    const { text, auto_add_to_graph = false } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Simple entity extraction (in production, you'd use NLP libraries)
    const entities = extractEntitiesFromText(text);
    const relationships = extractRelationshipsFromText(text, entities);
    
    if (auto_add_to_graph && pool) {
      // Add entities as nodes
      for (const entity of entities) {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, entity.id)
          .input('label', sql.NVarChar, entity.text)
          .input('node_type', sql.NVarChar, entity.type)
          .input('properties', sql.NVarChar, JSON.stringify({ 
            confidence: entity.confidence,
            source_text: text.substring(Math.max(0, entity.start - 50), entity.end + 50)
          }))
          .input('embedding_vector', sql.NVarChar, JSON.stringify([]))
          .query(`
            MERGE knowledge_graph_nodes AS target
            USING (SELECT @id as id) AS source
            ON target.id = source.id
            WHEN NOT MATCHED THEN
              INSERT (id, label, node_type, properties, embedding_vector, created_at)
              VALUES (@id, @label, @node_type, @properties, @embedding_vector, GETUTCDATE());
          `);
      }

      // Add relationships as edges
      for (const rel of relationships) {
        const request = pool.request();
        await request
          .input('source_node_id', sql.NVarChar, rel.source)
          .input('target_node_id', sql.NVarChar, rel.target)
          .input('relationship_type', sql.NVarChar, rel.type)
          .input('weight', sql.Float, rel.confidence)
          .input('properties', sql.NVarChar, JSON.stringify({ source_text: text }))
          .query(`
            INSERT INTO knowledge_graph_edges (source_node_id, target_node_id, relationship_type, weight, properties)
            VALUES (@source_node_id, @target_node_id, @relationship_type, @weight, @properties)
          `);
      }
    }

    res.json({
      entities,
      relationships,
      auto_added: auto_add_to_graph,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Extract entities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get graph statistics
app.get('/tools/graph_stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        (SELECT COUNT(*) FROM knowledge_graph_nodes) as total_nodes,
        (SELECT COUNT(*) FROM knowledge_graph_edges) as total_edges,
        (SELECT COUNT(DISTINCT node_type) FROM knowledge_graph_nodes) as unique_node_types,
        (SELECT COUNT(DISTINCT relationship_type) FROM knowledge_graph_edges) as unique_relationship_types,
        (SELECT TOP 1 node_type FROM knowledge_graph_nodes GROUP BY node_type ORDER BY COUNT(*) DESC) as most_common_node_type,
        (SELECT TOP 1 relationship_type FROM knowledge_graph_edges GROUP BY relationship_type ORDER BY COUNT(*) DESC) as most_common_relationship_type
    `);

    res.json({
      stats: result.recordset[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Graph stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Simple entity extraction function (basic implementation)
function extractEntitiesFromText(text) {
  const entities = [];
  
  // Simple patterns for demonstration
  const patterns = [
    { type: 'PERSON', regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g },
    { type: 'ORGANIZATION', regex: /\b[A-Z][a-z]* (Inc|Corp|LLC|Ltd|Company|Organization)\b/g },
    { type: 'TECHNOLOGY', regex: /\b(JavaScript|Python|React|Node\.js|Azure|SQL|API|AI|ML)\b/g },
    { type: 'CONCEPT', regex: /\b(database|server|application|system|framework|library)\b/gi }
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      entities.push({
        id: `${pattern.type}_${match[0].replace(/\s+/g, '_').toLowerCase()}`,
        text: match[0],
        type: pattern.type,
        start: match.index,
        end: match.index + match[0].length,
        confidence: 0.8
      });
    }
  });

  return entities;
}

// Simple relationship extraction
function extractRelationshipsFromText(text, entities) {
  const relationships = [];
  
  // Simple co-occurrence based relationships
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const entity1 = entities[i];
      const entity2 = entities[j];
      
      // If entities are close to each other, assume a relationship
      if (Math.abs(entity1.start - entity2.start) < 100) {
        relationships.push({
          source: entity1.id,
          target: entity2.id,
          type: 'RELATED_TO',
          confidence: 0.6
        });
      }
    }
  }

  return relationships;
}

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
    console.log(`GraphRAG MCP Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /tools');
    console.log('  POST /tools/add_graph_node');
    console.log('  POST /tools/add_graph_edge');
    console.log('  POST /tools/query_graph');
    console.log('  POST /tools/extract_entities');
    console.log('  GET  /tools/graph_stats');
  });
});
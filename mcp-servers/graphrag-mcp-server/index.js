// mcp-servers/graphrag-server/server.js - Complete version with tools

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
    service: 'graphrag-mcp-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'graphrag-mcp-server',
    timestamp: new Date().toISOString(),
    tools: ['extract-graph', 'store-graph', 'query-graph', 'entity-relationships']
  });
});

// Tool: Extract Graph from Text
app.post('/tools/extract-graph', async (req, res) => {
  try {
    const { text, document_id } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 1000));

    const entities = [];
    const relationships = [];
    
    // Extract person names
    const personRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const persons = [...new Set(text.match(personRegex) || [])];
    
    persons.forEach((person, index) => {
      entities.push({
        id: `person_${index + 1}`,
        type: 'PERSON',
        name: person,
        properties: {
          source_document: document_id,
          confidence: 0.85 + Math.random() * 0.10
        }
      });
    });
    
    // Extract organizations
    const orgRegex = /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation|Technologies|Systems|University|Institute)\b/g;
    const orgs = [...new Set(text.match(orgRegex) || [])];
    
    orgs.forEach((org, index) => {
      entities.push({
        id: `org_${index + 1}`,
        type: 'ORGANIZATION',
        name: org,
        properties: {
          source_document: document_id,
          confidence: 0.80 + Math.random() * 0.15
        }
      });
    });
    
    // Extract locations
    const locationRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:City|State|Country|Street|Avenue|Road|Boulevard)\b/g;
    const locations = [...new Set(text.match(locationRegex) || [])];
    
    locations.forEach((location, index) => {
      entities.push({
        id: `location_${index + 1}`,
        type: 'LOCATION',
        name: location,
        properties: {
          source_document: document_id,
          confidence: 0.75 + Math.random() * 0.20
        }
      });
    });

    // Extract technology terms
    const techTerms = ['AI', 'Machine Learning', 'Deep Learning', 'Neural Network', 'API', 'Database', 'Cloud Computing', 'Azure', 'Python', 'JavaScript'];
    techTerms.forEach((term, index) => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        entities.push({
          id: `tech_${index + 1}`,
          type: 'TECHNOLOGY',
          name: term,
          properties: {
            source_document: document_id,
            confidence: 0.90 + Math.random() * 0.05
          }
        });
      }
    });

    // Create relationships between entities
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // Skip if same type (less likely to have direct relationship)
        if (entity1.type === entity2.type) continue;
        
        let relationshipType = 'RELATED_TO';
        let confidence = 0.60;
        
        // Define specific relationship types
        if (entity1.type === 'PERSON' && entity2.type === 'ORGANIZATION') {
          relationshipType = 'WORKS_AT';
          confidence = 0.75;
        } else if (entity1.type === 'PERSON' && entity2.type === 'LOCATION') {
          relationshipType = 'LOCATED_IN';
          confidence = 0.70;
        } else if (entity1.type === 'ORGANIZATION' && entity2.type === 'LOCATION') {
          relationshipType = 'HEADQUARTERS_IN';
          confidence = 0.80;
        } else if (entity1.type === 'ORGANIZATION' && entity2.type === 'TECHNOLOGY') {
          relationshipType = 'USES_TECHNOLOGY';
          confidence = 0.85;
        } else if (entity1.type === 'PERSON' && entity2.type === 'TECHNOLOGY') {
          relationshipType = 'SPECIALIZES_IN';
          confidence = 0.70;
        }
        
        relationships.push({
          id: `rel_${relationships.length + 1}`,
          source_id: entity1.id,
          target_id: entity2.id,
          type: relationshipType,
          properties: {
            source_document: document_id,
            confidence: confidence + Math.random() * 0.15,
            extracted_context: `Found in: "${text.substring(0, 100)}..."`
          }
        });
      }
    }

    res.json({
      success: true,
      graph: {
        entities,
        relationships,
        document_id: document_id
      },
      entities_count: entities.length,
      relationships_count: relationships.length,
      processing_info: {
        text_length: text.length,
        processing_time: Math.random() * 2 + 1
      }
    });

  } catch (error) {
    console.error('Graph extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to extract graph',
      details: error.message 
    });
  }
});

// Tool: Store Graph
app.post('/tools/store-graph', async (req, res) => {
  try {
    const { entities, relationships, document_id } = req.body;

    if (!entities || !relationships) {
      return res.status(400).json({ error: 'Entities and relationships are required' });
    }

    // Simulate storage processing
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Mock storage operation
    console.log(`Storing graph for document ${document_id}:`);
    console.log(`- ${entities.length} entities`);
    console.log(`- ${relationships.length} relationships`);
    
    res.json({
      success: true,
      stored_entities: entities.length,
      stored_relationships: relationships.length,
      document_id: document_id,
      storage_info: {
        timestamp: new Date().toISOString(),
        storage_location: 'mock_graph_database'
      }
    });

  } catch (error) {
    console.error('Store graph error:', error);
    res.status(500).json({ 
      error: 'Failed to store graph',
      details: error.message 
    });
  }
});

// Tool: Query Graph
app.post('/tools/query-graph', async (req, res) => {
  try {
    const { query, entity_type, relationship_type, limit = 10 } = req.body;

    // Simulate query processing
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    // Mock graph query results
    const mockResults = [
      {
        entity: {
          id: 'person_1',
          type: 'PERSON',
          name: 'John Smith',
          properties: { confidence: 0.92, department: 'Engineering' }
        },
        relationships: [
          {
            type: 'WORKS_AT',
            target: { type: 'ORGANIZATION', name: 'Tech Corp', id: 'org_1' },
            confidence: 0.88
          },
          {
            type: 'SPECIALIZES_IN',
            target: { type: 'TECHNOLOGY', name: 'Machine Learning', id: 'tech_1' },
            confidence: 0.85
          }
        ]
      },
      {
        entity: {
          id: 'org_1',
          type: 'ORGANIZATION',
          name: 'AI Research Lab',
          properties: { confidence: 0.89, industry: 'Technology' }
        },
        relationships: [
          {
            type: 'HEADQUARTERS_IN',
            target: { type: 'LOCATION', name: 'Silicon Valley', id: 'loc_1' },
            confidence: 0.91
          },
          {
            type: 'USES_TECHNOLOGY',
            target: { type: 'TECHNOLOGY', name: 'Deep Learning', id: 'tech_2' },
            confidence: 0.87
          }
        ]
      },
      {
        entity: {
          id: 'tech_1',
          type: 'TECHNOLOGY',
          name: 'Neural Networks',
          properties: { confidence: 0.94, category: 'AI/ML' }
        },
        relationships: [
          {
            type: 'RELATED_TO',
            target: { type: 'TECHNOLOGY', name: 'Deep Learning', id: 'tech_2' },
            confidence: 0.93
          }
        ]
      }
    ];

    // Filter results based on query parameters
    let filteredResults = mockResults;
    
    if (entity_type) {
      filteredResults = filteredResults.filter(result => 
        result.entity.type === entity_type.toUpperCase()
      );
    }
    
    if (relationship_type) {
      filteredResults = filteredResults.filter(result => 
        result.relationships.some(rel => rel.type === relationship_type.toUpperCase())
      );
    }
    
    if (query) {
      filteredResults = filteredResults.filter(result => 
        result.entity.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    res.json({
      success: true,
      results: filteredResults.slice(0, limit),
      total_found: filteredResults.length,
      query_info: {
        original_query: query,
        entity_type_filter: entity_type,
        relationship_type_filter: relationship_type,
        limit: limit
      }
    });

  } catch (error) {
    console.error('Graph query error:', error);
    res.status(500).json({ 
      error: 'Failed to query graph',
      details: error.message 
    });
  }
});

// Tool: Get Entity Relationships
app.get('/tools/entity-relationships/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { depth = 1 } = req.query;

    // Simulate relationship lookup
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

    // Mock entity relationships
    const mockRelationships = [
      {
        relationship_type: 'WORKS_AT',
        target_entity: {
          id: 'org_1',
          type: 'ORGANIZATION',
          name: 'Tech Corporation'
        },
        confidence: 0.91,
        depth: 1
      },
      {
        relationship_type: 'SPECIALIZES_IN',
        target_entity: {
          id: 'tech_1',
          type: 'TECHNOLOGY',
          name: 'Artificial Intelligence'
        },
        confidence: 0.87,
        depth: 1
      },
      {
        relationship_type: 'COLLABORATES_WITH',
        target_entity: {
          id: 'person_2',
          type: 'PERSON',
          name: 'Jane Doe'
        },
        confidence: 0.78,
        depth: 1
      }
    ];

    // Add second-degree relationships if depth > 1
    if (parseInt(depth) > 1) {
      mockRelationships.push(
        {
          relationship_type: 'HEADQUARTERS_IN',
          target_entity: {
            id: 'loc_1',
            type: 'LOCATION',
            name: 'San Francisco'
          },
          confidence: 0.85,
          depth: 2,
          path: ['org_1', 'loc_1']
        }
      );
    }

    res.json({
      success: true,
      entity_id: entityId,
      relationships: mockRelationships,
      relationship_count: mockRelationships.length,
      max_depth: parseInt(depth)
    });

  } catch (error) {
    console.error('Get relationships error:', error);
    res.status(500).json({ 
      error: 'Failed to get entity relationships',
      details: error.message 
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    service: 'graphrag-mcp-server',
    available_tools: [
      {
        name: 'extract-graph',
        description: 'Extract entities and relationships from text',
        endpoint: '/tools/extract-graph',
        method: 'POST',
        parameters: ['text', 'document_id']
      },
      {
        name: 'store-graph',
        description: 'Store graph data in the knowledge base',
        endpoint: '/tools/store-graph',
        method: 'POST',
        parameters: ['entities', 'relationships', 'document_id']
      },
      {
        name: 'query-graph',
        description: 'Query the knowledge graph',
        endpoint: '/tools/query-graph',
        method: 'POST',
        parameters: ['query', 'entity_type', 'relationship_type', 'limit']
      },
      {
        name: 'entity-relationships',
        description: 'Get relationships for a specific entity',
        endpoint: '/tools/entity-relationships/:entityId',
        method: 'GET',
        parameters: ['entityId', 'depth']
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
  console.log(`GraphRAG MCP Server running on port ${PORT}`);
  console.log('Available tools: extract-graph, store-graph, query-graph, entity-relationships');
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
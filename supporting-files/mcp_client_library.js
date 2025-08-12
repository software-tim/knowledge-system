// orchestrator/lib/mcpClient.js
const axios = require('axios');

class McpClient {
  constructor(serverUrls) {
    this.servers = {
      phi4: serverUrls.phi4_server,
      sql: serverUrls.sql_server,
      graphrag: serverUrls.graphrag_server,
      search: serverUrls.search_server
    };
    
    // Set default timeout
    this.timeout = 30000;
    
    // Create axios instances for each server
    this.clients = {};
    Object.keys(this.servers).forEach(key => {
      this.clients[key] = axios.create({
        baseURL: this.servers[key],
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Add response interceptors for error handling
      this.clients[key].interceptors.response.use(
        response => response,
        error => {
          console.error(`Error from ${key} server:`, error.message);
          throw new Error(`${key} server error: ${error.message}`);
        }
      );
    });
  }

  // Health check for all servers
  async checkAllServers() {
    const healthChecks = {};
    
    for (const [serverName, client] of Object.entries(this.clients)) {
      try {
        const response = await client.get('/health');
        healthChecks[serverName] = {
          status: 'healthy',
          url: this.servers[serverName],
          response: response.data
        };
      } catch (error) {
        healthChecks[serverName] = {
          status: 'unhealthy',
          url: this.servers[serverName],
          error: error.message
        };
      }
    }
    
    return healthChecks;
  }

  // Phi4 Server Methods
  async generateText(prompt, options = {}) {
    try {
      const response = await this.clients.phi4.post('/tools/generate', {
        prompt,
        model: options.model || 'phi4',
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  async classifyText(text, categories = []) {
    try {
      const response = await this.clients.phi4.post('/tools/classify', {
        text,
        categories
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to classify text: ${error.message}`);
    }
  }

  async extractEntities(text) {
    try {
      const response = await this.clients.phi4.post('/tools/extract-entities', {
        text
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to extract entities: ${error.message}`);
    }
  }

  // SQL Server Methods
  async storeDocument(documentData, file = null) {
    try {
      const formData = new FormData();
      
      // Add document data
      Object.keys(documentData).forEach(key => {
        if (documentData[key] !== null && documentData[key] !== undefined) {
          formData.append(key, typeof documentData[key] === 'object' 
            ? JSON.stringify(documentData[key]) 
            : documentData[key]);
        }
      });
      
      // Add file if provided
      if (file) {
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      }
      
      const response = await this.clients.sql.post('/tools/store-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to store document: ${error.message}`);
    }
  }

  async searchDocuments(query, filters = {}, limit = 10, offset = 0) {
    try {
      const response = await this.clients.sql.post('/tools/search-documents', {
        query,
        classification: filters.classification,
        limit,
        offset
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  async getDocument(documentId) {
    try {
      const response = await this.clients.sql.get(`/tools/get-document/${documentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  async updateDocument(documentId, updateData) {
    try {
      const response = await this.clients.sql.put(`/tools/update-document/${documentId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  // GraphRAG Server Methods
  async extractGraph(text, documentId) {
    try {
      const response = await this.clients.graphrag.post('/tools/extract-graph', {
        text,
        document_id: documentId
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to extract graph: ${error.message}`);
    }
  }

  async storeGraph(entities, relationships, documentId) {
    try {
      const response = await this.clients.graphrag.post('/tools/store-graph', {
        entities,
        relationships,
        document_id: documentId
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to store graph: ${error.message}`);
    }
  }

  async queryGraph(query, entityType = null, relationshipType = null, limit = 10) {
    try {
      const response = await this.clients.graphrag.post('/tools/query-graph', {
        query,
        entity_type: entityType,
        relationship_type: relationshipType,
        limit
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to query graph: ${error.message}`);
    }
  }

  async getEntityRelationships(entityId, depth = 1) {
    try {
      const response = await this.clients.graphrag.get(`/tools/entity-relationships/${entityId}?depth=${depth}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get entity relationships: ${error.message}`);
    }
  }

  // Search Server Methods
  async semanticSearch(query, filters = {}, top = 10, skip = 0) {
    try {
      const response = await this.clients.search.post('/tools/semantic-search', {
        query,
        filters,
        top,
        skip
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to perform semantic search: ${error.message}`);
    }
  }

  async vectorSearch(query, vector = null, top = 10, similarityThreshold = 0.7) {
    try {
      const response = await this.clients.search.post('/tools/vector-search', {
        query,
        vector,
        top,
        similarity_threshold: similarityThreshold
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to perform vector search: ${error.message}`);
    }
  }

  async indexDocument(documentId, title, content, metadata = {}, embeddings = null) {
    try {
      const response = await this.clients.search.post('/tools/index-document', {
        document_id: documentId,
        title,
        content,
        metadata,
        embeddings
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to index document: ${error.message}`);
    }
  }

  // Utility methods
  async testConnection(serverName) {
    if (!this.clients[serverName]) {
      throw new Error(`Unknown server: ${serverName}`);
    }
    
    try {
      const response = await this.clients[serverName].get('/health');
      return {
        server: serverName,
        status: 'connected',
        response: response.data
      };
    } catch (error) {
      return {
        server: serverName,
        status: 'failed',
        error: error.message
      };
    }
  }

  async batchOperation(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        const result = await this.executeOperation(operation);
        results.push({
          operation: operation.type,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          operation: operation.type,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async executeOperation(operation) {
    switch (operation.type) {
      case 'generate':
        return await this.generateText(operation.prompt, operation.options);
      
      case 'classify':
        return await this.classifyText(operation.text, operation.categories);
      
      case 'extract_entities':
        return await this.extractEntities(operation.text);
      
      case 'store_document':
        return await this.storeDocument(operation.data, operation.file);
      
      case 'search_documents':
        return await this.searchDocuments(operation.query, operation.filters, operation.limit, operation.offset);
      
      case 'extract_graph':
        return await this.extractGraph(operation.text, operation.document_id);
      
      case 'semantic_search':
        return await this.semanticSearch(operation.query, operation.filters, operation.top, operation.skip);
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}

module.exports = McpClient;
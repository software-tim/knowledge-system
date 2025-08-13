// mcp-servers/azure-sql-mcp-server/src/index.js
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
    console.log('Connected to Azure SQL Database');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'azure-sql-mcp-server',
    timestamp: new Date().toISOString()
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'store_document',
        description: 'Store document content and metadata',
        parameters: {
          title: { type: 'string', required: true },
          content: { type: 'string', required: true },
          category: { type: 'string', required: false },
          tags: { type: 'array', required: false },
          file_path: { type: 'string', required: false },
          embeddings: { type: 'array', required: false }
        }
      },
      {
        name: 'search_documents',
        description: 'Search documents by content or metadata',
        parameters: {
          query: { type: 'string', required: false },
          category: { type: 'string', required: false },
          tags: { type: 'array', required: false },
          limit: { type: 'number', required: false }
        }
      },
      {
        name: 'update_document',
        description: 'Update existing document',
        parameters: {
          document_id: { type: 'number', required: true },
          title: { type: 'string', required: false },
          content: { type: 'string', required: false },
          category: { type: 'string', required: false },
          tags: { type: 'array', required: false }
        }
      },
      {
        name: 'get_document',
        description: 'Get document by ID',
        parameters: {
          id: { type: 'number', required: true }
        }
      },
      {
        name: 'get_stats',
        description: 'Get database statistics',
        parameters: {}
      }
    ]
  });
});

// Store document metadata and content
app.post('/tools/store_document', async (req, res) => {
  try {
    const { title, content, category, tags, file_path, embeddings } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    const result = await request
      .input('title', sql.NVarChar, title)
      .input('content', sql.NVarChar, content)
      .input('classification', sql.NVarChar, category)
      .input('metadata', sql.NVarChar, JSON.stringify({ tags: tags || [], embeddings: embeddings || [] }))
      .input('file_name', sql.NVarChar, file_path)
      .input('file_type', sql.NVarChar, 'text/plain')
      .input('file_size', sql.BigInt, content ? content.length : 0)
      .input('user_id', sql.NVarChar, 'api_user')
      .query(`
        INSERT INTO documents (title, content, classification, metadata, file_name, file_type, file_size, user_id, created_at, updated_at)
        OUTPUT INSERTED.id
        VALUES (@title, @content, @classification, @metadata, @file_name, @file_type, @file_size, @user_id, GETUTCDATE(), GETUTCDATE())
      `);

    res.json({
      document_id: result.recordset[0].id,
      message: 'Document stored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Store document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search documents by content or metadata
app.post('/tools/search_documents', async (req, res) => {
  try {
    const { query, category, tags, limit = 10 } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    let sqlQuery = `
      SELECT TOP (@limit) id, title, content, classification, metadata, file_name, created_at, updated_at
      FROM documents
      WHERE status = 1
    `;

    if (query) {
      sqlQuery += ` AND (title LIKE @query OR content LIKE @query)`;
      request.input('query', sql.NVarChar, `%${query}%`);
    }

    if (category) {
      sqlQuery += ` AND classification = @category`;
      request.input('category', sql.NVarChar, category);
    }

    sqlQuery += ` ORDER BY updated_at DESC`;
    request.input('limit', sql.Int, limit);

    const result = await request.query(sqlQuery);

    res.json({
      documents: result.recordset.map(doc => ({
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
      })),
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
app.get('/tools/get_document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    const result = await request
      .input('id', sql.Int, id)
      .query(`
        SELECT id, title, content, classification, metadata, file_name, created_at, updated_at
        FROM documents
        WHERE id = @id AND status = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = result.recordset[0];
    document.metadata = document.metadata ? JSON.parse(document.metadata) : {};

    res.json({
      document,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update document
app.post('/tools/update_document', async (req, res) => {
  try {
    const { document_id, title, content, category, tags } = req.body;
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }
    
    const request = pool.request();
    const result = await request
      .input('id', sql.Int, document_id)
      .input('title', sql.NVarChar, title)
      .input('content', sql.NVarChar, content)
      .input('classification', sql.NVarChar, category)
      .input('metadata', sql.NVarChar, JSON.stringify({ tags: tags || [] }))
      .query(`
        UPDATE documents 
        SET title = @title, content = @content, classification = @classification, 
            metadata = @metadata, updated_at = GETUTCDATE()
        WHERE id = @id
      `);

    res.json({
      message: 'Document updated successfully',
      rows_affected: result.rowsAffected[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get database statistics
app.get('/tools/get_stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(DISTINCT classification) as unique_categories,
        AVG(LEN(content)) as avg_content_length,
        MAX(created_at) as latest_document
      FROM documents
      WHERE status = 1
    `);

    res.json({
      stats: result.recordset[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get stats error:', error);
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
    console.log(`Azure SQL MCP Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /tools');
    console.log('  POST /tools/store_document');
    console.log('  POST /tools/search_documents');
    console.log('  GET  /tools/get_document/:id');
    console.log('  POST /tools/update_document');
    console.log('  GET  /tools/get_stats');
  });
});
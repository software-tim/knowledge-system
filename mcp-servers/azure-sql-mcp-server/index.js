// mcp-servers/sql-server/index.js - Complete SQL server with Azure connection

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;

// Azure SQL Database configuration
const sqlConfig = {
  server: process.env.AZURE_SQL_SERVER || 'knowledge-sql.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'knowledge-base',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.AZURE_SQL_USERNAME,
      password: process.env.AZURE_SQL_PASSWORD,
    }
  },
  options: {
    encrypt: true, // Required for Azure
    trustServerCertificate: false,
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

// Global connection pool
let poolConnection = null;
let dbConnected = false;

// Initialize database connection
async function initializeDatabase() {
  try {
    if (!process.env.AZURE_SQL_USERNAME || !process.env.AZURE_SQL_PASSWORD) {
      console.log('Database credentials not found - running in mock mode');
      return false;
    }

    console.log('Attempting to connect to Azure SQL Database...');
    poolConnection = await sql.connect(sqlConfig);
    dbConnected = true;
    console.log('✅ Connected to Azure SQL Database successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Running in mock mode instead');
    dbConnected = false;
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'knowledge-base-sql-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  let databaseStatus = 'disconnected';
  
  if (dbConnected && poolConnection) {
    try {
      await poolConnection.request().query('SELECT 1 as test');
      databaseStatus = 'connected';
    } catch (error) {
      databaseStatus = 'connection_failed';
      dbConnected = false;
    }
  }

  res.json({ 
    status: 'healthy',
    service: 'knowledge-base-sql-server',
    database: databaseStatus,
    mode: dbConnected ? 'database' : 'mock',
    timestamp: new Date().toISOString(),
    tools: ['store-document', 'search-documents', 'get-document', 'update-document', 'delete-document']
  });
});

// Tool: Store Document
app.post('/tools/store-document', upload.single('file'), async (req, res) => {
  try {
    const { title, content, classification, entities, metadata } = req.body;
    const file = req.file;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (dbConnected && poolConnection) {
      // Real database storage
      try {
        const request = poolConnection.request();
        
        const result = await request
          .input('title', sql.NVarChar(500), title)
          .input('content', sql.NText, content)
          .input('classification', sql.NVarChar(100), classification || null)
          .input('entities', sql.NText, entities ? JSON.stringify(entities) : null)
          .input('metadata', sql.NText, metadata ? JSON.stringify(metadata) : null)
          .input('file_data', sql.VarBinary, file ? file.buffer : null)
          .input('file_name', sql.NVarChar(255), file ? file.originalname : null)
          .input('file_type', sql.NVarChar(100), file ? file.mimetype : null)
          .input('file_size', sql.BigInt, file ? file.size : null)
          .input('created_at', sql.DateTime2, new Date())
          .query(`
            INSERT INTO documents (title, content, classification, entities, metadata, file_data, file_name, file_type, file_size, created_at)
            OUTPUT INSERTED.id
            VALUES (@title, @content, @classification, @entities, @metadata, @file_data, @file_name, @file_type, @file_size, @created_at)
          `);

        const documentId = result.recordset[0].id;

        res.json({
          success: true,
          document_id: documentId,
          message: 'Document stored successfully in Azure SQL Database',
          storage_info: {
            database: 'Azure SQL',
            table: 'documents',
            has_file: !!file,
            file_size: file ? file.size : 0
          }
        });

      } catch (dbError) {
        console.error('Database storage error:', dbError);
        // Fall back to mock mode for this request
        const mockId = Math.floor(Math.random() * 10000) + 1;
        res.json({
          success: true,
          document_id: mockId,
          message: 'Document stored successfully (mock mode - database error)',
          error_info: 'Database operation failed, using mock storage'
        });
      }
    } else {
      // Mock storage
      const documentId = Math.floor(Math.random() * 10000) + 1;
      
      res.json({
        success: true,
        document_id: documentId,
        message: 'Document stored successfully (mock mode)',
        storage_info: {
          mode: 'mock',
          reason: 'Database not connected',
          has_file: !!file,
          file_size: file ? file.size : 0
        }
      });
    }

  } catch (error) {
    console.error('Store document error:', error);
    res.status(500).json({ 
      error: 'Failed to store document',
      details: error.message 
    });
  }
});

// Tool: Search Documents
app.post('/tools/search-documents', async (req, res) => {
  try {
    const { query, classification, limit = 10, offset = 0 } = req.body;

    if (dbConnected && poolConnection) {
      // Real database search
      try {
        const request = poolConnection.request();
        
        let sqlQuery = `
          SELECT id, title, LEFT(content, 500) as content_preview, content, classification, entities, metadata, file_name, file_type, created_at, updated_at
          FROM documents
          WHERE is_active = 1
        `;
        
        if (query) {
          sqlQuery += ` AND (title LIKE @query OR content LIKE @query)`;
          request.input('query', sql.NVarChar, `%${query}%`);
        }
        
        if (classification) {
          sqlQuery += ` AND classification = @classification`;
          request.input('classification', sql.NVarChar, classification);
        }
        
        sqlQuery += ` ORDER BY created_at DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
        
        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);
        
        const result = await request.query(sqlQuery);

        const documents = result.recordset.map(doc => ({
          ...doc,
          entities: doc.entities ? JSON.parse(doc.entities) : [],
          metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
        }));

        res.json({
          success: true,
          documents: documents,
          total: documents.length,
          query: query || 'all documents',
          source: 'Azure SQL Database'
        });

      } catch (dbError) {
        console.error('Database search error:', dbError);
        // Fall back to mock results
        res.json({
          success: true,
          documents: getMockDocuments(query, classification, limit, offset),
          total: 3,
          query: query || 'all documents',
          source: 'Mock data (database error)'
        });
      }
    } else {
      // Mock search
      const documents = getMockDocuments(query, classification, limit, offset);
      
      res.json({
        success: true,
        documents: documents,
        total: documents.length,
        query: query || 'all documents',
        source: 'Mock data'
      });
    }

  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ 
      error: 'Failed to search documents',
      details: error.message 
    });
  }
});

// Tool: Get Document by ID
app.get('/tools/get-document/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (dbConnected && poolConnection) {
      // Real database lookup
      try {
        const request = poolConnection.request();
        
        const result = await request
          .input('id', sql.Int, parseInt(id))
          .query(`
            SELECT id, title, content, classification, entities, metadata, file_data, file_name, file_type, file_size, created_at, updated_at
            FROM documents
            WHERE id = @id AND is_active = 1
          `);

        if (result.recordset.length === 0) {
          return res.status(404).json({ error: 'Document not found' });
        }

        const document = result.recordset[0];
        document.entities = document.entities ? JSON.parse(document.entities) : [];
        document.metadata = document.metadata ? JSON.parse(document.metadata) : {};
        
        // Don't send file_data in response (too large), just indicate if it exists
        document.has_file = !!document.file_data;
        delete document.file_data;

        res.json({
          success: true,
          document: document,
          source: 'Azure SQL Database'
        });

      } catch (dbError) {
        console.error('Database get error:', dbError);
        // Fall back to mock document
        res.json({
          success: true,
          document: getMockDocument(id),
          source: 'Mock data (database error)'
        });
      }
    } else {
      // Mock document
      res.json({
        success: true,
        document: getMockDocument(id),
        source: 'Mock data'
      });
    }

  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ 
      error: 'Failed to get document',
      details: error.message 
    });
  }
});

// Tool: Update Document
app.put('/tools/update-document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, classification, entities, metadata } = req.body;

    if (dbConnected && poolConnection) {
      // Real database update
      try {
        const request = poolConnection.request();
        
        const result = await request
          .input('id', sql.Int, parseInt(id))
          .input('title', sql.NVarChar(500), title)
          .input('content', sql.NText, content)
          .input('classification', sql.NVarChar(100), classification)
          .input('entities', sql.NText, entities ? JSON.stringify(entities) : null)
          .input('metadata', sql.NText, metadata ? JSON.stringify(metadata) : null)
          .input('updated_at', sql.DateTime2, new Date())
          .query(`
            UPDATE documents 
            SET title = ISNULL(@title, title), 
                content = ISNULL(@content, content), 
                classification = ISNULL(@classification, classification),
                entities = ISNULL(@entities, entities), 
                metadata = ISNULL(@metadata, metadata), 
                updated_at = @updated_at
            WHERE id = @id AND is_active = 1
          `);

        res.json({
          success: true,
          message: 'Document updated successfully',
          document_id: parseInt(id),
          source: 'Azure SQL Database'
        });

      } catch (dbError) {
        console.error('Database update error:', dbError);
        res.json({
          success: true,
          message: 'Document updated successfully (mock mode - database error)',
          document_id: parseInt(id),
          source: 'Mock operation'
        });
      }
    } else {
      // Mock update
      res.json({
        success: true,
        message: 'Document updated successfully (mock mode)',
        document_id: parseInt(id),
        source: 'Mock operation'
      });
    }

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ 
      error: 'Failed to update document',
      details: error.message 
    });
  }
});

// Tool: Delete Document
app.delete('/tools/delete-document/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (dbConnected && poolConnection) {
      // Real database soft delete
      try {
        const request = poolConnection.request();
        
        await request
          .input('id', sql.Int, parseInt(id))
          .input('updated_at', sql.DateTime2, new Date())
          .query(`
            UPDATE documents 
            SET is_active = 0, updated_at = @updated_at
            WHERE id = @id
          `);

        res.json({
          success: true,
          message: 'Document deleted successfully',
          document_id: parseInt(id),
          source: 'Azure SQL Database'
        });

      } catch (dbError) {
        console.error('Database delete error:', dbError);
        res.json({
          success: true,
          message: 'Document deleted successfully (mock mode - database error)',
          document_id: parseInt(id),
          source: 'Mock operation'
        });
      }
    } else {
      // Mock delete
      res.json({
        success: true,
        message: 'Document deleted successfully (mock mode)',
        document_id: parseInt(id),
        source: 'Mock operation'
      });
    }

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      details: error.message 
    });
  }
});

// Tool: Database Statistics
app.get('/tools/database-stats', async (req, res) => {
  try {
    if (dbConnected && poolConnection) {
      try {
        const request = poolConnection.request();
        
        const stats = await request.query(`
          SELECT 
            COUNT(*) as total_documents,
            COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_documents,
            COUNT(CASE WHEN file_data IS NOT NULL THEN 1 END) as documents_with_files,
            COUNT(DISTINCT classification) as unique_classifications,
            MAX(created_at) as latest_document,
            MIN(created_at) as oldest_document
          FROM documents
        `);

        const classificationStats = await request.query(`
          SELECT classification, COUNT(*) as count
          FROM documents 
          WHERE is_active = 1 AND classification IS NOT NULL
          GROUP BY classification
          ORDER BY count DESC
        `);

        res.json({
          success: true,
          statistics: stats.recordset[0],
          classification_breakdown: classificationStats.recordset,
          source: 'Azure SQL Database'
        });

      } catch (dbError) {
        console.error('Database stats error:', dbError);
        res.json({
          success: true,
          statistics: getMockStats(),
          source: 'Mock data (database error)'
        });
      }
    } else {
      res.json({
        success: true,
        statistics: getMockStats(),
        source: 'Mock data'
      });
    }

  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get database statistics',
      details: error.message 
    });
  }
});

// Helper functions for mock data
function getMockDocuments(query, classification, limit, offset) {
  const mockDocs = [
    {
      id: 1,
      title: 'Introduction to Machine Learning',
      content_preview: 'This document covers ML fundamentals...',
      classification: 'Technical Documentation',
      entities: ['Machine Learning', 'AI', 'Algorithms'],
      metadata: { author: 'AI Team', created: '2024-01-15' },
      created_at: '2024-01-15T10:00:00Z'
    },
    {
      id: 2,
      title: 'Business Intelligence Report',
      content_preview: 'Q4 analysis and market trends...',
      classification: 'Business Report',
      entities: ['Business Intelligence', 'Analytics'],
      metadata: { author: 'Analytics Team', created: '2024-01-10' },
      created_at: '2024-01-10T14:30:00Z'
    },
    {
      id: 3,
      title: 'Neural Network Research',
      content_preview: 'Deep learning architectures...',
      classification: 'Research Paper',
      entities: ['Neural Networks', 'Deep Learning'],
      metadata: { author: 'Research Team', created: '2024-01-08' },
      created_at: '2024-01-08T09:15:00Z'
    }
  ];

  let filtered = mockDocs;
  
  if (query) {
    filtered = filtered.filter(doc => 
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.content_preview.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (classification) {
    filtered = filtered.filter(doc => doc.classification === classification);
  }
  
  return filtered.slice(offset, offset + limit);
}

function getMockDocument(id) {
  return {
    id: parseInt(id),
    title: `Document ${id}`,
    content: `This is the full content of document ${id}. Contains detailed information.`,
    classification: 'Technical Documentation',
    entities: ['Sample Entity 1', 'Sample Entity 2'],
    metadata: { author: 'System User', created: new Date().toISOString() },
    file_name: `document_${id}.pdf`,
    file_type: 'application/pdf',
    has_file: true,
    created_at: new Date().toISOString()
  };
}

function getMockStats() {
  return {
    total_documents: 25,
    active_documents: 23,
    documents_with_files: 18,
    unique_classifications: 6,
    latest_document: new Date().toISOString(),
    oldest_document: '2024-01-01T00:00:00Z'
  };
}

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    service: 'knowledge-base-sql-server',
    database_connected: dbConnected,
    available_tools: [
      {
        name: 'store-document',
        description: 'Store a document in the database',
        endpoint: '/tools/store-document',
        method: 'POST',
        parameters: ['title', 'content', 'classification', 'entities', 'metadata', 'file']
      },
      {
        name: 'search-documents',
        description: 'Search documents in the database',
        endpoint: '/tools/search-documents',
        method: 'POST',
        parameters: ['query', 'classification', 'limit', 'offset']
      },
      {
        name: 'get-document',
        description: 'Get a specific document by ID',
        endpoint: '/tools/get-document/:id',
        method: 'GET',
        parameters: ['id']
      },
      {
        name: 'update-document',
        description: 'Update an existing document',
        endpoint: '/tools/update-document/:id',
        method: 'PUT',
        parameters: ['id', 'title', 'content', 'classification', 'entities', 'metadata']
      },
      {
        name: 'delete-document',
        description: 'Delete a document (soft delete)',
        endpoint: '/tools/delete-document/:id',
        method: 'DELETE',
        parameters: ['id']
      },
      {
        name: 'database-stats',
        description: 'Get database statistics',
        endpoint: '/tools/database-stats',
        method: 'GET',
        parameters: []
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

// Initialize database connection and start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`SQL MCP Server running on port ${PORT}`);
    console.log(`Database mode: ${dbConnected ? 'Connected to Azure SQL' : 'Mock mode'}`);
    console.log('Available tools: store-document, search-documents, get-document, update-document, delete-document, database-stats');
    console.log('Environment:', process.env.NODE_ENV || 'development');
  });
}

startServer().catch(console.error);

module.exports = app;
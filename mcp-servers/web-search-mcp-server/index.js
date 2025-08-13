// mcp-servers/search-server/server.js - Complete version with tools

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
    service: 'knowledge-base-search-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'knowledge-base-search-server',
    search_service: 'mock mode - no Azure Search required',
    timestamp: new Date().toISOString(),
    tools: ['semantic-search', 'vector-search', 'index-document', 'keyword-search']
  });
});

// Mock document database for search testing
const mockDocuments = [
  {
    id: '1',
    title: 'Introduction to Machine Learning',
    content: 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions without explicit programming. This comprehensive guide covers supervised learning, unsupervised learning, and reinforcement learning techniques.',
    classification: 'Technical Documentation',
    metadata: { author: 'AI Research Team', created: '2024-01-15', tags: ['ML', 'AI', 'Education'] },
    indexed_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    title: 'Azure AI Services Overview',
    content: 'Microsoft Azure provides comprehensive AI services including Cognitive Services, Machine Learning Studio, and Bot Framework. This document covers implementation patterns, pricing models, and integration strategies for enterprise applications.',
    classification: 'Product Documentation',
    metadata: { author: 'Microsoft Team', created: '2024-01-12', tags: ['Azure', 'Cloud', 'AI Services'] },
    indexed_at: '2024-01-12T14:30:00Z'
  },
  {
    id: '3',
    title: 'Deep Learning Neural Networks Research',
    content: 'Advanced research on convolutional neural networks, recurrent neural networks, and transformer architectures. Includes training methodologies, optimization techniques, and practical applications in computer vision and natural language processing.',
    classification: 'Research Paper',
    metadata: { author: 'Research Lab', created: '2024-01-10', tags: ['Deep Learning', 'Neural Networks', 'Research'] },
    indexed_at: '2024-01-10T09:15:00Z'
  },
  {
    id: '4',
    title: 'Business Intelligence Q4 Report',
    content: 'Quarterly analysis of market trends, revenue growth, and competitive landscape. Key findings include 25% increase in AI adoption across enterprise clients and emerging opportunities in healthcare and finance sectors.',
    classification: 'Business Report',
    metadata: { author: 'Analytics Team', created: '2024-01-08', tags: ['Business', 'Analytics', 'Q4'] },
    indexed_at: '2024-01-08T16:45:00Z'
  },
  {
    id: '5',
    title: 'Natural Language Processing Best Practices',
    content: 'Comprehensive guide to NLP implementation including text preprocessing, feature extraction, model selection, and evaluation metrics. Covers popular libraries like NLTK, spaCy, and Transformers with practical examples.',
    classification: 'Technical Guide',
    metadata: { author: 'NLP Team', created: '2024-01-05', tags: ['NLP', 'Text Processing', 'Best Practices'] },
    indexed_at: '2024-01-05T11:20:00Z'
  }
];

// Tool: Semantic Search
app.post('/tools/semantic-search', async (req, res) => {
  try {
    const { query, filters = {}, top = 10, skip = 0 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    // Semantic search simulation
    const queryLower = query.toLowerCase();
    let searchResults = mockDocuments.map(doc => {
      let score = 0;
      
      // Title matching (highest weight)
      if (doc.title.toLowerCase().includes(queryLower)) {
        score += 0.8;
      }
      
      // Content matching
      if (doc.content.toLowerCase().includes(queryLower)) {
        score += 0.6;
      }
      
      // Classification matching
      if (doc.classification.toLowerCase().includes(queryLower)) {
        score += 0.4;
      }
      
      // Tags matching
      if (doc.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 0.5;
      }
      
      // Semantic similarity simulation (mock)
      const semanticTerms = {
        'ai': ['artificial intelligence', 'machine learning', 'neural network', 'deep learning'],
        'ml': ['machine learning', 'artificial intelligence', 'algorithms', 'training'],
        'nlp': ['natural language processing', 'text processing', 'language model'],
        'business': ['report', 'analytics', 'revenue', 'market', 'enterprise'],
        'research': ['study', 'analysis', 'methodology', 'findings']
      };
      
      Object.entries(semanticTerms).forEach(([key, synonyms]) => {
        if (queryLower.includes(key)) {
          synonyms.forEach(synonym => {
            if (doc.content.toLowerCase().includes(synonym) || doc.title.toLowerCase().includes(synonym)) {
              score += 0.3;
            }
          });
        }
      });
      
      return { ...doc, score: Math.min(score, 1.0) };
    });

    // Apply filters
    if (filters.classification) {
      searchResults = searchResults.filter(doc => 
        doc.classification === filters.classification
      );
    }

    if (filters.date_from) {
      searchResults = searchResults.filter(doc => 
        new Date(doc.metadata.created) >= new Date(filters.date_from)
      );
    }

    // Sort by score and apply pagination
    searchResults = searchResults
      .filter(doc => doc.score > 0.1) // Only include relevant results
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + top);

    res.json({
      success: true,
      query: query,
      results: searchResults,
      total: searchResults.length,
      facets: {
        classification: [
          { value: 'Technical Documentation', count: 2 },
          { value: 'Research Paper', count: 1 },
          { value: 'Business Report', count: 1 },
          { value: 'Product Documentation', count: 1 }
        ]
      },
      processing_time: Math.random() * 0.5 + 0.2
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ 
      error: 'Failed to perform semantic search',
      details: error.message 
    });
  }
});

// Tool: Vector Search
app.post('/tools/vector-search', async (req, res) => {
  try {
    const { query, vector, top = 10, similarity_threshold = 0.7 } = req.body;

    if (!query && !vector) {
      return res.status(400).json({ error: 'Query or vector is required' });
    }

    // Simulate vector search processing
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 600));

    // Mock vector search results with similarity scores
    const vectorResults = mockDocuments.map(doc => ({
      ...doc,
      similarity_score: Math.random() * 0.4 + 0.6 // Random scores between 0.6-1.0
    }))
    .filter(doc => doc.similarity_score >= similarity_threshold)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, top);

    res.json({
      success: true,
      query: query || 'vector_query',
      results: vectorResults,
      similarity_scores: vectorResults.map(r => r.similarity_score),
      threshold_used: similarity_threshold,
      vector_dimensions: vector ? vector.length : 1536 // Default OpenAI embedding size
    });

  } catch (error) {
    console.error('Vector search error:', error);
    res.status(500).json({ 
      error: 'Failed to perform vector search',
      details: error.message 
    });
  }
});

// Tool: Index Document
app.post('/tools/index-document', async (req, res) => {
  try {
    const { document_id, title, content, metadata, embeddings } = req.body;

    if (!document_id || !content) {
      return res.status(400).json({ error: 'Document ID and content are required' });
    }

    // Simulate indexing processing
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

    // Mock indexing operation
    const indexedDocument = {
      id: document_id,
      title: title || `Document ${document_id}`,
      content: content,
      metadata: metadata || {},
      embeddings: embeddings || null,
      indexed_at: new Date().toISOString(),
      index_status: 'success'
    };

    console.log(`Indexed document ${document_id}: ${title}`);

    res.json({
      success: true,
      document_id: document_id,
      indexed: true,
      index_info: {
        content_length: content.length,
        has_embeddings: !!embeddings,
        index_timestamp: indexedDocument.indexed_at
      }
    });

  } catch (error) {
    console.error('Index document error:', error);
    res.status(500).json({ 
      error: 'Failed to index document',
      details: error.message 
    });
  }
});

// Tool: Keyword Search
app.post('/tools/keyword-search', async (req, res) => {
  try {
    const { query, exact_match = false, top = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Simulate keyword search processing
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

    const queryTerms = query.toLowerCase().split(' ');
    
    let keywordResults = mockDocuments.map(doc => {
      let matchCount = 0;
      let totalMatches = 0;
      
      queryTerms.forEach(term => {
        const titleMatches = (doc.title.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        const contentMatches = (doc.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
        
        if (titleMatches > 0 || contentMatches > 0) {
          matchCount++;
          totalMatches += titleMatches * 3 + contentMatches; // Weight title matches higher
        }
      });

      const score = exact_match 
        ? (matchCount === queryTerms.length ? 1.0 : 0.0)
        : matchCount / queryTerms.length;

      return { 
        ...doc, 
        score,
        match_count: matchCount,
        total_matches: totalMatches
      };
    })
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.total_matches - a.total_matches)
    .slice(0, top);

    res.json({
      success: true,
      query: query,
      exact_match: exact_match,
      results: keywordResults,
      query_terms: queryTerms,
      total_found: keywordResults.length
    });

  } catch (error) {
    console.error('Keyword search error:', error);
    res.status(500).json({ 
      error: 'Failed to perform keyword search',
      details: error.message 
    });
  }
});

// Tool: Search Analytics
app.get('/tools/search-analytics', async (req, res) => {
  try {
    // Mock search analytics data
    const analytics = {
      total_documents_indexed: mockDocuments.length,
      total_searches_today: Math.floor(Math.random() * 100) + 50,
      avg_response_time_ms: Math.random() * 200 + 100,
      popular_queries: [
        { query: 'machine learning', count: 15 },
        { query: 'artificial intelligence', count: 12 },
        { query: 'neural networks', count: 8 },
        { query: 'business report', count: 6 },
        { query: 'azure services', count: 5 }
      ],
      search_types_distribution: {
        semantic: 65,
        keyword: 25,
        vector: 10
      }
    };

    res.json({
      success: true,
      analytics: analytics,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to get search analytics',
      details: error.message 
    });
  }
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    service: 'knowledge-base-search-server',
    available_tools: [
      {
        name: 'semantic-search',
        description: 'Semantic search using AI understanding',
        endpoint: '/tools/semantic-search',
        method: 'POST',
        parameters: ['query', 'filters', 'top', 'skip']
      },
      {
        name: 'vector-search',
        description: 'Vector-based similarity search',
        endpoint: '/tools/vector-search',
        method: 'POST',
        parameters: ['query', 'vector', 'top', 'similarity_threshold']
      },
      {
        name: 'keyword-search',
        description: 'Traditional keyword-based search',
        endpoint: '/tools/keyword-search',
        method: 'POST',
        parameters: ['query', 'exact_match', 'top']
      },
      {
        name: 'index-document',
        description: 'Index a document for search',
        endpoint: '/tools/index-document',
        method: 'POST',
        parameters: ['document_id', 'title', 'content', 'metadata', 'embeddings']
      },
      {
        name: 'search-analytics',
        description: 'Get search usage analytics',
        endpoint: '/tools/search-analytics',
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

// Start server
app.listen(PORT, () => {
  console.log(`Search MCP Server running on port ${PORT}`);
  console.log('Available tools: semantic-search, vector-search, keyword-search, index-document, search-analytics');
  console.log('Running with mock data - no external search service required');
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
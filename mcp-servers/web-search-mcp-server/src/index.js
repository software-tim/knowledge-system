// mcp-servers/web-search-mcp-server/src/index.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const sql = require('mssql');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuration
const BING_SEARCH_KEY = process.env.BING_SEARCH_API_KEY;
const BING_SEARCH_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

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
    console.log('Web Search MCP Server connected to Azure SQL Database');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'web-search-mcp-server',
    timestamp: new Date().toISOString()
  });
});

// List available tools
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'web_search',
        description: 'Search the web using Bing Search API',
        parameters: {
          query: { type: 'string', required: true },
          count: { type: 'number', required: false, default: 10 },
          offset: { type: 'number', required: false, default: 0 },
          market: { type: 'string', required: false, default: 'en-US' },
          safe_search: { type: 'string', required: false, default: 'Moderate' }
        }
      },
      {
        name: 'news_search',
        description: 'Search for news articles',
        parameters: {
          query: { type: 'string', required: true },
          count: { type: 'number', required: false, default: 10 },
          market: { type: 'string', required: false, default: 'en-US' },
          sort_by: { type: 'string', required: false, default: 'Date' }
        }
      },
      {
        name: 'fetch_url_content',
        description: 'Fetch and extract content from a URL',
        parameters: {
          url: { type: 'string', required: true },
          extract_text: { type: 'boolean', required: false, default: true }
        }
      },
      {
        name: 'search_and_summarize',
        description: 'Search and provide a summary of results',
        parameters: {
          query: { type: 'string', required: true },
          count: { type: 'number', required: false, default: 5 },
          summarize_content: { type: 'boolean', required: false, default: true }
        }
      },
      {
        name: 'search_analytics',
        description: 'Get search usage analytics',
        parameters: {}
      }
    ]
  });
});

// Perform web search using Bing Search API
app.post('/tools/web_search', async (req, res) => {
  try {
    const { query, count = 10, offset = 0, market = 'en-US', safe_search = 'Moderate' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let searchResults;
    const startTime = Date.now();

    if (BING_SEARCH_KEY) {
      // Use real Bing Search API
      const searchUrl = new URL(BING_SEARCH_ENDPOINT);
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('count', count.toString());
      searchUrl.searchParams.append('offset', offset.toString());
      searchUrl.searchParams.append('mkt', market);
      searchUrl.searchParams.append('safeSearch', safe_search);

      const response = await axios.get(searchUrl.toString(), {
        headers: {
          'Ocp-Apim-Subscription-Key': BING_SEARCH_KEY,
          'Accept': 'application/json'
        }
      });

      searchResults = response.data;
    } else {
      // Simulate search results if no API key
      searchResults = simulateSearchResults(query, count);
    }

    const executionTime = Date.now() - startTime;

    // Log search query for analytics
    if (pool) {
      try {
        const request = pool.request();
        await request
          .input('query_text', sql.NVarChar, query)
          .input('results_count', sql.Int, searchResults.webPages?.value?.length || searchResults.results?.length || 0)
          .input('execution_time_ms', sql.Int, executionTime)
          .query(`
            INSERT INTO search_queries (query_text, results_count, execution_time_ms)
            VALUES (@query_text, @results_count, @execution_time_ms)
          `);
      } catch (dbError) {
        console.error('Failed to log search query:', dbError);
      }
    }

    // Format results
    const formattedResults = {
      query,
      totalEstimatedMatches: searchResults.webPages?.totalEstimatedMatches || searchResults.total || 0,
      results: (searchResults.webPages?.value || searchResults.results || []).map(result => ({
        title: result.name || result.title,
        url: result.url,
        snippet: result.snippet || result.description,
        displayUrl: result.displayUrl || result.url,
        dateLastCrawled: result.dateLastCrawled || new Date().toISOString()
      })),
      executionTime,
      timestamp: new Date().toISOString()
    };

    res.json(formattedResults);
  } catch (error) {
    console.error('Web search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search for news articles
app.post('/tools/news_search', async (req, res) => {
  try {
    const { query, count = 10, market = 'en-US', sort_by = 'Date' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let newsResults;

    if (BING_SEARCH_KEY) {
      const searchUrl = new URL('https://api.bing.microsoft.com/v7.0/news/search');
      searchUrl.searchParams.append('q', query);
      searchUrl.searchParams.append('count', count.toString());
      searchUrl.searchParams.append('mkt', market);
      searchUrl.searchParams.append('sortBy', sort_by);

      const response = await axios.get(searchUrl.toString(), {
        headers: {
          'Ocp-Apim-Subscription-Key': BING_SEARCH_KEY,
          'Accept': 'application/json'
        }
      });

      newsResults = response.data;
    } else {
      // Simulate news results
      newsResults = simulateNewsResults(query, count);
    }

    const formattedResults = {
      query,
      results: (newsResults.value || newsResults.articles || []).map(article => ({
        title: article.name || article.title,
        url: article.url,
        description: article.description,
        provider: article.provider?.[0]?.name || article.source || 'Unknown',
        datePublished: article.datePublished || article.publishedAt,
        category: article.category || 'General',
        image: article.image?.thumbnail?.contentUrl || article.urlToImage
      })),
      timestamp: new Date().toISOString()
    };

    res.json(formattedResults);
  } catch (error) {
    console.error('News search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch and extract content from a URL
app.post('/tools/fetch_url_content', async (req, res) => {
  try {
    const { url, extract_text = true } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || '';
    let content = response.data;

    if (extract_text && contentType.includes('text/html')) {
      // Basic HTML text extraction (remove tags)
      content = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    res.json({
      url,
      contentType,
      content: content.substring(0, 10000), // Limit content size
      contentLength: content.length,
      extracted: extract_text,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fetch URL content error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search and summarize results
app.post('/tools/search_and_summarize', async (req, res) => {
  try {
    const { query, count = 5, summarize_content = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Perform the search first
    const searchResults = await performWebSearch(query, count);
    
    if (!searchResults.results || searchResults.results.length === 0) {
      return res.json({
        query,
        summary: 'No search results found',
        results: [],
        timestamp: new Date().toISOString()
      });
    }

    let summary = `Found ${searchResults.results.length} results for "${query}":\n\n`;
    
    if (summarize_content) {
      // Create a summary from the snippets
      const snippets = searchResults.results.map(result => result.snippet).join(' ');
      
      // Basic summarization - extract key sentences
      const sentences = snippets.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const keySentences = sentences.slice(0, 3).map(s => s.trim()).join('. ');
      
      summary += `Summary: ${keySentences}.\n\n`;
    }

    summary += 'Top Results:\n';
    searchResults.results.forEach((result, index) => {
      summary += `${index + 1}. ${result.title}\n   ${result.url}\n   ${result.snippet}\n\n`;
    });

    res.json({
      query,
      summary,
      results: searchResults.results,
      totalEstimatedMatches: searchResults.totalEstimatedMatches,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search and summarize error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get search analytics
app.get('/tools/search_analytics', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        COUNT(*) as total_searches,
        AVG(CAST(results_count as FLOAT)) as avg_results_per_search,
        AVG(CAST(execution_time_ms as FLOAT)) as avg_execution_time_ms,
        MAX(created_at) as latest_search
      FROM search_queries
      WHERE created_at >= DATEADD(day, -30, GETUTCDATE())
    `);

    const topQueries = await request.query(`
      SELECT TOP 5 query_text, COUNT(*) as frequency 
      FROM search_queries 
      WHERE created_at >= DATEADD(day, -30, GETUTCDATE())
      GROUP BY query_text 
      ORDER BY COUNT(*) DESC
    `);

    const analytics = result.recordset[0];
    analytics.top_queries = topQueries.recordset;

    res.json({
      analytics,
      period: 'Last 30 days',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to perform web search
async function performWebSearch(query, count) {
  // This calls the web_search endpoint internally
  const searchUrl = `http://localhost:${PORT}/tools/web_search`;
  try {
    const response = await axios.post(searchUrl, { query, count });
    return response.data;
  } catch (error) {
    // Fallback to simulation
    return simulateSearchResults(query, count);
  }
}

// Simulate search results (fallback when no API key)
function simulateSearchResults(query, count) {
  const results = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    results.push({
      title: `Sample Result ${i + 1} for "${query}"`,
      url: `https://example.com/result-${i + 1}`,
      snippet: `This is a sample search result snippet for the query "${query}". It contains relevant information about the topic.`,
      displayUrl: `example.com/result-${i + 1}`,
      dateLastCrawled: new Date().toISOString()
    });
  }
  
  return {
    total: count * 10,
    results
  };
}

// Simulate news results
function simulateNewsResults(query, count) {
  const articles = [];
  for (let i = 0; i < Math.min(count, 3); i++) {
    articles.push({
      title: `Breaking News: ${query} Update ${i + 1}`,
      url: `https://news-example.com/article-${i + 1}`,
      description: `Latest news about ${query}. This is a sample news article description.`,
      source: `News Source ${i + 1}`,
      publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
      category: 'Technology'
    });
  }
  
  return { articles };
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
    console.log(`Web Search MCP Server running on port ${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  GET  /tools');
    console.log('  POST /tools/web_search');
    console.log('  POST /tools/news_search');
    console.log('  POST /tools/fetch_url_content');
    console.log('  POST /tools/search_and_summarize');
    console.log('  GET  /tools/search_analytics');
  });
});
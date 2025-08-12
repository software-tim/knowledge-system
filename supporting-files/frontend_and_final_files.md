# Frontend & Final Repository Files

## Astro Frontend

**frontend/package.json:**
```json
{
  "name": "knowledge-system-ui",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "@astrojs/node": "^7.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**frontend/astro.config.mjs:**
```javascript
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'static',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000
  }
});
```

**frontend/tsconfig.json:**
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

**frontend/src/layouts/Layout.astro:**
```astro
---
export interface Props {
  title: string;
}

const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="AI-Powered Knowledge Management System" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #f5f5f5;
        line-height: 1.6;
        color: #1f2937;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      .nav {
        margin-bottom: 2rem;
        padding: 1rem 0;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .nav a {
        color: #3b82f6;
        text-decoration: none;
        margin-right: 1.5rem;
        font-weight: 500;
        transition: color 0.2s;
      }
      
      .nav a:hover {
        color: #2563eb;
        text-decoration: underline;
      }
      
      .nav a.active {
        color: #1d4ed8;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <nav class="nav">
        <a href="/">Dashboard</a>
        <a href="/upload">Upload Document</a>
        <a href="/search">Search Knowledge</a>
      </nav>
      <main>
        <slot />
      </main>
    </div>
  </body>
</html>
```

**frontend/src/pages/index.astro:**
```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Knowledge System Dashboard">
  <div class="dashboard">
    <h1>AI Knowledge Management System</h1>
    <p class="subtitle">Your intelligent document processing and knowledge discovery platform</p>

    <div class="status-grid" id="server-status">
      <div class="status-card">
        <h3>System Status</h3>
        <div class="loading">Checking server status...</div>
      </div>
    </div>

    <div class="quick-actions">
      <h2>Quick Actions</h2>
      <div class="action-grid">
        <a href="/upload" class="action-card">
          <h3>📄 Upload Document</h3>
          <p>Add new documents to your knowledge base with AI processing</p>
        </a>
        <a href="/search" class="action-card">
          <h3>🔍 Search Knowledge</h3>
          <p>Find insights and information using semantic search</p>
        </a>
        <div class="action-card" onclick="testSystem()">
          <h3>🧪 Test System</h3>
          <p>Run a quick test of all MCP servers and connections</p>
        </div>
      </div>
    </div>

    <div class="features">
      <h2>System Features</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <h4>🤖 AI Classification</h4>
          <p>Automatic content categorization and tagging using advanced AI models</p>
        </div>
        <div class="feature-card">
          <h4>🗄️ Smart Storage</h4>
          <p>Secure document storage with metadata and file management</p>
        </div>
        <div class="feature-card">
          <h4>🕸️ Knowledge Graphs</h4>
          <p>Entity extraction and relationship mapping for connected insights</p>
        </div>
        <div class="feature-card">
          <h4>🌐 
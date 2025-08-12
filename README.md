# knowledge-system
A knowledge store and retrieval using PHI4, SQL, GraphRag, and Search MCP servers

### README.md:
# AI Knowledge Management System

A comprehensive AI-powered knowledge management system with document processing, knowledge graph, and intelligent search capabilities.

## Architecture

- **MCP Servers**: Modular services for different AI capabilities
- **Orchestrator**: Central coordinator managing all services
- **Database**: Azure SQL Database for data persistence
- **Frontend**: Astro-based web interface

## Services

1. **Phi4 MCP Server** - AI classification and insights
2. **Azure SQL MCP Server** - Document storage and retrieval
3. **GraphRAG MCP Server** - Knowledge graph management
4. **Web Search MCP Server** - Web search integration
5. **Orchestrator** - Service coordination and workflow management

## Deployment

Automated deployment via GitHub Actions to Azure App Services.

### .gitignore:
node_modules/
*.log
.env
.env.local
.env.production
dist/
.DS_Store
*.tgz
*.tar.gz
.cache/
.vscode/
.idea/
*.swp
*.swo
*~
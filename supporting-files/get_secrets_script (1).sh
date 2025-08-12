#!/bin/bash
# get-secrets.sh - Extracts connection strings and API keys for GitHub secrets

echo "🔑 Getting secrets for GitHub configuration..."
echo ""

# Set variables
RESOURCE_GROUP="mcp-knowledge-system"
AI_FOUNDRY="knowledge-ai-foundry"
STORAGE_ACCOUNT="knowledgestorageacct"

echo "Extracting Azure credentials..."
echo ""

# Get AI Foundry endpoint and key
echo "Getting AI Foundry credentials..."
AI_ENDPOINT=$(az cognitiveservices account show \
  --name $AI_FOUNDRY \
  --resource-group $RESOURCE_GROUP \
  --query properties.endpoint \
  --output tsv)

AI_KEY=$(az cognitiveservices account keys list \
  --name $AI_FOUNDRY \
  --resource-group $RESOURCE_GROUP \
  --query key1 \
  --output tsv)

# Get Storage connection string
echo "Getting Storage credentials..."
STORAGE_CONN=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

echo ""
echo "================================================"
echo "📋 COPY THESE VALUES TO GITHUB SECRETS"
echo "================================================"
echo ""
echo "Go to: https://github.com/software-tim/knowledge-system/settings/secrets/actions"
echo ""
echo "Add these secrets (copy the entire line after the = sign):"
echo ""
echo "AZURE_OPENAI_ENDPOINT=$AI_ENDPOINT"
echo "AZURE_OPENAI_KEY=$AI_KEY"
echo "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONN"
echo "SQL_SERVER=knowledge-sql.database.windows.net"
echo "SQL_DATABASE=knowledge-base"
echo "SQL_USER=mcpadmin"
echo "SQL_PASSWORD=Theodore03$"
echo ""
echo "================================================"
echo "📥 STILL NEEDED (Manual Download):"
echo "================================================"
echo ""
echo "1. Bing Search API Key:"
echo "   - Go to: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api"
echo "   - Sign up and get your API key"
echo "   - Add as: BING_SEARCH_KEY=your-bing-key"
echo ""
echo "2. App Service Publish Profiles:"
echo "   Go to Azure Portal → App Services → Download publish profile for each:"
echo "   - phi4-mcp-server → PHI4_SERVER_PUBLISH_PROFILE"
echo "   - azure-sql-mcp-server → SQL_SERVER_PUBLISH_PROFILE"
echo "   - graphrag-mcp-server → GRAPHRAG_SERVER_PUBLISH_PROFILE"
echo "   - web-search-mcp-server → SEARCH_SERVER_PUBLISH_PROFILE"
echo "   - orchestrator → ORCHESTRATOR_PUBLISH_PROFILE"
echo ""
echo "3. Static Web App Deployment Token:"
echo "   - Go to Azure Portal → Static Web Apps → knowledge-system-ui"
echo "   - Click 'Manage deployment token' → Copy token"
echo "   - Add as: AZURE_STATIC_WEB_APPS_API_TOKEN=your-token"
echo ""
echo "================================================"
echo "✅ Once all secrets are set, push your code to deploy!"
echo "================================================"
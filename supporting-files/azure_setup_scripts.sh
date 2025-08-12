#!/bin/bash
# setup-azure.sh - Creates all Azure resources for the Knowledge System

echo "🚀 Setting up Knowledge System Azure resources in East US 2..."

# Set variables
RESOURCE_GROUP="mcp-knowledge-system"
LOCATION="eastus2"
SQL_SERVER="knowledge-sql"
AI_FOUNDRY="knowledge-ai-foundry"
STORAGE_ACCOUNT="knowledgestorageacct"
STATIC_WEB_APP="knowledge-system-ui"
GITHUB_REPO="https://github.com/software-tim/knowledge-system"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "🔐 Please log in to Azure..."
    az login
fi

echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "🌐 Creating App Service Plan..."
az appservice plan create \
  --name mcp-app-service-plan \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku B1 \
  --is-linux

echo "🗄️ Creating SQL Server and Database..."
az sql server create \
  --name $SQL_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user mcpadmin \
  --admin-password Theodore03$

az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name knowledge-base \
  --service-objective Basic

echo "🤖 Creating AI Foundry..."
az cognitiveservices account create \
  --name $AI_FOUNDRY \
  --resource-group $RESOURCE_GROUP \
  --kind AIServices \
  --sku S0 \
  --location $LOCATION

echo "💾 Creating Storage Account..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

echo "⚙️ Creating App Services..."
for service in phi4-mcp-server azure-sql-mcp-server graphrag-mcp-server web-search-mcp-server orchestrator; do
  echo "Creating $service..."
  az webapp create \
    --name $service \
    --resource-group $RESOURCE_GROUP \
    --plan mcp-app-service-plan \
    --runtime "NODE:18-lts"
done

echo "🌐 Creating Static Web App with GitHub integration..."
az staticwebapp create \
  --name $STATIC_WEB_APP \
  --resource-group $RESOURCE_GROUP \
  --source $GITHUB_REPO \
  --branch main \
  --app-location "/frontend" \
  --output-location "dist"

echo ""
echo "✅ Azure resources created successfully!"
echo ""
echo "📋 Resource Summary:"
echo "==================="
echo "Resource Group: $RESOURCE_GROUP"
echo "SQL Server: $SQL_SERVER.database.windows.net"
echo "AI Foundry: $AI_FOUNDRY"
echo "Storage: $STORAGE_ACCOUNT"
echo "App Services: 5 MCP servers + orchestrator"
echo "Static Web App: $STATIC_WEB_APP"
echo ""
echo "📋 Next steps:"
echo "1. Clone your GitHub repository: git clone $GITHUB_REPO.git"
echo "2. Set up the repository structure (see documentation)"
echo "3. Run ./get-secrets.sh to get connection strings"
echo "4. Set up GitHub repository secrets at: $GITHUB_REPO/settings/secrets/actions"
echo "5. Deploy your code via GitHub Actions"
echo ""
echo "🔧 GitHub Repository Setup:"
echo "Repository: $GITHUB_REPO"
echo "Make sure to create the folders: mcp-servers/, orchestrator/, frontend/, .github/workflows/"
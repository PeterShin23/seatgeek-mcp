import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import dotenv from 'dotenv';
import { findEventsTool } from './tools/findEvents.js';
import { findEventRecommendationsTool } from './tools/findEventRecommendations.js';
import { findPerformerRecommendationsTool } from './tools/findPerformerRecommendations.js';
import { retrieveEventVenueInformationTool } from './tools/retrieveEventVenueInformation.js';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { systemInstructions } from './prompts/index.js';

dotenv.config();

const mcpServer = new McpServer({
  name: 'seatgeek',
  version: '0.1.0',
}, {
  instructions: systemInstructions,
});

// Register tools
mcpServer.tool(findEventsTool.name, findEventsTool.description, findEventsTool.inputSchema, findEventsTool.handler);
mcpServer.tool(findEventRecommendationsTool.name, findEventRecommendationsTool.description, findEventRecommendationsTool.inputSchema, findEventRecommendationsTool.handler);
mcpServer.tool(findPerformerRecommendationsTool.name, findPerformerRecommendationsTool.description, findPerformerRecommendationsTool.inputSchema, findPerformerRecommendationsTool.handler);
mcpServer.tool(retrieveEventVenueInformationTool.name, retrieveEventVenueInformationTool.description, retrieveEventVenueInformationTool.inputSchema, retrieveEventVenueInformationTool.handler);

// Start server
async function startServer() {
  if (process.env.MCP_HTTP) {
    const port = parseInt(process.env.PORT || '8080', 10);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    
    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }
        
        // Let the transport handle the request
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('Error handling request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    
    // Connect the MCP server to the transport
    await mcpServer.connect(transport);
    
    // Start the HTTP server
    server.listen(port, () => {
      console.error(`SeatGeek MCP server running over HTTP on port ${port}`);
    });
    
    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down HTTP server...');
      server.close();
      await mcpServer.close();
      process.exit(0);
    });
  } else {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('SeatGeek MCP server running over stdio');
  }
}

// Handle graceful shutdown for stdio mode
process.on('SIGINT', async () => {
  if (!process.env.MCP_HTTP) {
    console.error('Shutting down SeatGeek MCP server...');
    await mcpServer.close();
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  console.error('Shutting down SeatGeek MCP server...');
  await mcpServer.close();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start SeatGeek MCP server:', error);
  process.exit(1);
});

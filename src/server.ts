import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import dotenv from 'dotenv';
import { listEventsTool } from './tools/eventList.js';
import { listPerformersTool } from './tools/performerList.js';
import { listVenuesTool } from './tools/venueList.js';
import { sectionInfoTool } from './tools/sectionInfo.js';
import { recommendationsTool } from './tools/recommendations.js';
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
mcpServer.tool('list_events', listEventsTool.description, listEventsTool.inputSchema, listEventsTool.handler);
mcpServer.tool('list_performers', listPerformersTool.description, listPerformersTool.inputSchema, listPerformersTool.handler);
mcpServer.tool('list_venues', listVenuesTool.description, listVenuesTool.inputSchema, listVenuesTool.handler);
mcpServer.tool('get_event_sections', sectionInfoTool.description, sectionInfoTool.inputSchema, sectionInfoTool.handler);
mcpServer.tool('get_recommendations', recommendationsTool.description, recommendationsTool.inputSchema, recommendationsTool.handler);

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
      console.log(`SeatGeek MCP server running over HTTP on port ${port}`);
    });
    
    // Handle server shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down HTTP server...');
      server.close();
      await mcpServer.close();
      process.exit(0);
    });
  } else {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.log('SeatGeek MCP server running over stdio');
  }
}

// Handle graceful shutdown for stdio mode
process.on('SIGINT', async () => {
  if (!process.env.MCP_HTTP) {
    console.log('Shutting down SeatGeek MCP server...');
    await mcpServer.close();
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  console.log('Shutting down SeatGeek MCP server...');
  await mcpServer.close();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error('Failed to start SeatGeek MCP server:', error);
  process.exit(1);
});

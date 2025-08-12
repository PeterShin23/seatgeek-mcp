import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { findEventsTool } from './tools/eventFinder.js';
import { listPerformersTool } from './tools/performerList.js';

// Load environment variables
dotenv.config();

// Create MCP server
const mcpServer = new McpServer({
  name: 'seatgeek',
  version: '0.1.0',
});

// Register tools
mcpServer.tool('seatgeek_events', findEventsTool.description, findEventsTool.inputSchema, findEventsTool.handler);
mcpServer.tool('seatgeek_performers', listPerformersTool.description, listPerformersTool.inputSchema, listPerformersTool.handler);

// Start server
async function startServer() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('SeatGeek MCP server running over stdio');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down SeatGeek MCP server...');
  await mcpServer.close();
  process.exit(0);
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

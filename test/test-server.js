#!/usr/bin/env node

/**
 * Simple test script for the SeatGeek MCP server
 * This script demonstrates how to connect to and test the MCP server
 */

import { spawn } from 'child_process';

// Start the MCP server as a child process with HTTP transport
const server = spawn('node', ['dist/server.js'], {
  env: { ...process.env, MCP_HTTP: '1', PORT: '8080' }
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log(`[Server] ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`[Server Error] ${data}`);
});

server.on('close', (code) => {
  console.log(`[Server] Process exited with code ${code}`);
});

console.log('Starting SeatGeek MCP server with HTTP transport on port 8080...');
console.log('Server will run until you press Ctrl+C to stop it.');
console.log('Once running, you can test it with curl commands or the test-tools.js script.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.kill();
  process.exit(0);
});

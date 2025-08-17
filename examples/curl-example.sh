#!/bin/bash

# Example script demonstrating proper usage of the SeatGeek MCP server
# This script shows the correct sequence of requests with proper headers

echo "Starting SeatGeek MCP server with HTTP transport..."
MCP_HTTP=1 PORT=8080 npm start &

# Store the process ID
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "Initializing connection to MCP server..."
INIT_RESPONSE=$(curl -s -v -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-06-11", "capabilities": {}, "clientInfo": {"name": "example-client", "version": "1.0.0"}}}' 2>&1)

# Extract session ID from response headers
SESSION_ID=$(echo "$INIT_RESPONSE" | grep "mcp-session-id" | cut -d' ' -f3 | tr -d '\r')

echo "Session ID: $SESSION_ID"

echo "Listing available tools..."
curl -s -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'

echo -e "\n\nExample of calling find_events tool..."
curl -s -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "find_events", "arguments": {"q": "washington nationals", "per_page": 3}}}'

# Clean up - stop the server
kill $SERVER_PID

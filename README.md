# seatgeek-mcp

Minimal MCP server exposing SeatGeek tools (events and performers) as a TypeScript library.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

## Installation

```bash
npm install seatgeek-mcp
```

## Usage

### As a Standalone Server

```bash
# STDIO transport (default)
npm start

# HTTP streaming transport
MCP_HTTP=1 PORT=8080 npm start
```

## Tools

- `list_events`: List SeatGeek events with simple filters (q, performer, venue, time, type). Returns structured models or raw JSON with format="json".
- `list_performers`: List SeatGeek performers with simple filters (q, id, slug, type). Returns structured models or raw JSON with format="json".
- `list_venues`: List SeatGeek venues with simple filters (city, state, country, postal_code, q, id). Returns structured models or raw JSON with format="json".
- `get_event_sections_info`: Get section and row information for a specific event. Returns detailed information about the sections and rows available for a specific event.
- `list_event_recommendations`: Get recommended events based on seed parameters (performer, event, location). Returns structured models or raw JSON with format="json".

## Environment Variables

- `SEATGEEK_CLIENT_ID`: Your SeatGeek API client ID (required)
- `MCP_HTTP`: Set to any value to enable HTTP transport instead of STDIO
- `PORT`: Port to listen on when using HTTP transport (default: 8080)

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Development Server

```bash
npm run dev
```

### Clean Build

```bash
npm run clean
```

### Testing the Server

You can test the server in several ways:

1. **Using HTTP transport (easiest for testing):**
   ```bash
   MCP_HTTP=1 PORT=8080 npm start
   ```

2. **Using curl to test tools:**
   ```bash
   # List available tools
   curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   
   # Call a specific tool (example)
   curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_events", "arguments": {"q": "concert", "per_page": 5}}}'
   ```

3. **Using the test scripts:**
   ```bash
   # Run the simple test server script
   npm run test-server
   
   # Run the comprehensive tool tests (requires server to be running separately)
   npm run test-tools
   ```

The server implements the Model Context Protocol (MCP) specification, so it can be used with any MCP-compatible client.

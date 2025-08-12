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

### As a Library

```typescript
import { Server } from 'seatgeek-mcp';
import { findEventsTool, listPerformersTool } from 'seatgeek-mcp';

// Create server
const server = new Server({
  name: 'seatgeek',
  version: '0.1.0'
});

// Register tools
server.addTool(findEventsTool);
server.addTool(listPerformersTool);

// Start server
async function start() {
  // For HTTP transport
  if (process.env.MCP_HTTP) {
    const port = parseInt(process.env.PORT || '8080', 10);
    await server.listenHttp({ port });
    console.log(`Server running on http://localhost:${port}`);
  } else {
    // For STDIO transport (default)
    await server.listenStdio();
    console.log('Server running over stdio');
  }
}

start().catch(console.error);
```

### As a Standalone Server

```bash
# STDIO transport (default)
npm start

# HTTP streaming transport
MCP_HTTP=1 PORT=8080 npm start
```

## Tools

- `ping`: Health check tool - returns 'pong'
- `seatgeek_events`: List/search events. Set `format="json"` for raw API JSON.
- `seatgeek_performers`: List/search performers. Set `format="json"` for raw API JSON.

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

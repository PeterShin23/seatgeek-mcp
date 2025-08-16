# seatgeek-mcp

Comprehensive MCP server exposing a registry of SeatGeek tools including events, performers, venues, section info, and recommendations as a TypeScript library.

## Demo
<img width="1716" height="693" alt="image" src="https://github.com/user-attachments/assets/4333ab99-7337-41c5-beaf-e3fc68f209c2" />

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
- `SEATGEEK_SECRET`: Your SeatGeek API secret (optional)
- `MCP_HTTP`: Set to any value to enable HTTP transport instead of STDIO
- `PORT`: Port to listen on when using HTTP transport (default: 8080)

## Setting up Environment Variables

To use this MCP server, you need to set up a `.env` file in the root directory with your SeatGeek API credentials:

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit the `.env` file and replace the placeholder values with your actual SeatGeek API credentials

You can obtain your SeatGeek API credentials by creating an account at [SeatGeek Platform](https://seatgeek.com/build).

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

2. **Using curl to test tools (proper MCP protocol sequence):**
   
   The MCP protocol requires a specific sequence of requests with proper headers:
   
   a. **Initialize the connection** (required first step):
   ```bash
   curl -v -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-06-11", "capabilities": {}, "clientInfo": {"name": "curl", "version": "1.0.0"}}}'
   ```
   
   b. **Extract the session ID** from the response headers (look for `mcp-session-id`)
   
   c. **Use the session ID for subsequent requests**:
   ```bash
   # List available tools
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
   
   # Call a specific tool (example)
   curl -X POST http://localhost:8080 \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: YOUR_SESSION_ID_HERE" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "list_events", "arguments": {"q": "concert", "per_page": 5}}}'
   ```

   For a complete working example, see:
- [examples/curl-example.sh](examples/curl-example.sh) - Shell script demonstrating the full sequence of requests
- [examples/node-example.js](examples/node-example.js) - Node.js script showing programmatic usage

3. **Using the test scripts:**
   ```bash
   # Run the simple test server script
   npm run test-server
   
   # Run the comprehensive tool tests (requires server to be running separately)
   npm run test-tools
   ```

The server implements the Model Context Protocol (MCP) specification, so it can be used with any MCP-compatible client.

## Using with Claude Desktop

### Prerequisites
- Installed Claude Desktop
- Added claude_desktop_config.json under Settings -> Developer

### Setup Instructions
- Add to `mcpServers` list:
```json
"seatgeek-mcp": {
   "command": "node",
   "args": ["/path-to/seatgeek-mcp/dist/server.js"],
   "env": {
      "SEATGEEK_CLIENT_ID": "your-client-id"
   }
}
```

## Using with OpenWebUI

You can use this MCP server with OpenWebUI through the mcpo (MCP Over HTTP) proxy, which automatically generates OpenAPI documentation from your MCP tool schemas.

### Prerequisites

- Docker installed on your system (Optional if using uv)
- OpenWebUI installed and running

### Setup Instructions

1. **Start the mcpo proxy**:
   ```bash
   docker run -p 8000:8000 -v $(pwd):/workspace -w /workspace ghcr.io/open-webui/mcpo:main -- npm start
   ```

   or

   ```bash
   uvx mcpo --port 8000 -- npm start
   ```

2. **Verify the proxy is running**:
   - Open your browser and navigate to `http://localhost:8000/docs` to see the automatically generated Swagger UI documentation
   - You can also check the OpenAPI specification at `http://localhost:8000/openapi.json`

3. **Connect to OpenWebUI**:
   - Open OpenWebUI
   - Go to Settings > Tools & Integrations
   - Add a new OpenAPI-compatible tool
   - Use the URL: `http://localhost:8000`
   - The available endpoints will be:
     - `/list_events` (POST) - Search for events
     - `/list_performers` (POST) - Search for performers
     - `/list_venues` (POST) - Search for venues
     - `/get_event_sections_info` (POST) - Get section info for an event
     - `/list_event_recommendations` (POST) - Get event recommendations

### Example Usage in OpenWebUI

Once connected, you can use these tools in OpenWebUI that will make requests such as:

- To search for performers: `{"q": "washington nationals", "per_page": 5}`
- To search for venues: `{"city": "New York", "per_page": 5}`

The mcpo proxy automatically handles the conversion between the OpenAPI REST interface and the MCP protocol, making your MCP tools accessible through standard REST endpoints that OpenWebUI can easily integrate with.

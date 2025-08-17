# seatgeek-mcp

Comprehensive MCP server exposing a registry of SeatGeek tools including events, performers, venues, section info, and recommendations as a TypeScript library.

## Demo
![seatgeek-mcp-demo](https://github.com/user-attachments/assets/699c41da-9d12-48d0-b413-c532c1397cad)

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

- `find_events`: Search for events by performer, location, date, or venue. This tool is optimized for finding specific events based on user queries. If the query involves a performer, it first looks up the performer, then finds events for that performer. Otherwise, it searches events directly. Returns structured event data with venue information.

- `find_event_recommendations`: Get personalized event recommendations based on performers, events, or location. This tool first searches for performers and/or events based on the query, then uses the IDs to find similar events. Use location parameters for nearby events.

- `find_performer_recommendations`: Get personalized performer recommendations based on performers, events, or location. This tool first searches for performers and/or events based on the queries, then uses the IDs to find similar performers.

- `retrieve_event_venue_information`: Get detailed seating information including sections and rows for a specific event. This tool first searches for the event using the provided query, then retrieves detailed venue layout information.

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
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "find_events", "arguments": {"q": "concert", "per_page": 5}}}'
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

### Example Usage in OpenWebUI

Once connected, you can use these tools in OpenWebUI that will make requests such as:

- To search for performers: `{"q": "washington nationals", "per_page": 5}`
- To search for venues: `{"city": "New York", "per_page": 5}`

The mcpo proxy automatically handles the conversion between the OpenAPI REST interface and the MCP protocol, making your MCP tools accessible through standard REST endpoints that OpenWebUI can easily integrate with.

#!/usr/bin/env node

/**
 * Example Node.js script demonstrating proper usage of the SeatGeek MCP server
 * This script shows how to properly initialize a connection and make requests
 */

import axios from 'axios';

const SERVER_URL = 'http://localhost:8080';

async function runExample() {
  console.log('Starting SeatGeek MCP client example...');
  
  try {
    // Step 1: Initialize the connection
    console.log('1. Initializing connection...');
    const initResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-06-11',
        capabilities: {},
        clientInfo: {
          name: 'node-example-client',
          version: '1.0.0'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });
    
    // Extract session ID from response headers
    const sessionId = initResponse.headers['mcp-session-id'];
    console.log(`   Session ID: ${sessionId}`);
    
    // Parse SSE response to get the actual JSON-RPC response
    const initResult = parseSseResponse(initResponse.data);
    console.log('   Server info:', initResult.result.serverInfo);
    
    // Prepare headers with session ID for subsequent requests
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Mcp-Session-Id': sessionId
    };
    
    // Step 2: List available tools
    console.log('\n2. Listing available tools...');
    const toolsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }, { headers });
    
    const toolsResult = parseSseResponse(toolsResponse.data);
    console.log(`   Found ${toolsResult.result.tools.length} tools:`);
    toolsResult.result.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description.split('.')[0]}...`);
    });
    
    // Step 3: Call a specific tool
    console.log('\n3. Calling find_events tool...');
    const eventsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'find_events',
        arguments: {
          q: 'washington nationals',
          per_page: 3,
          format: 'structured'
        }
      }
    }, { headers });
    
    const eventsResult = parseSseResponse(eventsResponse.data);
    if (eventsResult.result && eventsResult.result.data) {
      console.log(`   Found ${eventsResult.result.data.length} events:`);
      eventsResult.result.data.forEach(event => {
        console.log(`   - ${event.title} at ${event.venue.name} on ${event.datetime_local}`);
      });
    } else {
      console.log('   No events found or error occurred');
    }
    
    console.log('\nExample completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

// Function to parse SSE response and extract JSON-RPC response
function parseSseResponse(sseData) {
  const lines = sseData.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const jsonData = JSON.parse(line.substring(6));
        if (jsonData.jsonrpc === '2.0' && (jsonData.result || jsonData.error)) {
          return jsonData;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
  return null;
}

// Run the example
runExample();

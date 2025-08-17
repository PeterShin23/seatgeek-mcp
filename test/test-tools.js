#!/usr/bin/env node

/**
 * Comprehensive test script for the SeatGeek MCP server tools
 * This script demonstrates how to test each tool in the server
 */

import axios from 'axios';

const SERVER_URL = 'http://localhost:8080';
const CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;

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

async function testServer() {
  let sessionId = null;
  
  try {
    console.log('Testing SeatGeek MCP Server...\n');
    
    // Test 1: Initialize the server
    console.log('1. Initializing server...');
    const initResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-08-07',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });
    
    // Parse the SSE response to get the actual JSON-RPC response
    const initResult = parseSseResponse(initResponse.data);
    console.log('Server initialized:', initResult);
    
    // Extract session ID from headers if available
    if (initResponse.headers['mcp-session-id']) {
      sessionId = initResponse.headers['mcp-session-id'];
      console.log('Session ID:', sessionId);
    }
    
    console.log('\n');
    
    // Prepare headers with session ID if available
    const headers = { 
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }
    
    // Test 2: List available tools
    console.log('2. Testing tools/list endpoint...');
    const toolsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }, {
      headers: headers
    });
    
    const toolsResult = parseSseResponse(toolsResponse.data);
    console.log('Available tools:', toolsResult ? toolsResult.result : 'No result found');
    console.log('\n');
    
    // Test 3: Test find_events tool
    console.log('3. Testing find_events tool...');
    const eventsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'find_events',
        arguments: {
          q: 'concert',
          per_page: 3,
          format: 'json'
        }
      }
    }, {
      headers: headers
    });
    
    const eventsResult = parseSseResponse(eventsResponse.data);
    console.log('Events search result:', eventsResult ? JSON.stringify(eventsResult, null, 2) : 'No result found');
    console.log('\n');
    
    // Test 4: Test find_event_recommendations tool
    console.log('4. Testing find_event_recommendations tool...');
    const recommendationsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'find_event_recommendations',
        arguments: {
          q: 'concert',
          per_page: 3,
          format: 'json'
        }
      }
    }, {
      headers: headers
    });
    
    const recommendationsResult = parseSseResponse(recommendationsResponse.data);
    console.log('Event recommendations result:', recommendationsResult ? JSON.stringify(recommendationsResult, null, 2) : 'No result found');
    console.log('\n');
    
    // Test 5: Test find_performer_recommendations tool
    console.log('5. Testing find_performer_recommendations tool...');
    const performerRecommendationsResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'find_performer_recommendations',
        arguments: {
          performer_q: 'band',
          per_page: 3,
          format: 'json'
        }
      }
    }, {
      headers: headers
    });
    
    const performerRecommendationsResult = parseSseResponse(performerRecommendationsResponse.data);
    console.log('Performer recommendations result:', performerRecommendationsResult ? JSON.stringify(performerRecommendationsResult, null, 2) : 'No result found');
    console.log('\n');
    
    // Test 6: Test retrieve_event_venue_information tool
    console.log('6. Testing retrieve_event_venue_information tool...');
    const venueInfoResponse = await axios.post(SERVER_URL, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'retrieve_event_venue_information',
        arguments: {
          q: 'concert',
          per_page: 1,
          format: 'json'
        }
      }
    }, {
      headers: headers
    });
    
    console.log('All tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

// Run the tests
testServer();

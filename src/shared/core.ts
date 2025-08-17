import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Import endpoints from shared endpoints file
import {
  EVENTS_ENDPOINT,
  PERFORMERS_ENDPOINT,
  VENUES_ENDPOINT,
  SECTION_INFO_ENDPOINT,
  RECOMMENDATIONS_ENDPOINT
} from './endpoints.js';

export {
  EVENTS_ENDPOINT,
  PERFORMERS_ENDPOINT,
  VENUES_ENDPOINT,
  SECTION_INFO_ENDPOINT,
  RECOMMENDATIONS_ENDPOINT
};

// Networking defaults
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;
const DEFAULT_HEADERS = { "User-Agent": "seatgeek-mcp/0.1 (+mcp)" };

/**
 * Get SEATGEEK_CLIENT_ID from env if present.
 */
export function getClientId(): string | undefined {
  return process.env.SEATGEEK_CLIENT_ID;
}

/**
 * HTTP GET with retries and backoff, returning parsed JSON.
 */
export async function fetchJson(url: string, query: Record<string, any>): Promise<any> {
  let backoffMs = 500;
  
  const clientId = getClientId();
  
  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  
  // Add basic auth if client ID is present
  if (clientId) {
    headers["Authorization"] = `Basic ${Buffer.from(clientId + ":").toString("base64")}`;
  }
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        params: query,
        timeout: DEFAULT_TIMEOUT_MS,
        headers: headers,
      });
      
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Handle timeout
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        if (attempt >= MAX_RETRIES) {
          throw new Error(`Request timeout after ${MAX_RETRIES + 1} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }
      
      // Handle network errors
      if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        if (attempt >= MAX_RETRIES) {
          throw new Error(`Network error after ${MAX_RETRIES + 1} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        backoffMs *= 2;
        continue;
      }
      
      // Handle HTTP status errors
      if (axiosError.response) {
        const status = axiosError.response.status;
        if (status >= 500 && status < 600 && attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          backoffMs *= 2;
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw new Error(`Request failed after ${MAX_RETRIES + 1} attempts`);
}

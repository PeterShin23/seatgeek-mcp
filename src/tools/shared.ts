import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Base API and endpoints
const SEATGEEK_API_BASE = "https://api.seatgeek.com/2";
export const EVENTS_ENDPOINT = `${SEATGEEK_API_BASE}/events`;
export const PERFORMERS_ENDPOINT = `${SEATGEEK_API_BASE}/performers`;

// Networking defaults
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;
const DEFAULT_HEADERS = { "User-Agent": "seatgeek-mcp/0.1 (+mcp)" };

/**
 * Inject SEATGEEK_CLIENT_ID into query if present in env.
 */
export function withClientId(query: Record<string, any>): Record<string, any> {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  if (clientId) {
    // copy to avoid mutating the caller
    const updated = { ...query };
    updated["client_id"] = clientId;
    return updated;
  }
  return query;
}

/**
 * HTTP GET with retries and backoff, returning parsed JSON.
 */
export async function fetchJson(url: string, query: Record<string, any>): Promise<any> {
  let backoffMs = 500;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        params: query,
        timeout: DEFAULT_TIMEOUT_MS,
        headers: DEFAULT_HEADERS,
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

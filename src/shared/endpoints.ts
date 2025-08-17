import { fetchJson } from './core.js';

// Base API and endpoints
const SEATGEEK_API_BASE = "https://api.seatgeek.com/2";
export const EVENTS_ENDPOINT = `${SEATGEEK_API_BASE}/events`;
export const PERFORMERS_ENDPOINT = `${SEATGEEK_API_BASE}/performers`;
export const VENUES_ENDPOINT = `${SEATGEEK_API_BASE}/venues`;
export const SECTION_INFO_ENDPOINT = `${SEATGEEK_API_BASE}/events/section_info`;
export const RECOMMENDATIONS_ENDPOINT = `${SEATGEEK_API_BASE}/recommendations`;

// Helper functions for common API calls
export async function searchPerformers(query: string, per_page: number = 10, page: number = 1) {
  try {
    const performerQuery = {
      q: query,
      per_page: per_page,
      page: page
    };
    
    const performerData = await fetchJson(PERFORMERS_ENDPOINT, performerQuery);
    return performerData.performers || [];
  } catch (error) {
    console.warn('Failed to lookup performer:', error);
    return [];
  }
}

export async function searchEvents(query: string, per_page: number = 10, additionalParams: Record<string, any> = {}) {
  try {
    const eventQuery = {
      q: query,
      per_page: per_page,
      ...additionalParams
    };
    
    // Drop null/undefined values to avoid noisy query strings
    const filteredQuery: Record<string, any> = {};
    for (const [key, value] of Object.entries(eventQuery)) {
      if (value !== null && value !== undefined && value !== '') {
        filteredQuery[key] = value;
      }
    }
    
    const eventData = await fetchJson(EVENTS_ENDPOINT, filteredQuery);
    return eventData.events || [];
  } catch (error) {
    console.warn('Failed to lookup event:', error);
    return [];
  }
}

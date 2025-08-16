import { z } from 'zod';
import { PerformerSchema, Performer, Event, EventSchema } from '../schemas/eventModels.js';
import { 
  fetchJson, 
  PERFORMERS_ENDPOINT, 
  EVENTS_ENDPOINT, 
  RECOMMENDATIONS_ENDPOINT 
} from './shared.js';

// Schema for performer recommendations
const PerformerRecommendationsQuerySchema = z.object({
  performer_id: z.number(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type PerformerRecommendationsQuery = z.infer<typeof PerformerRecommendationsQuerySchema>;

const performerRecommendationsInputSchema = {
  performer_id: z.number().describe('Performer ID to get recommendations for similar artists.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Get recommended performers based on a specific performer ID.
 * Returns structured models or raw JSON with format='json'.
 */
export const performerRecommendationsTool = {
  name: 'get_performer_recommendations',
  description: 'Get recommended performers similar to a specific artist. Use this tool when the user asks for artists similar to or recommended based on a specific performer. Requires the performer ID from a previous performer search.',
  inputSchema: performerRecommendationsInputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = PerformerRecommendationsQuerySchema.parse(args);
      
      // Build query for performer recommendations
      const query = {
        "performers.id": params.performer_id,
        per_page: Math.min(params.per_page, 50),
        page: params.page,
      };
      
      // Call recommendations endpoint with performer ID
      const data = await fetchJson(RECOMMENDATIONS_ENDPOINT, query);
      
      if (params.format === 'json') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      // Extract performers from recommendations
      const recommendationsRaw = Array.isArray(data) ? data : (data.recommendations || []);
      const results: Performer[] = [];
      
      for (const item of recommendationsRaw) {
        try {
          // Each recommendation has a performer object
          if (item.performer) {
            const performer = PerformerSchema.parse(item.performer);
            results.push(performer);
          }
        } catch (error) {
          // Skip invalid performers
          console.warn('Skipping invalid performer recommendation:', error);
        }
      }
            
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in get_performer_recommendations handler:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: RECOMMENDATIONS_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch performer recommendations',
              details: errorDetails,
              suggestion: 'Please check the performer ID and try again.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

// Schema for event recommendations based on performer
const EventRecommendationsQuerySchema = z.object({
  performer_id: z.number().optional(),
  event_id: z.number().optional(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  venue_country: z.string().nullable().optional(),
  geoip: z.boolean().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  range: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type EventRecommendationsQuery = z.infer<typeof EventRecommendationsQuerySchema>;

const eventRecommendationsInputSchema = {
  performer_id: z.number().optional().describe('Performer ID to get recommended events for similar artists.'),
  event_id: z.number().optional().describe('Event ID to get recommended events for similar events.'),
  start_utc: z.string().optional().describe('Start date filter in ISO8601 UTC format (YYYY-MM-DD). Use for date ranges like "next month" or "this weekend".'),
  end_utc: z.string().optional().describe('End date filter in ISO8601 UTC format (YYYY-MM-DD). Use with start_utc to define date ranges.'),
  venue_city: z.string().optional().describe('City name where the venue is located. Use full city name, e.g., "New York" or "Los Angeles".'),
  venue_state: z.string().optional().describe('State abbreviation where the venue is located, e.g., "CA" for California or "NY" for New York.'),
  venue_country: z.string().optional().describe('Country code where the venue is located, e.g., "US" for United States or "CA" for Canada.'),
  geoip: z.boolean().optional().describe('Use IP geolocation to provide recommendations for events near the user.'),
  lat: z.number().optional().describe('Latitude coordinate for location-based recommendations. Use with lon and optionally range.'),
  lon: z.number().optional().describe('Longitude coordinate for location-based recommendations. Use with lat and optionally range.'),
  postal_code: z.string().optional().describe('Postal code for location-based recommendations. Use with country code for better accuracy.'),
  range: z.string().optional().describe('Search radius for location-based recommendations (e.g., "50mi", "25km"). Use with lat/lon or postal_code.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Get recommended events based on performer or event with additional filters.
 * Returns structured models or raw JSON with format='json'.
 */
export const eventRecommendationsTool = {
  name: 'get_event_recommendations',
  description: 'Get recommended events based on a specific performer or event, with optional filters for location and date. Use this tool when the user asks for events similar to a specific performer or event, or when they want personalized event recommendations based on their preferences and location.',
  inputSchema: eventRecommendationsInputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = EventRecommendationsQuerySchema.parse(args);
      
      // Build query for event recommendations
      const query: Record<string, any> = {
        "performers.id": params.performer_id,
        "events.id": params.event_id,
        "geoip": params.geoip,
        "lat": params.lat,
        "lon": params.lon,
        "postal_code": params.postal_code,
        "range": params.range,
        per_page: Math.min(params.per_page, 50),
        page: params.page,
      };
      
      // Add date filters if provided
      if (params.start_utc) {
        query["datetime_utc.gte"] = params.start_utc;
      }
      
      if (params.end_utc) {
        query["datetime_utc.lte"] = params.end_utc;
      }
      
      // Add venue location filters if provided
      if (params.venue_city) {
        query["venue.city"] = params.venue_city;
      }
      
      if (params.venue_state) {
        query["venue.state"] = params.venue_state;
      }
      
      if (params.venue_country) {
        query["venue.country"] = params.venue_country;
      }
      
      // Drop null/undefined values to avoid noisy query strings
      const filteredQuery: Record<string, any> = {};
      for (const [key, value] of Object.entries(query)) {
        if (value !== null && value !== undefined) {
          filteredQuery[key] = value;
        }
      }
      
      // Call recommendations endpoint
      const data = await fetchJson(RECOMMENDATIONS_ENDPOINT, filteredQuery);
      
      if (params.format === 'json') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      // Extract events from recommendations
      const recommendationsRaw = Array.isArray(data) ? data : (data.recommendations || []);
      const results: Event[] = [];
      
      for (const item of recommendationsRaw) {
        try {
          // Each recommendation has an event object
          if (item.event) {
            const event = EventSchema.parse(item.event);
            results.push(event);
          }
        } catch (error) {
          // Skip invalid events
          console.warn('Skipping invalid event recommendation:', error);
        }
      }
            
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in get_event_recommendations handler:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: RECOMMENDATIONS_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch event recommendations',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

// Schema for performer events
const PerformerEventsQuerySchema = z.object({
  performer_slug: z.string(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  venue_country: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().nullable().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
});

type PerformerEventsQuery = z.infer<typeof PerformerEventsQuerySchema>;

function buildPerformerEventsQuery(params: PerformerEventsQuery): Record<string, any> {
  const query: Record<string, any> = {
    "performers.slug": params.performer_slug,
    per_page: Math.min(params.per_page, 50),
    page: params.page,
    sort: params.sort,
  };
  
  if (params.start_utc) {
    query["datetime_utc.gte"] = params.start_utc;
  }
  
  if (params.end_utc) {
    query["datetime_utc.lte"] = params.end_utc;
  }
  
  // Add venue location filters if provided
  if (params.venue_city) {
    query["venue.city"] = params.venue_city;
  }
  
  if (params.venue_state) {
    query["venue.state"] = params.venue_state;
  }
  
  if (params.venue_country) {
    query["venue.country"] = params.venue_country;
  }
  
  // Drop null/undefined values to avoid noisy query strings
  const filteredQuery: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      filteredQuery[key] = value;
    }
  }
  
  return filteredQuery;
}

const performerEventsInputSchema = {
  performer_slug: z.string().describe('The slug of the performer to get events for. Use artist name (not tour name), e.g., "the-weeknd" or "taylor-swift".'),
  start_utc: z.string().optional().describe('Start date filter in ISO8601 UTC format (YYYY-MM-DD). Use for date ranges like "next month" or "this weekend".'),
  end_utc: z.string().optional().describe('End date filter in ISO8601 UTC format (YYYY-MM-DD). Use with start_utc to define date ranges.'),
  venue_city: z.string().optional().describe('City name where the venue is located. Use full city name, e.g., "New York" or "Los Angeles".'),
  venue_state: z.string().optional().describe('State abbreviation where the venue is located, e.g., "CA" for California or "NY" for New York.'),
  venue_country: z.string().optional().describe('Country code where the venue is located, e.g., "US" for United States or "CA" for Canada.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  sort: z.string().optional().describe('Sort order for results. Common values: "date" (by event date), "score" (relevance), "popularity".'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Get events for a specific performer with optional filters.
 * Returns structured models or raw JSON with format='json'.
 */
export const performerEventsTool = {
  name: 'get_performer_events',
  description: 'Get events for a specific performer with optional filters for location and date. Use this tool when the user asks for tour dates or events for a specific artist. Requires the performer slug from a previous performer search.',
  inputSchema: performerEventsInputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = PerformerEventsQuerySchema.parse(args);
      const query = buildPerformerEventsQuery(params);
      
      // Call events endpoint with performer slug
      const data = await fetchJson(EVENTS_ENDPOINT, query);
      
      if (params.format === 'json') {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      // Extract events
      const eventsRaw = data.events || [];
      const results: Event[] = [];
      
      for (const item of eventsRaw) {
        try {
          const event = EventSchema.parse(item);
          // Add venue display if venue exists
          if (event.venue) {
            const city = event.venue.city;
            const state = event.venue.state;
            const parts = [city, state].filter(Boolean);
            const venueDisplay = parts.join(', ') || null;
            
            results.push({
              ...event,
              venue_display: venueDisplay,
            });
          } else {
            results.push(event);
          }
        } catch (error) {
          // Skip invalid events
          console.warn('Skipping invalid event:', error);
        }
      }
            
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in get_performer_events handler:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: EVENTS_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch performer events',
              details: errorDetails,
              suggestion: 'Please check the performer slug and try again.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

import { z } from 'zod';
import { fetchJson, RECOMMENDATIONS_ENDPOINT } from '../shared/core.js';
import { searchPerformers, searchEvents } from '../shared/endpoints.js';
import { CondensedEvent, condenseEventData } from '../shared/helpers.js';

// Schema for event recommendations
const EventRecommendationsQuerySchema = z.object({
  q: z.string().nullable().optional(),
  geoip: z.boolean().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  range: z.string().nullable().optional(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type EventRecommendationsQuery = z.infer<typeof EventRecommendationsQuerySchema>;

function buildQuery(params: EventRecommendationsQuery, performerId?: number, eventId?: number): Record<string, any> {
  const query: Record<string, any> = {
    "geoip": params.geoip,
    "lat": params.lat,
    "lon": params.lon,
    "postal_code": params.postal_code,
    "range": params.range,
    per_page: Math.min(params.per_page, 50),
    page: params.page,
  };
  
  // Add performer and event IDs if provided
  if (performerId) {
    query["performers.id"] = performerId;
  }
  
  if (eventId) {
    query["events.id"] = eventId;
  };
  
  // Add date filters if provided
  if (params.start_utc) {
    query["datetime_utc.gte"] = params.start_utc;
  }
  
  if (params.end_utc) {
    query["datetime_utc.lte"] = params.end_utc;
  }
  
  // Drop null/undefined values to avoid noisy query strings
  const filteredQuery: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      filteredQuery[key] = value;
    }
  }
  
  return filteredQuery;
}

const inputSchema = {
  q: z.string().optional().describe('Search query to find either an event or performer to base recommendations on. If provided, the system will first look up the event ID or performer ID/slug automatically.'),
  geoip: z.boolean().optional().describe('Use IP geolocation to provide recommendations for events near the user.'),
  lat: z.number().optional().describe('Latitude coordinate for location-based recommendations. Use with lon and optionally range.'),
  lon: z.number().optional().describe('Longitude coordinate for location-based recommendations. Use with lat and optionally range.'),
  postal_code: z.string().optional().describe('Postal code for location-based recommendations. Use with country code for better accuracy.'),
  range: z.string().optional().describe('Search radius for location-based recommendations (e.g., "50mi", "25km"). Use with lat/lon or postal_code.'),
  start_utc: z.string().optional().describe('Start date filter in ISO8601 UTC format (YYYY-MM-DD). Use for date ranges like "next month" or "this weekend".'),
  end_utc: z.string().optional().describe('End date filter in ISO8601 UTC format (YYYY-MM-DD). Use with start_utc to define date ranges.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Find event recommendations based on a performer or event.
 * 
 * Uses the q parameter on the GET /events endpoint to search if the user's query doesn't pertain to a performer to get the eventid.
 * Otherwise uses the q parameter on the GET /performers endpoint to find the performer id or performer slug.
 * Then calls the GET /recommendations/events endpoint with either the performer's id or slug OR the event id.
 * 
 * Returns a list of recommended events based on the search criteria.
 */
export const findEventRecommendationsTool = {
  name: 'find_event_recommendations',
  description: 'Get personalized event recommendations based on performers, events, or location. This tool first searches for performers and/or events based on the query (q parameter), then uses the IDs to find similar events. Use location parameters (geoip, lat/lon, postal_code) for nearby events.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = EventRecommendationsQuerySchema.parse(args);
      let performerId: number | null = null;
      let eventId: number | null = null;
      
      // If we have a q parameter, try to look up performer and event IDs
      if (params.q) {
        try {
          // First try to find performers with the query
          const performers = await searchPerformers(params.q, params.per_page, 1);
          
          // If we found performers, aggregate unique performer slugs and make Promise.all query
          if (performers.length > 0) {
            // Get unique performer slugs
            const uniqueSlugs = [...new Set(performers.map((p: any) => p.slug).filter(Boolean))] as string[];
            
            if (uniqueSlugs.length > 0) {
              // Create promises for each unique performer slug
              const promises = uniqueSlugs.map(slug => {
                return searchEvents(slug, params.per_page, { "performers.slug": slug });
              });
              
              // Execute all promises
              const results = await Promise.all(promises);
              
              // Merge events from all results
              const allEvents: any[] = [];
              for (const result of results) {
                if (Array.isArray(result)) {
                  allEvents.push(...result);
                }
              }
              
              // Remove duplicates based on event id
              const eventIds = new Set();
              const uniqueEvents = allEvents.filter(event => {
                if (eventIds.has(event.id)) {
                  return false;
                }
                eventIds.add(event.id);
                return true;
              });
              
              // Use the first event's ID for recommendations if available
              if (uniqueEvents.length > 0 && uniqueEvents[0].id) {
                eventId = uniqueEvents[0].id;
              }
            } else {
              // If no valid slugs found, search events directly with the q parameter
              const events = await searchEvents(params.q, params.per_page, {});
              if (events.length > 0 && events[0].id) {
                eventId = events[0].id;
              }
            }
          } else {
            // If no performer found, search events directly with the q parameter
            const events = await searchEvents(params.q, params.per_page, {});
            if (events.length > 0 && events[0].id) {
              eventId = events[0].id;
            }
          }
        } catch (error) {
          // If lookup fails, continue with original query
          console.warn('Failed to lookup performer or event, continuing with original query:', error);
        }
      }
      
      // Build query with found IDs (convert null to undefined for TypeScript)
      const query = buildQuery(
        params, 
        performerId !== null ? performerId : undefined, 
        eventId !== null ? eventId : undefined
      );
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
      
      // Extract events from recommendations
      const recommendationsRaw = Array.isArray(data) ? data : (data.recommendations || []);
      const results: CondensedEvent[] = [];
      
      for (const item of recommendationsRaw) {
        try {
          // Each recommendation has an event object
          if (item.event) {
            // Condense the event data
            const condensedEvent = condenseEventData(item.event);
            results.push(condensedEvent);
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
      console.error('Error in find_event_recommendations handler:', error);
      
      // Provide more detailed error information
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
              suggestion: 'Please check your parameters and try again. Common issues include invalid performer IDs, event IDs, or location parameters.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

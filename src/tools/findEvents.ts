import { z } from 'zod';
import { EventSchema, Event } from '../schemas/eventModels.js';
import { fetchJson } from '../shared/core.js';
import { EVENTS_ENDPOINT, PERFORMERS_ENDPOINT, searchPerformers } from '../shared/endpoints.js';

// Events query schema
const EventsQuerySchema = z.object({
  q: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  venue_country: z.string().nullable().optional(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type EventsQuery = z.infer<typeof EventsQuerySchema>;

function buildQuery(params: EventsQuery, performerSlug?: string): Record<string, any> {
  const query: Record<string, any> = {
    per_page: Math.min(params.per_page, 50),
    page: params.page,
  };

  // If we have a performer slug, use it instead of the general q parameter
  // and don't include venue information as requested
  if (performerSlug) {
    query["performers.slug"] = performerSlug;
  } else {
    // Use general q parameter and include venue information
    query.q = params.q;
    
    // Handle venue location - API expects flat format
    if (params.venue_city) {
      query["venue.city"] = params.venue_city;
    }
    if (params.venue_state) {
      query["venue.state"] = params.venue_state;
    }
    if (params.venue_country) {
      query["venue.country"] = params.venue_country;
    }
  }

  if (params.start_utc) {
    query["datetime_utc.gte"] = params.start_utc;
  }

  if (params.end_utc) {
    query["datetime_utc.lte"] = params.end_utc;
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

const inputSchema = {
  q: z.string().optional().describe('Free-text search term. Use only when no other specific filters match the user request. Keep this text to pronouns if present in the user\'s query unless there are no pronouns in the query. Never duplicate information already captured in other parameters.'),
  venue_city: z.string().optional().describe('City name where the venue is located. Use full city name, e.g., "New York" or "Los Angeles".'),
  venue_state: z.string().optional().describe('State abbreviation where the venue is located, e.g., "CA" for California or "NY" for New York.'),
  venue_country: z.string().optional().describe('Country code where the venue is located, e.g., "US" for United States or "CA" for Canada.'),
  start_utc: z.string().optional().describe('Start date filter in ISO8601 UTC format (YYYY-MM-DD). Use for date ranges like "next month" or "this weekend".'),
  end_utc: z.string().optional().describe('End date filter in ISO8601 UTC format (YYYY-MM-DD). Use with start_utc to define date ranges.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Find events based on search criteria.
 * 
 * If the user's query involves a performer, first use GET /performers with the q parameter.
 * Then use the performer slug from the response to make a GET /events call.
 * 
 * If it does not involve a performer, simply use the q parameter on GET /events.
 * 
 * Returns a list of events matching the search criteria, including event details, venue information, and performer details.
 */
export const findEventsTool = {
  name: 'find_events',
  description: 'Search for events by performer, location, date, or venue. This tool is optimized for finding specific events based on user queries. If the query involves a performer, it first looks up the performer, then finds events for that performer. Otherwise, it searches events directly. Returns structured event data with venue information.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    const params = EventsQuerySchema.parse(args);
    
    try {
      let data: any;
      
      // If we have a query parameter, first check if it's a performer
      if (params.q) {
        try {
          // First try to find a performer with the query
          const performers = await searchPerformers(params.q, params.per_page, 1);
          
          // If we found a performer, use their slug to search for events
          if (performers.length > 0 && performers[0].slug) {
            // Build a new query using the performer slug
            // Note: When using performer slug, we don't include venue information as requested
            const query = buildQuery(params, performers[0].slug);
            data = await fetchJson(EVENTS_ENDPOINT, query);
          } else {
            // If no performer found, search events directly with the q parameter
            const query = buildQuery(params);
            data = await fetchJson(EVENTS_ENDPOINT, query);
          }
        } catch (error) {
          // If performer lookup fails, fall back to direct event search
          console.warn('Failed to lookup performer, falling back to direct event search:', error);
          const query = buildQuery(params);
          data = await fetchJson(EVENTS_ENDPOINT, query);
        }
      } else {
        // If no q parameter, search events directly
        const query = buildQuery(params);
        data = await fetchJson(EVENTS_ENDPOINT, query);
      }
      
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
      console.error('Error in find_events handler:', error);
      
      // Provide more detailed error information
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
              error: 'Failed to fetch events',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid search terms or venue codes.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

import { z } from 'zod';
import { EventSchema, Event } from '../schemas/eventModels.js';
import { EVENTS_ENDPOINT, fetchJson } from './shared.js';

// Events query schema
const EventsQuerySchema = z.object({
  q: z.string().nullable().optional(),
  performer_slug: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  venue_country: z.string().nullable().optional(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().nullable().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
});

type EventsQuery = z.infer<typeof EventsQuerySchema>;

function buildQuery(params: EventsQuery): Record<string, any> {
  const query: Record<string, any> = {
    q: params.q,
    per_page: Math.min(params.per_page, 50),
    page: params.page,
    sort: params.sort,
  };

  // Handle performer slug - API expects "performers.slug" format
  if (params.performer_slug) {
    query["performers.slug"] = params.performer_slug;
  } else {
    // Handle venue location - API expects nested format
    // Only use venue parameters when performer_slug is not provided
    if (params.venue_city || params.venue_state || params.venue_country) {
      const venue: Record<string, any> = {};
      if (params.venue_city) venue.city = params.venue_city;
      if (params.venue_state) venue.state = params.venue_state;
      if (params.venue_country) venue.country = params.venue_country;
      query.venue = venue;
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
  q: z.string().optional().describe('Free-text search term. Use only when no other specific filters match the user request. Never duplicate information already captured in other parameters.'),
  performer_slug: z.string().optional().describe('The slug of the performer to filter events by. Use artist name (not tour name), e.g., "the-weeknd" or "taylor-swift". When provided, venue parameters (city, state, country) are ignored as venue details are automatically inferred from the performer.'),
  venue_city: z.string().optional().describe('City name where the venue is located. Use full city name, e.g., "New York" or "Los Angeles". Ignored when performer_slug is provided.'),
  venue_state: z.string().optional().describe('State abbreviation where the venue is located, e.g., "CA" for California or "NY" for New York. Ignored when performer_slug is provided.'),
  venue_country: z.string().optional().describe('Country code where the venue is located, e.g., "US" for United States or "CA" for Canada. Ignored when performer_slug is provided.'),
  start_utc: z.string().optional().describe('Start date filter in ISO8601 UTC format (YYYY-MM-DD). Use for date ranges like "next month" or "this weekend".'),
  end_utc: z.string().optional().describe('End date filter in ISO8601 UTC format (YYYY-MM-DD). Use with start_utc to define date ranges.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  sort: z.string().optional().describe('Sort order for results. Common values: "date" (by event date), "score" (relevance), "popularity".'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * List SeatGeek events with simple filters (q, performer, venue, time, type).
 * Returns structured models or raw JSON with format='json'.
 */
export const listEventsTool = {
  name: 'list_events',
  description: 'Search for events by performer, location, date, or venue. This is the primary tool for finding concerts, sports, theater, and other events. Use performer_slug for specific artists (venue details will be automatically inferred), or use venue_city/state/country for location-based searches. When both performer and location are specified, prefer performer+city unless the venue is unique. Returns structured event data with venue information.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = EventsQuerySchema.parse(args);
      const query = buildQuery(params);
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
      console.error('Error in list_events handler:', error);
      
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
              suggestion: 'Please check your parameters and try again. Common issues include invalid performer slugs or venue codes.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

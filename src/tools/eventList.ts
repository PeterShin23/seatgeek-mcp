import { z } from 'zod';
import { EventSchema, Event } from '../schemas/eventModels.js';
import { EVENTS_ENDPOINT, withClientId, fetchJson } from './shared.js';

// Events query schema
const EventsQuerySchema = z.object({
  q: z.string().nullable().optional(),
  id: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  addons_visible: z.boolean().nullable().optional(),
  performer_id: z.number().nullable().optional(),
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
    id: params.id,
    type: params.type,
    addons_visible: params.addons_visible,
    "performers.id": params.performer_id,
    "performers.slug": params.performer_slug,
    "venue.city": params.venue_city,
    "venue.state": params.venue_state,
    "venue.country": params.venue_country,
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

  // Drop null/undefined values to avoid noisy query strings
  const filteredQuery: Record<string, any> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) {
      filteredQuery[key] = value;
    }
  }

  return withClientId(filteredQuery);
}

const inputSchema = {
  q: z.string().optional().describe('Free-text search'),
  id: z.number().optional().describe('Specific event id'),
  type: z.string().optional().describe('Event type filter'),
  addons_visible: z.boolean().optional(),
  performer_id: z.number().optional().describe('Performer ID'),
  performer_slug: z.string().optional().describe('Performer slug'),
  venue_city: z.string().optional().describe('Venue city'),
  venue_state: z.string().optional().describe('Venue state'),
  venue_country: z.string().optional().describe('Venue country'),
  start_utc: z.string().optional().describe('ISO8601 UTC start'),
  end_utc: z.string().optional().describe('ISO8601 UTC end'),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
};

/**
 * List SeatGeek events with simple filters (q, performer, venue, time, type).
 * Returns structured models or raw JSON with format='json'.
 */
export const listEventsTool = {
  name: 'seatgeek_events',
  description: 'List SeatGeek events with simple filters (q, performer, venue, time, type). Returns structured models or raw JSON with format="json".',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    // Validate input
    const params = EventsQuerySchema.parse(args);
    
    // Build query
    const query = buildQuery(params);
    
    // Fetch data
    const data = await fetchJson(EVENTS_ENDPOINT, query);
    
    // Return raw JSON if requested
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
    
    // Process structured data
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
  },
};

import { z } from 'zod';
import { VenueSchema, Venue } from '../schemas/eventModels.js';
import { VENUES_ENDPOINT, withClientId, fetchJson } from './shared.js';

// Venues query schema
const VenuesQuerySchema = z.object({
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  q: z.string().nullable().optional(),
  id: z.number().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().nullable().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
});

type VenuesQuery = z.infer<typeof VenuesQuerySchema>;

function buildQuery(params: VenuesQuery): Record<string, any> {
  const query: Record<string, any> = {
    city: params.city,
    state: params.state,
    country: params.country,
    "postal_code": params.postal_code,
    q: params.q,
    id: params.id,
    per_page: Math.min(params.per_page, 50),
    page: params.page,
    sort: params.sort,
  };

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
  city: z.string().optional().describe('Venue city'),
  state: z.string().optional().describe('Venue state'),
  country: z.string().optional().describe('Venue country'),
  postal_code: z.string().optional().describe('Venue postal code'),
  q: z.string().optional().describe('Free-text search'),
  id: z.number().optional().describe('Specific venue id'),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
};

/**
 * List SeatGeek venues with simple filters (city, state, country, postal_code, q, id).
 * Returns structured models or raw JSON with format='json'.
 */
export const listVenuesTool = {
  name: 'seatgeek_venues',
  description: 'List SeatGeek venues with simple filters (city, state, country, postal_code, q, id). Returns structured models or raw JSON with format="json".',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    // Validate input
    const params = VenuesQuerySchema.parse(args);
    
    // Build query
    const query = buildQuery(params);
    
    // Fetch data
    const data = await fetchJson(VENUES_ENDPOINT, query);
    
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
    // API may return an object with 'venues' or a bare array
    const venuesRaw = Array.isArray(data) ? data : (data.venues || []);
    const results: Venue[] = [];
    
    for (const item of venuesRaw) {
      try {
        const venue = VenueSchema.parse(item);
        results.push(venue);
      } catch (error) {
        // Skip invalid venues
        console.warn('Skipping invalid venue:', error);
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

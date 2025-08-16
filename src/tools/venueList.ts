import { z } from 'zod';
import { VenueSchema, Venue } from '../schemas/eventModels.js';
import { VENUES_ENDPOINT, fetchJson } from './shared.js';

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
  format: z.enum(['structured', 'json']).default('structured').describe('Always use "structured" unless the user explicitly requests raw JSON. This is for output formatting, not for API parsing.'),
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

  return filteredQuery;
}

const inputSchema = {
  city: z.string().optional().describe('City name where the venue is located. Use full city name, e.g., "New York" or "Los Angeles".'),
  state: z.string().optional().describe('State abbreviation where the venue is located, e.g., "CA" for California or "NY" for New York.'),
  country: z.string().optional().describe('Country code where the venue is located, e.g., "US" for United States or "CA" for Canada.'),
  postal_code: z.string().optional().describe('Postal code for filtering venues by specific area.'),
  q: z.string().optional().describe('Free-text search term for venue names. Use only when no other specific filters match the user request.'),
  id: z.number().optional().describe('Specific venue ID for exact venue lookup.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  sort: z.string().optional().describe('Sort order for results. Common values: "name" (alphabetical), "score" (relevance).'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * List SeatGeek venues with simple filters (city, state, country, postal_code, q, id).
 * Returns structured models or raw JSON with format='json'.
 */
export const listVenuesTool = {
  name: 'list_venues',
  description: 'Search for venues by location, name, or ID. Use this tool to find information about concert halls, stadiums, theaters, and other event venues. Filter by city, state, country, or postal code for location-based searches, or use id for exact venue lookups. Returns venue details including address, location coordinates, and URLs.',
  inputSchema: inputSchema,
  outputSchema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Unique venue identifier' },
        name: { type: 'string', description: 'Venue name' },
        address: { type: 'string', description: 'Street address' },
        city: { type: 'string', description: 'City name' },
        state: { type: 'string', description: 'State/region code' },
        country: { type: 'string', description: 'Country code' },
        postal_code: { type: 'string', description: 'Postal code' },
        extended_address: { type: 'string', description: 'Additional address information' },
        url: { type: 'string', description: 'URL to the venue on SeatGeek' },
        score: { type: 'number', description: 'Relevance score' },
        location: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude coordinate' },
            lon: { type: 'number', description: 'Longitude coordinate' }
          },
          required: ['lat', 'lon']
        }
      },
      required: ['id', 'name', 'city', 'country']
    }
  },
  handler: async (args: any, extra: any) => {
    try {
      // Validate input
      const params = VenuesQuerySchema.parse(args);
      
      // Build query
      const query = buildQuery(params);
      
      // Log the query for debugging
      console.error('SeatGeek API Query:', JSON.stringify(query, null, 2));
      
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
      
      console.error(`Successfully processed ${results.length} venues`);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in list_venues handler:', error);
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: VENUES_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch venues',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid location codes or venue IDs.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

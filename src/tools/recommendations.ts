import { z } from 'zod';
import { PerformerSchema, Performer } from '../schemas/eventModels.js';
import { withClientId, fetchJson, RECOMMENDATIONS_ENDPOINT } from './shared.js';

// Recommendations query schema
const RecommendationsQuerySchema = z.object({
  performer_id: z.number().nullable().optional().describe('Performer ID to seed recommendations'),
  event_id: z.number().nullable().optional().describe('Event ID to seed recommendations'),
  geoip: z.boolean().nullable().optional().describe('Use IP geolocation for recommendations'),
  lat: z.number().nullable().optional().describe('Latitude for location-based recommendations'),
  lon: z.number().nullable().optional().describe('Longitude for location-based recommendations'),
  postal_code: z.string().nullable().optional().describe('Postal code for location-based recommendations'),
  range: z.string().nullable().optional().describe('Range for location-based recommendations (e.g., "50mi")'),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type RecommendationsQuery = z.infer<typeof RecommendationsQuerySchema>;

function buildQuery(params: RecommendationsQuery): Record<string, any> {
  const query: Record<string, any> = {
    "performers.id": params.performer_id,
    "events.id": params.event_id,
    "geoip": params.geoip,
    "lat": params.lat,
    "lon": params.lon,
    "postal_code": params.postal_code,
    "range": params.range,
    per_page: params.per_page,
    page: params.page,
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
  performer_id: z.number().optional().describe('Performer ID to seed recommendations'),
  event_id: z.number().optional().describe('Event ID to seed recommendations'),
  geoip: z.boolean().optional().describe('Use IP geolocation for recommendations'),
  lat: z.number().optional().describe('Latitude for location-based recommendations'),
  lon: z.number().optional().describe('Longitude for location-based recommendations'),
  postal_code: z.string().optional().describe('Postal code for location-based recommendations'),
  range: z.string().optional().describe('Range for location-based recommendations (e.g., "50mi")'),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
};

// Recommendation response schema
const RecommendationSchema = z.object({
  performer: PerformerSchema,
  score: z.number(),
});

type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Get recommended events based on seed parameters.
 * Returns structured models or raw JSON with format='json'.
 */
export const recommendationsTool = {
  name: 'seatgeek_recommendations',
  description: 'Get recommended events based on seed parameters (performer, event, location). Returns structured models or raw JSON with format="json".',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    // Validate input
    const params = RecommendationsQuerySchema.parse(args);
    
    // Build query
    const query = buildQuery(params);
    
    // Fetch data
    const data = await fetchJson(RECOMMENDATIONS_ENDPOINT, query);
    
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
    // API may return an object with 'recommendations' or a bare array
    const recommendationsRaw = Array.isArray(data) ? data : (data.recommendations || []);
    const results: Recommendation[] = [];
    
    for (const item of recommendationsRaw) {
      try {
        const recommendation = RecommendationSchema.parse(item);
        results.push(recommendation);
      } catch (error) {
        // Skip invalid recommendations
        console.warn('Skipping invalid recommendation:', error);
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

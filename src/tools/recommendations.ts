import { z } from 'zod';
import { PerformerSchema, Performer } from '../schemas/eventModels.js';
import { fetchJson, RECOMMENDATIONS_ENDPOINT } from './shared.js';

const RecommendationsQuerySchema = z.object({
  performer_id: z.number().nullable().optional(),
  event_id: z.number().nullable().optional(),
  geoip: z.boolean().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  range: z.string().nullable().optional(),
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
    per_page: Math.min(params.per_page, 50),
    page: params.page,
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
  performer_id: z.number().optional().describe('Performer ID to seed recommendations based on similar artists or events.'),
  event_id: z.number().optional().describe('Event ID to seed recommendations based on similar events or performers.'),
  geoip: z.boolean().optional().describe('Use IP geolocation to provide recommendations for events near the user.'),
  lat: z.number().optional().describe('Latitude coordinate for location-based recommendations. Use with lon and optionally range.'),
  lon: z.number().optional().describe('Longitude coordinate for location-based recommendations. Use with lat and optionally range.'),
  postal_code: z.string().optional().describe('Postal code for location-based recommendations. Use with country code for better accuracy.'),
  range: z.string().optional().describe('Search radius for location-based recommendations (e.g., "50mi", "25km"). Use with lat/lon or postal_code.'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

const RecommendationSchema = z.object({
  event: z.any(), // For now, we'll use any type for the event object
  score: z.number(),
});

type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Get recommended events based on seed parameters.
 * Returns structured models or raw JSON with format='json'.
 */
export const recommendationsTool = {
  name: 'get_recommendations',
  description: 'Get personalized event recommendations based on performers, events, or location. Use performer_id for recommendations similar to a specific artist, event_id for recommendations similar to a particular event, or location parameters (geoip, lat/lon, postal_code) for nearby events. Each recommendation includes a relevance score and event details.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = RecommendationsQuerySchema.parse(args);
      const query = buildQuery(params);
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
    } catch (error) {
      console.error('Error in get_recommendations handler:', error);
      
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
              error: 'Failed to fetch recommendations',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid performer IDs, event IDs, or location parameters.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

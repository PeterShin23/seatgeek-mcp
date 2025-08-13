import { z } from 'zod';
import { PerformerSchema, Performer } from '../schemas/eventModels.js';
import { PERFORMERS_ENDPOINT, fetchJson } from './shared.js';

const PerformersQuerySchema = z.object({
  q: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().nullable().optional(),
  format: z.enum(['structured', 'json']).default('structured')
});

type PerformersQuery = z.infer<typeof PerformersQuerySchema>;

function buildQuery(params: PerformersQuery): Record<string, any> {
  const query: Record<string, any> = {
    q: params.q,
    slug: params.slug,
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
  q: z.string().optional().describe('Free-text search term for performer names. Use only when no other specific filters match the user request.'),
  slug: z.string().optional().describe('The slug of the performer to search for. Use artist name (not tour name), e.g., "the-weeknd" or "taylor-swift".'),
  per_page: z.number().min(1).max(50).default(10).describe('Number of results to return per page (1-50). Default is 10.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  sort: z.string().optional().describe('Sort order for results. Common values: "name" (alphabetical), "popularity", "score" (relevance).'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * List SeatGeek performers with simple filters (q, id, slug, type).
 * Returns structured models or raw JSON with format='json'.
 */
export const listPerformersTool = {
  name: 'list_performers',
  description: 'Search for performers and artists by name or slug. Use this tool to find information about artists, bands, sports teams, and other performers. Use slug for exact matches (e.g., "the-weeknd") or q for free-text searches. Returns performer details including images, URLs, and taxonomy information.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = PerformersQuerySchema.parse(args);
      const query = buildQuery(params);
      const data = await fetchJson(PERFORMERS_ENDPOINT, query);
      
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
      
      // API may return an object with 'performers' or a bare array
      const performersRaw = Array.isArray(data) ? data : (data.performers || []);
      const results: Performer[] = [];
      
      for (const item of performersRaw) {
        try {
          const performer = PerformerSchema.parse(item);
          results.push(performer);
        } catch (error) {
          // Skip invalid performers
          console.warn('Skipping invalid performer:', error);
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
      console.error('Error in list_performers handler:', error);
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: PERFORMERS_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch performers',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid performer slugs or search terms.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

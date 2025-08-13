import { z } from 'zod';
import { PerformerSchema, Performer } from '../schemas/eventModels.js';
import { PERFORMERS_ENDPOINT, withClientId, fetchJson } from './shared.js';

// Performers query schema
const PerformersQuerySchema = z.object({
  q: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().nullable().optional(),
  format: z.enum(['structured', 'json']).default('structured').describe('Always use "structured" unless the user explicitly requests raw JSON. This is for output formatting, not for API parsing.'),
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

  return withClientId(filteredQuery);
}

const inputSchema = {
  q: z.string().optional().describe('Free-text search that should be used if no other filters are matched and/or provided'),
  slug: z.string().optional().describe('The slug of the performer to filter events by, e.g., "the-weeknd"'),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort: z.string().optional(),
  format: z.enum(['structured', 'json']).default('structured'),
};

/**
 * List SeatGeek performers with simple filters (q, id, slug, type).
 * Returns structured models or raw JSON with format='json'.
 */
export const listPerformersTool = {
  name: 'seatgeek_performers',
  description: 'List performers that are hosting an event (slug for performer query). Map performer to the artist\'s name (not the tour). Returns structured models or raw JSON with format="json".',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    // Validate input
    const params = PerformersQuerySchema.parse(args);
    
    // Build query
    const query = buildQuery(params);
    
    // Fetch data
    const data = await fetchJson(PERFORMERS_ENDPOINT, query);
    
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
  },
};

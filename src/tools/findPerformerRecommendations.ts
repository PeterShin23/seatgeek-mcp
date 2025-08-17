import { z } from 'zod';
import { PerformerSchema, Performer } from '../schemas/eventModels.js';
import { fetchJson, RECOMMENDATIONS_ENDPOINT } from '../shared/core.js';
import { searchPerformers, searchEvents } from '../shared/endpoints.js';

// Schema for performer recommendations
const PerformerRecommendationsQuerySchema = z.object({
  event_q: z.string().nullable().optional(),
  performer_q: z.string().nullable().optional(),
  venue_city: z.string().nullable().optional(),
  venue_state: z.string().nullable().optional(),
  venue_country: z.string().nullable().optional(),
  start_utc: z.string().nullable().optional(),
  end_utc: z.string().nullable().optional(),
  per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  format: z.enum(['structured', 'json']).default('structured'),
});

type PerformerRecommendationsQuery = z.infer<typeof PerformerRecommendationsQuerySchema>;

function buildQuery(params: PerformerRecommendationsQuery, performerIds: number[] = [], eventIds: number[] = []): Record<string, any> {
  const query: Record<string, any> = {
    per_page: Math.min(params.per_page, 50),
    page: params.page,
  };
  
  // Add venue location - API expects flat format
  if (params.venue_city) {
    query["venue.city"] = params.venue_city;
  }
  if (params.venue_state) {
    query["venue.state"] = params.venue_state;
  }
  if (params.venue_country) {
    query["venue.country"] = params.venue_country;
  }
  
  // Add date filters if provided
  if (params.start_utc) {
    query["datetime_utc.gte"] = params.start_utc;
  }
  if (params.end_utc) {
    query["datetime_utc.lte"] = params.end_utc;
  }
  
  // Add performer and event IDs if provided
  if (performerIds.length > 0) {
    query["performer_ids"] = performerIds.join(',');
  }
  
  if (eventIds.length > 0) {
    query["event_ids"] = eventIds.join(',');
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
  event_q: z.string().optional().describe('Search query to find events to base recommendations on. If provided, the system will first look up the event ID automatically.'),
  performer_q: z.string().optional().describe('Search query to find performers to base recommendations on. If provided, the system will first look up the performer ID automatically.'),
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
 * Find performer recommendations based on events and/or performers.
 * 
 * Uses the event_q parameter on the GET /events endpoint to search for events.
 * Uses the performer_q parameter on the GET /performers endpoint to find performers.
 * Then calls the GET /recommendations/performers endpoint with the found performer ids and event ids.
 * 
 * Returns a list of recommended performers based on the search criteria.
 */
export const findPerformerRecommendationsTool = {
  name: 'find_performer_recommendations',
  description: 'Get personalized performer recommendations based on performers, events, or location. This tool first searches for performers and/or events based on the queries, then uses the IDs to find similar performers. Use location parameters (geoip, lat/lon, postal_code) for nearby performers.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = PerformerRecommendationsQuerySchema.parse(args);
      const performerIds: number[] = [];
      const eventIds: number[] = [];
      
      // If we have event_q or performer_q parameters, try to look up IDs concurrently
      if (params.event_q || params.performer_q) {
        try {
          // Create promises for concurrent execution
          const promises = [];
          
          // Add performer lookup promise if performer_q is provided
          if (params.performer_q) {
            const performerPromise = searchPerformers(params.performer_q, params.per_page, 1).then(performers => {
              if (performers.length > 0) {
                // Get unique performer IDs
                const uniqueIds = [...new Set(performers.map((p: any) => p.id).filter(Boolean))] as number[];
                performerIds.push(...uniqueIds);
              }
            });
            promises.push(performerPromise);
          }
          
          // Add event lookup promise if event_q is provided
          if (params.event_q) {
            // Prepare additional parameters for the event search
            const additionalParams: Record<string, any> = {};
            
            // Add venue location parameters
            if (params.venue_city) {
              additionalParams["venue.city"] = params.venue_city;
            }
            if (params.venue_state) {
              additionalParams["venue.state"] = params.venue_state;
            }
            if (params.venue_country) {
              additionalParams["venue.country"] = params.venue_country;
            }
            
            // Add date filters
            if (params.start_utc) {
              additionalParams["datetime_utc.gte"] = params.start_utc;
            }
            if (params.end_utc) {
              additionalParams["datetime_utc.lte"] = params.end_utc;
            }
            
            const eventPromise = searchEvents(params.event_q, params.per_page, additionalParams).then(events => {
              if (events.length > 0) {
                // Get unique event IDs
                const uniqueIds = [...new Set(events.map((e: any) => e.id).filter(Boolean))] as number[];
                eventIds.push(...uniqueIds);
              }
            });
            promises.push(eventPromise);
          }
          
          // Execute both promises concurrently
          await Promise.all(promises);
        } catch (error) {
          // If lookup fails, continue with original query
          console.warn('Failed to lookup performer or event, continuing with original query:', error);
        }
      }
      
      // Build query with found IDs
      const query = buildQuery(params, performerIds, eventIds);
      
      // For performer recommendations, we need to use the correct endpoint
      // The recommendations endpoint for performers is still RECOMMENDATIONS_ENDPOINT
      // but with different query parameters
      const data = await fetchJson(`${RECOMMENDATIONS_ENDPOINT}/performers`, query);
      
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
      
      // Extract performers from recommendations
      const recommendationsRaw = Array.isArray(data) ? data : (data.recommendations || []);
      const results: Performer[] = [];
      
      for (const item of recommendationsRaw) {
        try {
          // Each recommendation has a performer object
          if (item.performer) {
            const performer = PerformerSchema.parse(item.performer);
            results.push(performer);
          }
        } catch (error) {
          // Skip invalid performers
          console.warn('Skipping invalid performer recommendation:', error);
        }
      }
            
      // Limit results to per_page
      const limitedResults = results.slice(0, params.per_page);
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(limitedResults, null, 2)
          }
        ]
      };
    } catch (error) {
      console.error('Error in find_performer_recommendations handler:', error);
      
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
              error: 'Failed to fetch performer recommendations',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid performer IDs, event IDs, or location parameters.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

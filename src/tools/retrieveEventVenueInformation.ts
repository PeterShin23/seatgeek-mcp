import { z } from 'zod';
import { fetchJson, EVENTS_ENDPOINT, SECTION_INFO_ENDPOINT } from '../shared/core.js';
import { searchEvents } from '../shared/endpoints.js';

const EventVenueInformationQuerySchema = z.object({
  event_id: z.number().describe('The unique identifier for the event to retrieve venue information for. This ID is obtained from the event.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
});

type EventVenueInformationQuery = z.infer<typeof EventVenueInformationQuerySchema>;

const SectionInfoSchema = z.object({
  sections: z.record(z.array(z.string())).nullable(),
});

const inputSchema = {
  event_id: z.number().describe('The unique identifier for the event to retrieve venue information for. This ID is obtained from the event.'),
  page: z.number().min(1).default(1).describe('Page number for pagination. Default is 1.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Get section and row information for an event.
 * Returns detailed information about the sections and rows available for a specific event. This is useful for understanding the venue layout and available seating options.
 * 
 * This should first call GET /events with the q parameter to get the event id.
 * It should use the event id to then call the above endpoint to retrieve more information about the section.
 */
export const retrieveEventVenueInformationTool = {
  name: 'retrieve_event_venue_information',
  description: 'Get detailed seating information including sections and rows for a specific event. This tool first searches for the event using the provided query, then retrieves detailed venue layout information. Useful for understanding venue seating options and making ticket purchasing decisions.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = EventVenueInformationQuerySchema.parse(args);
      
      // Call the section info endpoint with the event ID
      const data = await fetchJson(`${SECTION_INFO_ENDPOINT}/${params.event_id}`, {});
      
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
      
      try {
        const sectionInfo = SectionInfoSchema.parse(data);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(sectionInfo, null, 2)
            }
          ]
        };
      } catch (error) {
        // Return raw data if parsing fails
        console.warn('Failed to parse section info:', error);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    } catch (error) {
      console.error('Error in retrieve_event_venue_information handler:', error);
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch event venue information',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid search terms or the event not having section information available.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

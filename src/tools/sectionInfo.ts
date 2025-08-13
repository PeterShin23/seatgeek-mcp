import { z } from 'zod';
import { fetchJson, SECTION_INFO_ENDPOINT } from './shared.js';

const SectionInfoSchema = z.object({
  sections: z.record(z.array(z.string())).nullable(),
});

const inputSchema = {
  eventId: z.number().describe('The unique ID of the event to get detailed section and seating information for. This should be a valid event ID from the SeatGeek API.'),
  format: z.enum(['structured', 'json']).default('structured').describe('Output format. Use "structured" for readable format (default) or "json" for raw API response. Only use "json" if explicitly requested.'),
};

/**
 * Get section and row information for a specific event.
 * Returns detailed information about the sections and rows available for a specific event.
 */
export const sectionInfoTool = {
  name: 'get_event_sections',
  description: 'Get detailed seating information including sections and rows for a specific event. Use this tool to understand the venue layout, available seating sections, and row information for ticket purchasing decisions. Requires a valid event ID from the SeatGeek API.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    try {
      const params = z.object({
        eventId: z.number(),
        format: z.enum(['structured', 'json']).default('structured').optional(),
      }).parse(args);
      
      const url = `${SECTION_INFO_ENDPOINT}/${params.eventId}`;
      const data = await fetchJson(url, {});
      
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
      console.error('Error in get_event_sections handler:', error);
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorDetails = {
        error: 'API_REQUEST_FAILED',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        endpoint: SECTION_INFO_ENDPOINT,
        args: args
      };
      
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Failed to fetch section information',
              details: errorDetails,
              suggestion: 'Please check your parameters and try again. Common issues include invalid event IDs or the event not having section information available.'
            }, null, 2)
          }
        ]
      };
    }
  },
};

import { z } from 'zod';
import { withClientId, fetchJson, SECTION_INFO_ENDPOINT } from './shared.js';

// Section info response schema
const SectionInfoSchema = z.object({
  sections: z.record(z.array(z.string())).nullable(),
});

const inputSchema = {
  eventId: z.number().describe('The ID of the event to get section information for'),
  format: z.enum(['structured', 'json']).default('structured').describe('Always use "structured" unless the user explicitly requests raw JSON. This is for output formatting, not for API parsing.'),
};

/**
 * Get section and row information for a specific event.
 * Returns detailed information about the sections and rows available for a specific event.
 */
export const sectionInfoTool = {
  name: 'seatgeek_event_sections',
  description: 'Get section and row information for a specific event. Returns detailed information about the sections and rows available for a specific event.',
  inputSchema: inputSchema,
  handler: async (args: any, extra: any) => {
    // Validate input with more flexible parsing
    const params = z.object({
      eventId: z.number(),
      format: z.enum(['structured', 'json']).default('structured').optional(),
    }).parse(args);
    
    // Build URL with event ID
    const url = `${SECTION_INFO_ENDPOINT}/${params.eventId}`;
    
    // Build query
    const query = withClientId({});
    
    // Fetch data
    const data = await fetchJson(url, query);
    
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
  },
};

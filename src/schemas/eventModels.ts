import { z } from 'zod';

// Image set schema
export const ImageSetSchema = z.object({
  huge: z.string().nullable(),
  large: z.string().nullable(),
  medium: z.string().nullable(),
  small: z.string().nullable(),
});

// Performer schema
export const PerformerSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  short_name: z.string().nullable(),
  slug: z.string().nullable(),
  type: z.string().nullable(),
  url: z.string().nullable(),
  image: z.string().nullable(),
  images: ImageSetSchema.nullable(),
  primary: z.boolean().nullable(),
  score: z.number().nullable(),
});

// Venue location schema
export const VenueLocationSchema = z.object({
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});

// Venue schema
export const VenueSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
  extended_address: z.string().nullable(),
  url: z.string().nullable(),
  score: z.number().nullable(),
  location: VenueLocationSchema.nullable(),
});

// Taxonomy schema
export const TaxonomySchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  parent_id: z.string().nullable(),
});

// Integrated schema
export const IntegratedSchema = z.object({
  provider_id: z.string().nullable(),
  provider_name: z.string().nullable(),
});

// Event schema
export const EventSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  short_title: z.string().nullable(),
  type: z.string().nullable(),
  url: z.string().nullable(),
  score: z.number().nullable(),
  announce_date: z.string().nullable(),
  datetime_local: z.string().nullable(),
  datetime_utc: z.string().nullable(),
  datetime_tbd: z.boolean().nullable(),
  date_tbd: z.boolean().nullable(),
  time_tbd: z.boolean().nullable(),
  visible_until: z.string().nullable(),
  performers: z.array(PerformerSchema).nullable(),
  venue: VenueSchema.nullable(),
  taxonomies: z.array(TaxonomySchema).nullable(),
  integrated: IntegratedSchema.nullable(),
  venue_display: z.string().nullable(),
});

// Type exports
export type ImageSet = z.infer<typeof ImageSetSchema>;
export type Performer = z.infer<typeof PerformerSchema>;
export type VenueLocation = z.infer<typeof VenueLocationSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type Taxonomy = z.infer<typeof TaxonomySchema>;
export type Integrated = z.infer<typeof IntegratedSchema>;
export type Event = z.infer<typeof EventSchema>;

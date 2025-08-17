// Condensed event data format
interface CondensedPerformer {
  name: string | null;
  short_name: string | null;
  slug: string | null;
  url: string | null;
  image: string | null;
  genres: string[];
  popularity: number | null;
  num_upcoming_events: number | null;
}

interface CondensedVenue {
  name: string | null;
  slug: string | null;
  display_location: string | null;
  address: string | null;
  extended_address: string | null;
  capacity: number | null;
  url: string | null;
  timezone: string | null;
  lat: number | null;
  lon: number | null;
}

export interface CondensedEvent {
  id: number;
  title: string | null;
  short_title: string | null;
  type: string | null;
  status: string | null;
  url: string | null;
  datetime_local: string | null;
  datetime_utc: string | null;
  enddatetime_utc: string | null;
  performers: CondensedPerformer[];
  venue: CondensedVenue | null;
  popularity: number | null;
}

export function condenseEventData(event: any): CondensedEvent {
  // Condense performers data
  const condensedPerformers: CondensedPerformer[] = (event.performers || []).map((performer: any) => ({
    name: performer.name,
    short_name: performer.short_name,
    slug: performer.slug,
    url: performer.url,
    image: performer.image,
    genres: (performer.genres || []).map((genre: any) => genre.name).filter(Boolean),
    popularity: performer.popularity,
    num_upcoming_events: performer.num_upcoming_events
  }));

  // Condense venue data
  let condensedVenue: CondensedVenue | null = null;
  if (event.venue) {
    condensedVenue = {
      name: event.venue.name,
      slug: event.venue.slug,
      display_location: event.venue.display_location || (event.venue.city && event.venue.state ? `${event.venue.city}, ${event.venue.state}` : null),
      address: event.venue.address,
      extended_address: event.venue.extended_address,
      capacity: event.venue.capacity,
      url: event.venue.url,
      timezone: event.venue.timezone,
      lat: event.venue.location?.lat || null,
      lon: event.venue.location?.lon || null
    };
  }

  return {
    id: event.id,
    title: event.title,
    short_title: event.short_title,
    type: event.type,
    status: event.status,
    url: event.url,
    datetime_local: event.datetime_local,
    datetime_utc: event.datetime_utc,
    enddatetime_utc: event.enddatetime_utc,
    performers: condensedPerformers,
    venue: condensedVenue,
    popularity: event.popularity
  };
}

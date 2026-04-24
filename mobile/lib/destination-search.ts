export type DestinationOption = {
  id: string;
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

type OpenMeteoResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

export async function searchDestinations(query: string): Promise<DestinationOption[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', q);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'pt');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: OpenMeteoResult[] };

  return (json.results ?? []).map((r) => {
    const state = r.admin1 ? `, ${r.admin1}` : '';
    return {
      id: String(r.id),
      city: r.name,
      country: r.country,
      label: `${r.name}${state}, ${r.country}`,
      latitude: r.latitude,
      longitude: r.longitude,
    };
  });
}


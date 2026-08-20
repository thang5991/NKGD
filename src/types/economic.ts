export type EconomicImpact = 1 | 2 | 3;

export interface EconomicEvent {
  id: string;
  date: string;
  currency: string;
  country: string;
  title: string;
  category?: string;
  importance: EconomicImpact;
  actual?: string;
  forecast?: string;
  previous?: string;
  revised?: string;
  unit?: string;
  source: string;
  sourceUrl?: string;
}

export interface EconomicCalendarResponse {
  events: EconomicEvent[];
  source: string;
  fetchedAt: string;
  cached: boolean;
}

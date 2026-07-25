// types.ts

export type Group = {
  id: string;
  name: string;
  members: string[];
};

export type UserLocation = {
  uid: string;
  lat: number;
  lng: number;
};

export type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  details?: PlaceDetails;
  photos?: string[];
  eta?: string; // normal ETA
  trafficEta?: string; // LIVE traffic ETA
  };
export type PlaceDetails = {
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  formatted_address?: string;
};
export type Language = "en" | "ta";

export interface CropPrice {
  crop: string;
  Tamil: string;
  price: number;
  change: string;
  trend: "up" | "down";
  isUp?: boolean;
}

export interface PredictionResult {
  distanceKm: number;
  storageType: "Cold" | "Dry" | "Normal";
  tempRange: string;
  recommendedVehicle: string;
  estimatedCost: number;
  capacityLimit: string;
  tamilStorage: string;
  tamilTemp: string;
  reasoningEn: string;
  reasoningTa: string;
}

export interface Vehicle {
  id: string;
  name: string;
  tamilName: string;
  image: string;
  driverName: string;
  driverTamilName: string;
  driverPhone: string;
  capacity: string;
  storageType: "Cold" | "Dry" | "Normal";
  price: number;
  imageType: "mini" | "pickup" | "reefer";
  rating?: number;
  ratingCount?: number;
  ratings?: number[];
}

export interface TrackerState {
  currentDistance: number;
  totalDistance: number;
  remainingDistance: number;
  temperatureC: number;
  cargoTempRange: string;
  etaMinutes: number;
  status: "departed" | "mid-way" | "approaching" | "arrived";
}

export interface CompletedTrip {
  id: string;
  cargo: string;
  route: string;
  driverName: string;
  payout: number;
  timestamp: string;
}


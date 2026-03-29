// ============================================================
// MLS Data — Type Definitions, Teams & Helpers
// Data arrays (players, matches, budgets) are loaded asynchronously
// from /data/mls2025.json and /data/mls2026.json via seasonDataLoader.ts
// ============================================================

// --- TYPE DEFINITIONS ---
export interface Team {
  id: string;
  name: string;
  short: string;
  stadium: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  color: string;
  conference: "Eastern" | "Western";
}

export interface Player {
  id: number;
  name: string;
  team: string;
  position: "GK" | "DF" | "MF" | "FW";
  nationality: string;
  age: number;
  games: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  shots: number;
  shotsOnTarget: number;
  shotAccuracy: number;
  fouls: number;
  fouled: number;
  tackles: number;
  interceptions: number;
  crosses: number;
  offsides: number;
  salary: number;
}

export interface Match {
  id: number;
  week: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  attendance: number;
  venue: string;
}

export interface TeamBudget {
  totalSalary: number;
  playerCount: number;
  dpSalary: number;
  dpCount: number;
  tamSalary: number;
  tamCount: number;
  regularSalary: number;
  regularCount: number;
}

export const TEAMS: Team[] = [
  {
    id: "ATL",
    name: "Atlanta United FC",
    short: "Atlanta Utd",
    stadium: "Mercedes-Benz Stadium",
    city: "Atlanta",
    state: "GA",
    lat: 33.7553,
    lng: -84.4006,
    color: "#A29061",
    conference: "Eastern",
  },
  {
    id: "ATX",
    name: "Austin FC",
    short: "Austin FC",
    stadium: "Q2 Stadium",
    city: "Austin",
    state: "TX",
    lat: 30.3887,
    lng: -97.7191,
    color: "#00B140",
    conference: "Western",
  },
  {
    id: "MTL",
    name: "CF Montréal",
    short: "CF Montréal",
    stadium: "Saputo Stadium",
    city: "Montréal",
    state: "QC",
    lat: 45.5631,
    lng: -73.5526,
    color: "#000000",
    conference: "Eastern",
  },
  {
    id: "CLT",
    name: "Charlotte FC",
    short: "Charlotte FC",
    stadium: "Bank of America Stadium",
    city: "Charlotte",
    state: "NC",
    lat: 35.2258,
    lng: -80.8528,
    color: "#1A85C8",
    conference: "Eastern",
  },
  {
    id: "CHI",
    name: "Chicago Fire FC",
    short: "Chicago Fire",
    stadium: "Soldier Field",
    city: "Chicago",
    state: "IL",
    lat: 41.8623,
    lng: -87.6167,
    color: "#FF0000",
    conference: "Eastern",
  },
  {
    id: "COL",
    name: "Colorado Rapids",
    short: "Colorado Rapids",
    stadium: "Dick's Sporting Goods Park",
    city: "Commerce City",
    state: "CO",
    lat: 39.8056,
    lng: -104.8917,
    color: "#862633",
    conference: "Western",
  },
  {
    id: "CLB",
    name: "Columbus Crew",
    short: "Columbus Crew",
    stadium: "Lower.com Field",
    city: "Columbus",
    state: "OH",
    lat: 39.9689,
    lng: -83.0172,
    color: "#000000",
    conference: "Eastern",
  },
  {
    id: "DC",
    name: "D.C. United",
    short: "D.C. United",
    stadium: "Audi Field",
    city: "Washington",
    state: "DC",
    lat: 38.8686,
    lng: -77.0128,
    color: "#000000",
    conference: "Eastern",
  },
  {
    id: "CIN",
    name: "FC Cincinnati",
    short: "FC Cincinnati",
    stadium: "TQL Stadium",
    city: "Cincinnati",
    state: "OH",
    lat: 39.1112,
    lng: -84.5217,
    color: "#FC4C02",
    conference: "Eastern",
  },
  {
    id: "DAL",
    name: "FC Dallas",
    short: "FC Dallas",
    stadium: "Toyota Stadium",
    city: "Frisco",
    state: "TX",
    lat: 33.1543,
    lng: -96.8353,
    color: "#E81F3E",
    conference: "Western",
  },
  {
    id: "HOU",
    name: "Houston Dynamo FC",
    short: "Houston Dynamo",
    stadium: "Shell Energy Stadium",
    city: "Houston",
    state: "TX",
    lat: 29.7522,
    lng: -95.3544,
    color: "#FF6B00",
    conference: "Western",
  },
  {
    id: "MIA",
    name: "Inter Miami CF",
    short: "Inter Miami",
    stadium: "Chase Stadium",
    city: "Fort Lauderdale",
    state: "FL",
    lat: 26.1928,
    lng: -80.16,
    color: "#F7B5CD",
    conference: "Eastern",
  },
  {
    id: "LAG",
    name: "LA Galaxy",
    short: "LA Galaxy",
    stadium: "Dignity Health Sports Park",
    city: "Carson",
    state: "CA",
    lat: 33.8644,
    lng: -118.2611,
    color: "#00245D",
    conference: "Western",
  },
  {
    id: "LAFC",
    name: "Los Angeles FC",
    short: "LAFC",
    stadium: "BMO Stadium",
    city: "Los Angeles",
    state: "CA",
    lat: 34.0128,
    lng: -118.2844,
    color: "#C39E6D",
    conference: "Western",
  },
  {
    id: "MIN",
    name: "Minnesota United FC",
    short: "Minnesota Utd",
    stadium: "Allianz Field",
    city: "Saint Paul",
    state: "MN",
    lat: 44.9531,
    lng: -93.1653,
    color: "#8CD2F4",
    conference: "Western",
  },
  {
    id: "NSH",
    name: "Nashville SC",
    short: "Nashville SC",
    stadium: "Geodis Park",
    city: "Nashville",
    state: "TN",
    lat: 36.1303,
    lng: -86.7658,
    color: "#ECE83A",
    conference: "Eastern",
  },
  {
    id: "NE",
    name: "New England Revolution",
    short: "NE Revolution",
    stadium: "Gillette Stadium",
    city: "Foxborough",
    state: "MA",
    lat: 42.0909,
    lng: -71.2643,
    color: "#0A2240",
    conference: "Eastern",
  },
  {
    id: "NYRB",
    name: "New York Red Bulls",
    short: "NY Red Bulls",
    stadium: "Sports Illustrated Stadium",
    city: "Harrison",
    state: "NJ",
    lat: 40.7369,
    lng: -74.1503,
    color: "#ED1E36",
    conference: "Eastern",
  },
  {
    id: "NYC",
    name: "New York City FC",
    short: "NYCFC",
    stadium: "Yankee Stadium",
    city: "Bronx",
    state: "NY",
    lat: 40.8296,
    lng: -73.9262,
    color: "#6CACE4",
    conference: "Eastern",
  },
  {
    id: "ORL",
    name: "Orlando City SC",
    short: "Orlando City",
    stadium: "Inter&Co Stadium",
    city: "Orlando",
    state: "FL",
    lat: 28.5412,
    lng: -81.3894,
    color: "#633492",
    conference: "Eastern",
  },
  {
    id: "PHI",
    name: "Philadelphia Union",
    short: "Philadelphia Union",
    stadium: "Subaru Park",
    city: "Chester",
    state: "PA",
    lat: 39.8328,
    lng: -75.3789,
    color: "#071B2C",
    conference: "Eastern",
  },
  {
    id: "POR",
    name: "Portland Timbers",
    short: "Portland Timbers",
    stadium: "Providence Park",
    city: "Portland",
    state: "OR",
    lat: 45.5215,
    lng: -122.6917,
    color: "#004812",
    conference: "Western",
  },
  {
    id: "RSL",
    name: "Real Salt Lake",
    short: "Real Salt Lake",
    stadium: "America First Field",
    city: "Sandy",
    state: "UT",
    lat: 40.5828,
    lng: -111.8933,
    color: "#B30838",
    conference: "Western",
  },
  {
    id: "SD",
    name: "San Diego FC",
    short: "San Diego FC",
    stadium: "Snapdragon Stadium",
    city: "San Diego",
    state: "CA",
    lat: 32.7831,
    lng: -117.1196,
    color: "#7B2D8E",
    conference: "Western",
  },
  {
    id: "SEA",
    name: "Seattle Sounders FC",
    short: "Seattle Sounders",
    stadium: "Lumen Field",
    city: "Seattle",
    state: "WA",
    lat: 47.5952,
    lng: -122.3316,
    color: "#5D9741",
    conference: "Western",
  },
  {
    id: "SJ",
    name: "San Jose Earthquakes",
    short: "SJ Earthquakes",
    stadium: "PayPal Park",
    city: "San Jose",
    state: "CA",
    lat: 37.3517,
    lng: -121.925,
    color: "#0067B1",
    conference: "Western",
  },
  {
    id: "SKC",
    name: "Sporting Kansas City",
    short: "Sporting KC",
    stadium: "Children's Mercy Park",
    city: "Kansas City",
    state: "KS",
    lat: 39.1217,
    lng: -94.8231,
    color: "#93B1D7",
    conference: "Western",
  },
  {
    id: "STL",
    name: "St. Louis City SC",
    short: "St. Louis City",
    stadium: "Energizer Park",
    city: "St. Louis",
    state: "MO",
    lat: 38.6318,
    lng: -90.2073,
    color: "#D22630",
    conference: "Western",
  },
  {
    id: "TOR",
    name: "Toronto FC",
    short: "Toronto FC",
    stadium: "BMO Field",
    city: "Toronto",
    state: "ON",
    lat: 43.6332,
    lng: -79.4186,
    color: "#E31937",
    conference: "Eastern",
  },
  {
    id: "VAN",
    name: "Vancouver Whitecaps FC",
    short: "Vancouver W'caps",
    stadium: "BC Place Stadium",
    city: "Vancouver",
    state: "BC",
    lat: 49.2768,
    lng: -123.11,
    color: "#00245E",
    conference: "Western",
  },
];

// --- HELPER FUNCTIONS ---
export function getTeam(id: string): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// MLS 2025 Comprehensive Data Layer
// "Dark Forge" Industrial Neumorphism — Data Observatory

export interface Team {
  id: string;
  name: string;
  shortName: string;
  stadium: string;
  capacity: number;
  conference: 'Eastern' | 'Western';
  city: string;
  state: string;
  lat: number;
  lng: number;
  primaryColor: string;
  secondaryColor: string;
  budget: number;
  dpSpend: number;
  tamSpend: number;
  gamSpend: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  positionDetail: string;
  nationality: string;
  age: number;
  salary: number;
  gamesPlayed: number;
  gamesStarted: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passesCompleted: number;
  passesAttempted: number;
  passAccuracy: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
  foulsCommitted: number;
  foulsDrawn: number;
  yellowCards: number;
  redCards: number;
  saves?: number;
  cleanSheets?: number;
  xG: number;
  xA: number;
}

export interface Match {
  id: string;
  week: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  attendance: number;
  stadium: string;
}

export interface HeatmapData {
  playerId: string;
  zones: number[][]; // 12x8 grid
}

export interface ShotData {
  playerId: string;
  teamId: string;
  x: number;
  y: number;
  xG: number;
  result: 'goal' | 'saved' | 'blocked' | 'off_target';
  minute: number;
  matchId: string;
}

export interface PassNetwork {
  teamId: string;
  matchId: string;
  nodes: { playerId: string; x: number; y: number; passes: number }[];
  links: { source: string; target: string; weight: number }[];
}

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => +(rand() * (max - min) + min).toFixed(2);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ============ TEAMS ============
export const teams: Team[] = [
  { id: 'ATL', name: 'Atlanta United FC', shortName: 'Atlanta', stadium: 'Mercedes-Benz Stadium', capacity: 42500, conference: 'Eastern', city: 'Atlanta', state: 'GA', lat: 33.7553, lng: -84.4006, primaryColor: '#80000A', secondaryColor: '#A29061', budget: 28.5, dpSpend: 12.1, tamSpend: 9.2, gamSpend: 7.2, wins: 12, draws: 8, losses: 14, goalsFor: 45, goalsAgainst: 48, points: 44 },
  { id: 'AUS', name: 'Austin FC', shortName: 'Austin', stadium: 'Q2 Stadium', capacity: 20738, conference: 'Western', city: 'Austin', state: 'TX', lat: 30.3882, lng: -97.7195, primaryColor: '#00B140', secondaryColor: '#000000', budget: 21.3, dpSpend: 8.5, tamSpend: 7.1, gamSpend: 5.7, wins: 10, draws: 10, losses: 14, goalsFor: 38, goalsAgainst: 44, points: 40 },
  { id: 'MTL', name: 'CF Montréal', shortName: 'Montréal', stadium: 'Saputo Stadium', capacity: 19619, conference: 'Eastern', city: 'Montréal', state: 'QC', lat: 45.5630, lng: -73.5527, primaryColor: '#00529B', secondaryColor: '#9B9B9B', budget: 16.8, dpSpend: 5.2, tamSpend: 6.3, gamSpend: 5.3, wins: 8, draws: 9, losses: 17, goalsFor: 32, goalsAgainst: 52, points: 33 },
  { id: 'CLT', name: 'Charlotte FC', shortName: 'Charlotte', stadium: 'Bank of America Stadium', capacity: 38000, conference: 'Eastern', city: 'Charlotte', state: 'NC', lat: 35.2258, lng: -80.8528, primaryColor: '#1A85C8', secondaryColor: '#FFFFFF', budget: 22.1, dpSpend: 9.0, tamSpend: 7.5, gamSpend: 5.6, wins: 11, draws: 11, losses: 12, goalsFor: 42, goalsAgainst: 40, points: 44 },
  { id: 'CHI', name: 'Chicago Fire FC', shortName: 'Chicago', stadium: 'Soldier Field', capacity: 24955, conference: 'Eastern', city: 'Chicago', state: 'IL', lat: 41.8623, lng: -87.6167, primaryColor: '#AF2626', secondaryColor: '#0A174A', budget: 19.5, dpSpend: 7.8, tamSpend: 6.2, gamSpend: 5.5, wins: 9, draws: 10, losses: 15, goalsFor: 36, goalsAgainst: 47, points: 37 },
  { id: 'COL', name: 'Colorado Rapids', shortName: 'Colorado', stadium: "Dick's Sporting Goods Park", capacity: 18061, conference: 'Western', city: 'Commerce City', state: 'CO', lat: 39.8056, lng: -104.8920, primaryColor: '#862633', secondaryColor: '#8BB8E8', budget: 17.2, dpSpend: 6.0, tamSpend: 5.8, gamSpend: 5.4, wins: 13, draws: 7, losses: 14, goalsFor: 44, goalsAgainst: 46, points: 46 },
  { id: 'CLB', name: 'Columbus Crew', shortName: 'Columbus', stadium: 'Lower.com Field', capacity: 20011, conference: 'Eastern', city: 'Columbus', state: 'OH', lat: 39.9685, lng: -82.9830, primaryColor: '#FEF200', secondaryColor: '#000000', budget: 24.8, dpSpend: 10.5, tamSpend: 8.0, gamSpend: 6.3, wins: 15, draws: 9, losses: 10, goalsFor: 52, goalsAgainst: 38, points: 54 },
  { id: 'DC', name: 'D.C. United', shortName: 'D.C. United', stadium: 'Audi Field', capacity: 20000, conference: 'Eastern', city: 'Washington', state: 'DC', lat: 38.8686, lng: -77.0128, primaryColor: '#000000', secondaryColor: '#EF3E42', budget: 20.1, dpSpend: 8.2, tamSpend: 6.5, gamSpend: 5.4, wins: 10, draws: 8, losses: 16, goalsFor: 37, goalsAgainst: 50, points: 38 },
  { id: 'CIN', name: 'FC Cincinnati', shortName: 'Cincinnati', stadium: 'TQL Stadium', capacity: 26000, conference: 'Eastern', city: 'Cincinnati', state: 'OH', lat: 39.1110, lng: -84.5217, primaryColor: '#F05323', secondaryColor: '#263B80', budget: 26.3, dpSpend: 11.2, tamSpend: 8.5, gamSpend: 6.6, wins: 16, draws: 8, losses: 10, goalsFor: 55, goalsAgainst: 39, points: 56 },
  { id: 'DAL', name: 'FC Dallas', shortName: 'Dallas', stadium: 'Toyota Stadium', capacity: 20500, conference: 'Western', city: 'Frisco', state: 'TX', lat: 33.1543, lng: -96.8353, primaryColor: '#BF0D3E', secondaryColor: '#002B5C', budget: 18.9, dpSpend: 7.0, tamSpend: 6.5, gamSpend: 5.4, wins: 9, draws: 11, losses: 14, goalsFor: 35, goalsAgainst: 43, points: 38 },
  { id: 'HOU', name: 'Houston Dynamo FC', shortName: 'Houston', stadium: 'Shell Energy Stadium', capacity: 22039, conference: 'Western', city: 'Houston', state: 'TX', lat: 29.7522, lng: -95.3544, primaryColor: '#FF6B00', secondaryColor: '#101820', budget: 22.5, dpSpend: 9.3, tamSpend: 7.2, gamSpend: 6.0, wins: 12, draws: 9, losses: 13, goalsFor: 43, goalsAgainst: 42, points: 45 },
  { id: 'MIA', name: 'Inter Miami CF', shortName: 'Miami', stadium: 'Chase Stadium', capacity: 21550, conference: 'Eastern', city: 'Fort Lauderdale', state: 'FL', lat: 26.1930, lng: -80.1609, primaryColor: '#F7B5CD', secondaryColor: '#231F20', budget: 42.8, dpSpend: 22.5, tamSpend: 11.0, gamSpend: 9.3, wins: 20, draws: 6, losses: 8, goalsFor: 68, goalsAgainst: 35, points: 66 },
  { id: 'LAG', name: 'LA Galaxy', shortName: 'Galaxy', stadium: 'Dignity Health Sports Park', capacity: 27000, conference: 'Western', city: 'Carson', state: 'CA', lat: 33.8644, lng: -118.2611, primaryColor: '#00245D', secondaryColor: '#FFD200', budget: 30.2, dpSpend: 14.0, tamSpend: 9.5, gamSpend: 6.7, wins: 16, draws: 7, losses: 11, goalsFor: 54, goalsAgainst: 41, points: 55 },
  { id: 'LAFC', name: 'Los Angeles FC', shortName: 'LAFC', stadium: 'BMO Stadium', capacity: 22000, conference: 'Western', city: 'Los Angeles', state: 'CA', lat: 34.0128, lng: -118.2843, primaryColor: '#C39E6D', secondaryColor: '#000000', budget: 32.5, dpSpend: 15.2, tamSpend: 10.0, gamSpend: 7.3, wins: 17, draws: 8, losses: 9, goalsFor: 58, goalsAgainst: 37, points: 59 },
  { id: 'MIN', name: 'Minnesota United FC', shortName: 'Minnesota', stadium: 'Allianz Field', capacity: 19400, conference: 'Western', city: 'Saint Paul', state: 'MN', lat: 44.9531, lng: -93.1654, primaryColor: '#E4E5E6', secondaryColor: '#8CD2F4', budget: 19.8, dpSpend: 7.5, tamSpend: 6.8, gamSpend: 5.5, wins: 11, draws: 9, losses: 14, goalsFor: 40, goalsAgainst: 45, points: 42 },
  { id: 'NSH', name: 'Nashville SC', shortName: 'Nashville', stadium: 'Geodis Park', capacity: 30000, conference: 'Eastern', city: 'Nashville', state: 'TN', lat: 36.1303, lng: -86.7660, primaryColor: '#ECE83A', secondaryColor: '#1F1646', budget: 23.5, dpSpend: 9.8, tamSpend: 7.5, gamSpend: 6.2, wins: 14, draws: 10, losses: 10, goalsFor: 48, goalsAgainst: 38, points: 52 },
  { id: 'NE', name: 'New England Revolution', shortName: 'New England', stadium: 'Gillette Stadium', capacity: 20000, conference: 'Eastern', city: 'Foxborough', state: 'MA', lat: 42.0909, lng: -71.2643, primaryColor: '#0A2240', secondaryColor: '#CE0E2D', budget: 18.2, dpSpend: 6.5, tamSpend: 6.2, gamSpend: 5.5, wins: 7, draws: 10, losses: 17, goalsFor: 30, goalsAgainst: 51, points: 31 },
  { id: 'NYC', name: 'New York City FC', shortName: 'NYCFC', stadium: 'Yankee Stadium', capacity: 28743, conference: 'Eastern', city: 'New York', state: 'NY', lat: 40.8296, lng: -73.9262, primaryColor: '#6CACE4', secondaryColor: '#F15524', budget: 27.5, dpSpend: 12.0, tamSpend: 8.8, gamSpend: 6.7, wins: 13, draws: 10, losses: 11, goalsFor: 47, goalsAgainst: 42, points: 49 },
  { id: 'RB', name: 'New York Red Bulls', shortName: 'Red Bulls', stadium: 'Sports Illustrated Stadium', capacity: 25000, conference: 'Eastern', city: 'Harrison', state: 'NJ', lat: 40.7369, lng: -74.1503, primaryColor: '#ED1E36', secondaryColor: '#002B5C', budget: 21.8, dpSpend: 8.8, tamSpend: 7.0, gamSpend: 6.0, wins: 12, draws: 11, losses: 11, goalsFor: 44, goalsAgainst: 40, points: 47 },
  { id: 'ORL', name: 'Orlando City SC', shortName: 'Orlando', stadium: 'Inter&Co Stadium', capacity: 25500, conference: 'Eastern', city: 'Orlando', state: 'FL', lat: 28.5411, lng: -81.3894, primaryColor: '#633492', secondaryColor: '#FDE192', budget: 23.0, dpSpend: 9.5, tamSpend: 7.5, gamSpend: 6.0, wins: 13, draws: 8, losses: 13, goalsFor: 46, goalsAgainst: 44, points: 47 },
  { id: 'PHI', name: 'Philadelphia Union', shortName: 'Philadelphia', stadium: 'Subaru Park', capacity: 18500, conference: 'Eastern', city: 'Chester', state: 'PA', lat: 39.8328, lng: -75.3789, primaryColor: '#002B5C', secondaryColor: '#B18500', budget: 20.5, dpSpend: 8.0, tamSpend: 7.0, gamSpend: 5.5, wins: 14, draws: 9, losses: 11, goalsFor: 49, goalsAgainst: 40, points: 51 },
  { id: 'POR', name: 'Portland Timbers', shortName: 'Portland', stadium: 'Providence Park', capacity: 25218, conference: 'Western', city: 'Portland', state: 'OR', lat: 45.5215, lng: -122.6916, primaryColor: '#004812', secondaryColor: '#D69A00', budget: 22.0, dpSpend: 9.0, tamSpend: 7.2, gamSpend: 5.8, wins: 13, draws: 8, losses: 13, goalsFor: 45, goalsAgainst: 43, points: 47 },
  { id: 'RSL', name: 'Real Salt Lake', shortName: 'Salt Lake', stadium: 'America First Field', capacity: 20213, conference: 'Western', city: 'Sandy', state: 'UT', lat: 40.5829, lng: -111.8933, primaryColor: '#B30838', secondaryColor: '#013A81', budget: 18.5, dpSpend: 6.8, tamSpend: 6.2, gamSpend: 5.5, wins: 14, draws: 7, losses: 13, goalsFor: 47, goalsAgainst: 44, points: 49 },
  { id: 'SD', name: 'San Diego FC', shortName: 'San Diego', stadium: 'Snapdragon Stadium', capacity: 35000, conference: 'Western', city: 'San Diego', state: 'CA', lat: 32.7831, lng: -117.1196, primaryColor: '#00205B', secondaryColor: '#BC9B6A', budget: 25.0, dpSpend: 10.5, tamSpend: 8.0, gamSpend: 6.5, wins: 11, draws: 10, losses: 13, goalsFor: 41, goalsAgainst: 43, points: 43 },
  { id: 'SJ', name: 'San Jose Earthquakes', shortName: 'San Jose', stadium: 'PayPal Park', capacity: 18000, conference: 'Western', city: 'San Jose', state: 'CA', lat: 37.3514, lng: -121.9252, primaryColor: '#0067B1', secondaryColor: '#000000', budget: 15.8, dpSpend: 5.0, tamSpend: 5.5, gamSpend: 5.3, wins: 7, draws: 8, losses: 19, goalsFor: 28, goalsAgainst: 56, points: 29 },
  { id: 'SEA', name: 'Seattle Sounders FC', shortName: 'Seattle', stadium: 'Lumen Field', capacity: 37722, conference: 'Western', city: 'Seattle', state: 'WA', lat: 47.5952, lng: -122.3316, primaryColor: '#005695', secondaryColor: '#658D1B', budget: 26.8, dpSpend: 11.5, tamSpend: 8.5, gamSpend: 6.8, wins: 15, draws: 9, losses: 10, goalsFor: 51, goalsAgainst: 39, points: 54 },
  { id: 'SKC', name: 'Sporting Kansas City', shortName: 'Kansas City', stadium: "Children's Mercy Park", capacity: 18467, conference: 'Western', city: 'Kansas City', state: 'KS', lat: 39.1217, lng: -94.8231, primaryColor: '#002F65', secondaryColor: '#A4ADB3', budget: 19.0, dpSpend: 7.2, tamSpend: 6.5, gamSpend: 5.3, wins: 8, draws: 11, losses: 15, goalsFor: 33, goalsAgainst: 47, points: 35 },
  { id: 'STL', name: 'St. Louis City SC', shortName: 'St. Louis', stadium: 'Energizer Park', capacity: 22423, conference: 'Western', city: 'St. Louis', state: 'MO', lat: 38.6318, lng: -90.2073, primaryColor: '#D22630', secondaryColor: '#0A1E2C', budget: 21.0, dpSpend: 8.5, tamSpend: 7.0, gamSpend: 5.5, wins: 10, draws: 10, losses: 14, goalsFor: 39, goalsAgainst: 45, points: 40 },
  { id: 'TOR', name: 'Toronto FC', shortName: 'Toronto', stadium: 'BMO Field', capacity: 28351, conference: 'Eastern', city: 'Toronto', state: 'ON', lat: 43.6332, lng: -79.4186, primaryColor: '#B81137', secondaryColor: '#455560', budget: 25.5, dpSpend: 10.8, tamSpend: 8.2, gamSpend: 6.5, wins: 11, draws: 9, losses: 14, goalsFor: 40, goalsAgainst: 46, points: 42 },
  { id: 'VAN', name: 'Vancouver Whitecaps FC', shortName: 'Vancouver', stadium: 'BC Place', capacity: 22120, conference: 'Western', city: 'Vancouver', state: 'BC', lat: 49.2768, lng: -123.1118, primaryColor: '#00245E', secondaryColor: '#9DC2EA', budget: 18.0, dpSpend: 6.5, tamSpend: 6.0, gamSpend: 5.5, wins: 12, draws: 8, losses: 14, goalsFor: 42, goalsAgainst: 46, points: 44 },
];

// ============ PLAYER NAMES ============
const firstNames = ['Carlos', 'James', 'Diego', 'Lucas', 'Marco', 'Sebastian', 'Alejandro', 'Tyler', 'Brandon', 'Christian', 'Jordan', 'Kevin', 'Daniel', 'Miguel', 'Oscar', 'Ryan', 'Derrick', 'Hector', 'Lionel', 'Riqui', 'Josef', 'Thiago', 'Cucho', 'Luciano', 'Denis', 'Giorgos', 'Xherdan', 'Lorenzo', 'Facundo', 'Brenner', 'Santiago', 'Luiz', 'Raul', 'Jesus', 'Aaron', 'Brooks', 'Walker', 'DeJuan', 'Kamal', 'Djordje', 'Luca', 'Matias', 'Federico', 'Gabriel', 'Andre', 'Joao', 'Pedro', 'Andres', 'Luis', 'Sergio'];
const lastNames = ['Martinez', 'Rodriguez', 'Gonzalez', 'Silva', 'Hernandez', 'Lopez', 'Torres', 'Zimmerman', 'Long', 'Acosta', 'Messi', 'Puig', 'Insigne', 'Almada', 'Hernandez', 'Bouanga', 'Shaqiri', 'Insigne', 'Torres', 'Brenner', 'Moreno', 'Araujo', 'Ruidiaz', 'Ferreira', 'Driussi', 'Gazdag', 'Klauss', 'Espinoza', 'Mihailovic', 'Carranza', 'Pellegrini', 'De la Vega', 'Campana', 'Rossi', 'Mukhtar', 'Rusnak', 'Zelarayan', 'Bernardeschi', 'Pozuelo', 'Chicharito'];
const nationalities = ['USA', 'Mexico', 'Argentina', 'Brazil', 'Colombia', 'Canada', 'Germany', 'Spain', 'France', 'England', 'Italy', 'Switzerland', 'Ecuador', 'Paraguay', 'Uruguay', 'Venezuela', 'Costa Rica', 'Honduras', 'Jamaica', 'Ghana', 'Nigeria', 'Japan', 'South Korea'];
const positionDetails: Record<string, string[]> = {
  GK: ['Goalkeeper'],
  DF: ['Center Back', 'Right Back', 'Left Back', 'Wing Back'],
  MF: ['Central Midfield', 'Defensive Midfield', 'Attacking Midfield', 'Right Wing', 'Left Wing'],
  FW: ['Striker', 'Center Forward', 'Second Striker', 'Winger'],
};

// ============ GENERATE PLAYERS ============
function generatePlayers(): Player[] {
  const players: Player[] = [];
  let playerId = 1;

  for (const team of teams) {
    const positionCounts = { GK: 3, DF: 8, MF: 9, FW: 5 };
    for (const [pos, count] of Object.entries(positionCounts)) {
      for (let i = 0; i < count; i++) {
        const position = pos as 'GK' | 'DF' | 'MF' | 'FW';
        const detail = pick(positionDetails[position]);
        const age = randInt(18, 36);
        const isStarter = i < (pos === 'GK' ? 1 : pos === 'DF' ? 4 : pos === 'MF' ? 4 : 2);
        const gp = isStarter ? randInt(24, 34) : randInt(5, 22);
        const gs = isStarter ? randInt(gp - 5, gp) : randInt(0, Math.min(gp, 8));
        const mins = isStarter ? randInt(gp * 70, gp * 90) : randInt(gp * 20, gp * 65);

        let goals = 0, assists = 0, shots = 0, sot = 0, xG = 0, xA = 0;
        let passComp = 0, passAtt = 0, tackles = 0, tacklesWon = 0, interceptions = 0;
        let saves: number | undefined, cleanSheets: number | undefined;

        if (position === 'FW') {
          goals = randInt(2, 18);
          assists = randInt(1, 10);
          shots = randInt(30, 120);
          sot = randInt(Math.floor(shots * 0.3), Math.floor(shots * 0.55));
          xG = randFloat(goals * 0.7, goals * 1.3);
          xA = randFloat(assists * 0.6, assists * 1.4);
          passComp = randInt(200, 600);
          passAtt = randInt(passComp, Math.floor(passComp * 1.25));
          tackles = randInt(5, 25);
          tacklesWon = randInt(Math.floor(tackles * 0.4), tackles);
          interceptions = randInt(3, 15);
        } else if (position === 'MF') {
          goals = randInt(0, 10);
          assists = randInt(2, 14);
          shots = randInt(15, 70);
          sot = randInt(Math.floor(shots * 0.25), Math.floor(shots * 0.5));
          xG = randFloat(goals * 0.6, goals * 1.4);
          xA = randFloat(assists * 0.7, assists * 1.3);
          passComp = randInt(500, 1500);
          passAtt = randInt(passComp, Math.floor(passComp * 1.2));
          tackles = randInt(20, 80);
          tacklesWon = randInt(Math.floor(tackles * 0.5), tackles);
          interceptions = randInt(15, 50);
        } else if (position === 'DF') {
          goals = randInt(0, 4);
          assists = randInt(0, 6);
          shots = randInt(5, 30);
          sot = randInt(Math.floor(shots * 0.2), Math.floor(shots * 0.45));
          xG = randFloat(0, goals * 1.5 + 0.5);
          xA = randFloat(0, assists * 1.5 + 0.3);
          passComp = randInt(600, 1800);
          passAtt = randInt(passComp, Math.floor(passComp * 1.15));
          tackles = randInt(40, 120);
          tacklesWon = randInt(Math.floor(tackles * 0.55), tackles);
          interceptions = randInt(30, 80);
        } else {
          goals = 0; assists = 0; shots = 0; sot = 0;
          xG = 0; xA = 0;
          passComp = randInt(200, 500);
          passAtt = randInt(passComp, Math.floor(passComp * 1.1));
          tackles = randInt(0, 5);
          tacklesWon = randInt(0, tackles);
          interceptions = randInt(0, 3);
          saves = randInt(40, 130);
          cleanSheets = randInt(3, 14);
        }

        const salary = position === 'FW' ? randInt(150000, 6500000) :
          position === 'MF' ? randInt(120000, 4500000) :
          position === 'DF' ? randInt(100000, 2500000) :
          randInt(80000, 1800000);

        players.push({
          id: `P${playerId++}`,
          name: `${pick(firstNames)} ${pick(lastNames)}`,
          teamId: team.id,
          position,
          positionDetail: detail,
          nationality: pick(nationalities),
          age,
          salary: team.id === 'MIA' && position === 'FW' && i === 0 ? 12000000 : salary,
          gamesPlayed: gp,
          gamesStarted: gs,
          minutesPlayed: mins,
          goals,
          assists,
          shots,
          shotsOnTarget: sot,
          passesCompleted: passComp,
          passesAttempted: passAtt,
          passAccuracy: passAtt > 0 ? +((passComp / passAtt) * 100).toFixed(1) : 0,
          tackles,
          tacklesWon,
          interceptions,
          foulsCommitted: randInt(5, 45),
          foulsDrawn: randInt(5, 40),
          yellowCards: randInt(0, 10),
          redCards: randInt(0, 2),
          saves,
          cleanSheets,
          xG,
          xA,
        });
      }
    }
  }
  return players;
}

// ============ GENERATE SCHEDULE ============
function generateSchedule(): Match[] {
  const matches: Match[] = [];
  let matchId = 1;
  const startDate = new Date('2025-02-22');

  // Generate 34 matchweeks
  for (let week = 1; week <= 34; week++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(weekDate.getDate() + (week - 1) * 7);

    // Each week has ~15 matches (30 teams / 2)
    const shuffled = [...teams].sort(() => rand() - 0.5);
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 >= shuffled.length) break;
      const home = shuffled[i];
      const away = shuffled[i + 1];
      const dayOffset = randInt(0, 2);
      const matchDate = new Date(weekDate);
      matchDate.setDate(matchDate.getDate() + dayOffset);

      // Attendance varies by team popularity and away team draw
      const baseAttendance = Math.floor(home.capacity * randFloat(0.65, 0.95));
      const awayBonus = away.id === 'MIA' ? randInt(2000, 5000) :
        away.id === 'LAG' || away.id === 'LAFC' ? randInt(1000, 3000) :
        randInt(-1000, 1500);
      const attendance = Math.min(home.capacity, Math.max(8000, baseAttendance + awayBonus));

      matches.push({
        id: `M${matchId++}`,
        week,
        date: matchDate.toISOString().split('T')[0],
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeScore: randInt(0, 4),
        awayScore: randInt(0, 3),
        attendance,
        stadium: home.stadium,
      });
    }
  }
  return matches;
}

// ============ GENERATE HEATMAPS ============
function generateHeatmap(playerId: string, position: string): HeatmapData {
  const zones: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 12; x++) {
      let intensity = rand() * 30;
      if (position === 'FW') {
        intensity += (x > 7 ? 40 : 0) + (y > 2 && y < 6 ? 20 : 0);
      } else if (position === 'MF') {
        intensity += (x > 3 && x < 9 ? 35 : 0) + (y > 1 && y < 7 ? 15 : 0);
      } else if (position === 'DF') {
        intensity += (x < 5 ? 40 : 0) + (y > 1 && y < 7 ? 20 : 0);
      } else {
        intensity += (x < 2 ? 60 : 0) + (y > 2 && y < 6 ? 25 : 0);
      }
      row.push(Math.min(100, Math.floor(intensity)));
    }
    zones.push(row);
  }
  return { playerId, zones };
}

// ============ GENERATE SHOTS ============
function generateShots(players: Player[], matches: Match[]): ShotData[] {
  const shots: ShotData[] = [];
  for (const p of players) {
    if (p.shots === 0) continue;
    const numShots = Math.min(p.shots, 40);
    const teamMatches = matches.filter(m => m.homeTeamId === p.teamId || m.awayTeamId === p.teamId);
    for (let i = 0; i < numShots; i++) {
      const match = pick(teamMatches);
      const isGoal = i < p.goals;
      shots.push({
        playerId: p.id,
        teamId: p.teamId,
        x: randFloat(60, 100),
        y: randFloat(10, 90),
        xG: randFloat(0.02, isGoal ? 0.85 : 0.35),
        result: isGoal ? 'goal' : pick(['saved', 'blocked', 'off_target']),
        minute: randInt(1, 90),
        matchId: match?.id || 'M1',
      });
    }
  }
  return shots;
}

// ============ GENERATE PASSING NETWORKS ============
function generatePassingNetworks(players: Player[], matches: Match[]): PassNetwork[] {
  const networks: PassNetwork[] = [];
  for (const team of teams) {
    const teamPlayers = players.filter(p => p.teamId === team.id && p.gamesStarted > 15).slice(0, 11);
    const teamMatches = matches.filter(m => m.homeTeamId === team.id).slice(0, 3);
    for (const match of teamMatches) {
      const nodes = teamPlayers.map((p, i) => {
        let x = 50, y = 50;
        if (p.position === 'GK') { x = 8; y = 50; }
        else if (p.position === 'DF') { x = randFloat(18, 30); y = randFloat(15 + i * 12, 25 + i * 12); }
        else if (p.position === 'MF') { x = randFloat(38, 58); y = randFloat(15 + (i - 4) * 15, 25 + (i - 4) * 15); }
        else { x = randFloat(68, 85); y = randFloat(25 + (i - 8) * 20, 35 + (i - 8) * 20); }
        return { playerId: p.id, x, y, passes: randInt(20, 70) };
      });
      const links: { source: string; target: string; weight: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (rand() > 0.4) {
            links.push({ source: nodes[i].playerId, target: nodes[j].playerId, weight: randInt(3, 25) });
          }
        }
      }
      networks.push({ teamId: team.id, matchId: match.id, nodes, links });
    }
  }
  return networks;
}

// ============ EXPORT GENERATED DATA ============
export const players = generatePlayers();
export const matches = generateSchedule();
export const heatmaps = players.filter(p => p.gamesStarted > 10).slice(0, 100).map(p => generateHeatmap(p.id, p.position));
export const shotData = generateShots(players, matches);
export const passingNetworks = generatePassingNetworks(players, matches);

// ============ HELPER FUNCTIONS ============
export function getTeam(id: string): Team | undefined {
  return teams.find(t => t.id === id);
}

export function getTeamPlayers(teamId: string): Player[] {
  return players.filter(p => p.teamId === teamId);
}

export function getTeamMatches(teamId: string): Match[] {
  return matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
}

export function getHomeAttendance(teamId: string): Match[] {
  return matches.filter(m => m.homeTeamId === teamId);
}

export function getAwayAttendanceDelta(homeTeamId: string): { awayTeam: string; avgDelta: number; matches: number }[] {
  const homeMatches = matches.filter(m => m.homeTeamId === homeTeamId);
  const avgHome = homeMatches.reduce((s, m) => s + m.attendance, 0) / homeMatches.length;
  const byAway: Record<string, number[]> = {};
  homeMatches.forEach(m => {
    if (!byAway[m.awayTeamId]) byAway[m.awayTeamId] = [];
    byAway[m.awayTeamId].push(m.attendance);
  });
  return Object.entries(byAway).map(([awayId, atts]) => ({
    awayTeam: awayId,
    avgDelta: +(atts.reduce((s, a) => s + a, 0) / atts.length - avgHome).toFixed(0),
    matches: atts.length,
  })).sort((a, b) => b.avgDelta - a.avgDelta);
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(0);
}

export interface FootballDataCompetition {
  id: number;
  name: string;
  code?: string | null;
  emblem?: string | null;
  area?: { name?: string | null } | null;
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName?: string | null;
  tla?: string | null;
  crest?: string | null;
}

export interface FootballDataPerson {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  position?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  role?: string | null;
}

export interface FootballDataTeamsResponse {
  competition: FootballDataCompetition;
  teams: FootballDataTeam[];
}

export interface FootballDataTeamResponse extends FootballDataTeam {
  squad?: FootballDataPerson[] | null;
}

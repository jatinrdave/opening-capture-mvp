export const schemaSql = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS projects (
  projectId TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS openings (
  openingId TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  label TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(projectId) REFERENCES projects(projectId)
);

CREATE TABLE IF NOT EXISTS sessions (
  sessionId TEXT PRIMARY KEY,
  openingId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  syncState TEXT NOT NULL,
  requiredPhotosJson TEXT NOT NULL,
  measurementsJson TEXT NOT NULL,
  toleranceConfigJson TEXT NOT NULL,
  toleranceResultsJson TEXT NOT NULL,
  overallStatus TEXT NOT NULL,
  FOREIGN KEY(openingId) REFERENCES openings(openingId)
);
`;

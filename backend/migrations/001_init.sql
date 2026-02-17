CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF');
CREATE TYPE tournament_status AS ENUM ('draft', 'scheduled', 'live', 'finished');
CREATE TYPE match_status AS ENUM ('pending', 'live', 'finished');

CREATE TABLE businesses (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255),
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  logo_url TEXT,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  username VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournaments (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  format VARCHAR(50) NOT NULL,
  status tournament_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_teams (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  club_name VARCHAR(255),
  logo TEXT,
  player1 VARCHAR(255),
  player2 VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_matches (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id BIGINT REFERENCES tournament_teams(id) ON DELETE SET NULL,
  away_team_id BIGINT REFERENCES tournament_teams(id) ON DELETE SET NULL,
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  status match_status NOT NULL DEFAULT 'pending',
  round_number INT,
  starts_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_standings (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  played INT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  draws INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  goals_for INT NOT NULL DEFAULT 0,
  goals_against INT NOT NULL DEFAULT 0,
  goal_diff INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_financials (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id BIGINT NOT NULL UNIQUE REFERENCES tournaments(id) ON DELETE CASCADE,
  entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  sponsor_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_teams INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_expenses (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_business_id ON users(business_id);
CREATE INDEX idx_tournaments_business_id ON tournaments(business_id);
CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_standings_tournament_id ON tournament_standings(tournament_id);
CREATE INDEX idx_financials_tournament_id ON tournament_financials(tournament_id);
CREATE INDEX idx_expenses_tournament_id ON tournament_expenses(tournament_id);


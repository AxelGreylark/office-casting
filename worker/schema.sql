CREATE TABLE IF NOT EXISTS votes (
  voter TEXT NOT NULL,
  person TEXT NOT NULL,
  character TEXT NOT NULL,
  PRIMARY KEY (voter, person)
);

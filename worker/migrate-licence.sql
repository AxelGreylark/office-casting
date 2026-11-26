-- One-off: add the licence column to votes cast before multi-licence support (all The Office).
CREATE TABLE votes_new (
  voter TEXT NOT NULL,
  person TEXT NOT NULL,
  licence TEXT NOT NULL,
  character TEXT NOT NULL,
  PRIMARY KEY (voter, person, licence)
);
INSERT INTO votes_new SELECT voter, person, 'the-office', character FROM votes;
DROP TABLE votes;
ALTER TABLE votes_new RENAME TO votes;

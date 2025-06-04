/*
  # Migrate transcripts to transcriptions

  Copies rows from the old `transcripts` table to the new
  `transcriptions` table if they don't already exist.
*/

INSERT INTO transcriptions(id, agent_id, content, metadata, created_at)
SELECT t.id, t.agent_id, t.content, '{}'::jsonb, t.created_at
FROM transcripts t
ON CONFLICT (id) DO NOTHING;

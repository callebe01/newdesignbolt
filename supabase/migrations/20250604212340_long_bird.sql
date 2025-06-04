/*
  # Add Personas Support
  
  1. New Tables
    - `personas`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text)
      - `instructions` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create personas table
CREATE TABLE IF NOT EXISTS personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  instructions text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view personas of own projects"
  ON personas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create personas in own projects"
  ON personas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update personas in own projects"
  ON personas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete personas in own projects"
  ON personas
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = personas.project_id
      AND projects.user_id = auth.uid()
    )
  );
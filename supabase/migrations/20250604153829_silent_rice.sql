/*
  # Initial Schema Setup

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key)
    
    - `sessions`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text)
      - `status` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `duration` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `session_insights`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `type` (text) - 'statement', 'preference', 'friction', or 'decision'
      - `content` (text)
      - `severity` (text) - only for friction type
      - `timestamp` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('scheduled', 'active', 'completed')),
  start_time timestamptz,
  end_time timestamptz,
  duration integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create session_insights table
CREATE TABLE IF NOT EXISTS session_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('statement', 'preference', 'friction', 'decision', 'hypothesis')),
  content text NOT NULL,
  severity text CHECK (severity IN ('low', 'medium', 'high')),
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_insights ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view sessions of own projects"
  ON sessions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = sessions.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create sessions in own projects"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = sessions.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sessions in own projects"
  ON sessions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = sessions.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sessions in own projects"
  ON sessions FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = sessions.project_id
    AND projects.user_id = auth.uid()
  ));

-- Session insights policies
CREATE POLICY "Users can view insights of own sessions"
  ON session_insights FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    JOIN projects ON projects.id = sessions.project_id
    WHERE sessions.id = session_insights.session_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create insights in own sessions"
  ON session_insights FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions
    JOIN projects ON projects.id = sessions.project_id
    WHERE sessions.id = session_insights.session_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update insights in own sessions"
  ON session_insights FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    JOIN projects ON projects.id = sessions.project_id
    WHERE sessions.id = session_insights.session_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete insights in own sessions"
  ON session_insights FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions
    JOIN projects ON projects.id = sessions.project_id
    WHERE sessions.id = session_insights.session_id
    AND projects.user_id = auth.uid()
  ));
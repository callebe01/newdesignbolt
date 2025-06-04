/*
  # Fix Project RLS Policies

  1. Changes
    - Add RLS policy for project creation
    - Update existing RLS policies to use user_id column
  
  2. Security
    - Enable RLS on projects table
    - Add policies for authenticated users to manage their own projects
*/

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;

-- Create new policies
CREATE POLICY "Users can create own projects" 
ON projects FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON projects FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON projects FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own projects" 
ON projects FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);
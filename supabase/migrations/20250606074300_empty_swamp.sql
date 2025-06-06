/*
  # Add Usage Tracking and Plan Enforcement

  1. New Tables
    - `user_usage`
      - Tracks monthly usage per user
      - Stores minutes used, agents created, etc.
    - `plan_limits`
      - Defines limits for each plan
      - Configurable plan restrictions

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create plan_limits table to define what each plan allows
CREATE TABLE IF NOT EXISTS plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  price_id text,
  monthly_minutes integer NOT NULL DEFAULT 0,
  max_agents integer NOT NULL DEFAULT 1,
  screen_sharing boolean NOT NULL DEFAULT false,
  embeddable_widget boolean NOT NULL DEFAULT false,
  overage_rate_cents integer DEFAULT 0, -- cents per minute
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert plan configurations
INSERT INTO plan_limits (plan_name, price_id, monthly_minutes, max_agents, screen_sharing, embeddable_widget, overage_rate_cents) VALUES
('Free Plan', 'price_1RWp5nKBPYVpbhiDV2v8HxwJ', 100, 1, false, false, 0),
('Starter Plan', 'price_1RWp6bKBPYVpbhiD4E9ToX8B', 1500, 3, true, false, 7),
('Growth Plan', 'price_1RWp7IKBPYVpbhiDmxB86OAY', 8000, 10, true, true, 0);

-- Create user_usage table to track monthly usage
CREATE TABLE IF NOT EXISTS user_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- Format: 'YYYY-MM'
  minutes_used integer NOT NULL DEFAULT 0,
  agents_created integer NOT NULL DEFAULT 0,
  overage_minutes integer NOT NULL DEFAULT 0,
  overage_charges_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Plan limits policies (readable by all authenticated users)
CREATE POLICY "Anyone can view plan limits"
  ON plan_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- User usage policies
CREATE POLICY "Users can view own usage"
  ON user_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON user_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage records"
  ON user_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_plan(user_uuid uuid)
RETURNS TABLE(
  plan_name text,
  monthly_minutes integer,
  max_agents integer,
  screen_sharing boolean,
  embeddable_widget boolean,
  overage_rate_cents integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to get plan from active subscription
  RETURN QUERY
  SELECT 
    pl.plan_name,
    pl.monthly_minutes,
    pl.max_agents,
    pl.screen_sharing,
    pl.embeddable_widget,
    pl.overage_rate_cents
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  JOIN plan_limits pl ON ss.price_id = pl.price_id
  WHERE sc.user_id = user_uuid 
    AND sc.deleted_at IS NULL 
    AND ss.deleted_at IS NULL
    AND ss.status = 'active'
  LIMIT 1;
  
  -- If no active subscription found, return free plan
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      pl.plan_name,
      pl.monthly_minutes,
      pl.max_agents,
      pl.screen_sharing,
      pl.embeddable_widget,
      pl.overage_rate_cents
    FROM plan_limits pl
    WHERE pl.plan_name = 'Free Plan'
    LIMIT 1;
  END IF;
END;
$$;

-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION can_user_perform_action(
  user_uuid uuid,
  action_type text, -- 'create_agent', 'start_call', 'use_screen_share'
  duration_minutes integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan RECORD;
  current_usage RECORD;
  current_month text;
BEGIN
  -- Get user's plan
  SELECT * INTO user_plan FROM get_user_plan(user_uuid);
  
  IF user_plan IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current month in YYYY-MM format
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get or create current usage record
  SELECT * INTO current_usage 
  FROM user_usage 
  WHERE user_id = user_uuid AND month_year = current_month;
  
  IF current_usage IS NULL THEN
    INSERT INTO user_usage (user_id, month_year)
    VALUES (user_uuid, current_month);
    
    SELECT * INTO current_usage 
    FROM user_usage 
    WHERE user_id = user_uuid AND month_year = current_month;
  END IF;
  
  -- Check specific action
  CASE action_type
    WHEN 'create_agent' THEN
      RETURN current_usage.agents_created < user_plan.max_agents;
    
    WHEN 'start_call' THEN
      -- For free plan, block if over limit
      IF user_plan.plan_name = 'Free Plan' THEN
        RETURN (current_usage.minutes_used + duration_minutes) <= user_plan.monthly_minutes;
      END IF;
      -- For paid plans, allow but track overage
      RETURN true;
    
    WHEN 'use_screen_share' THEN
      RETURN user_plan.screen_sharing;
    
    WHEN 'use_widget' THEN
      RETURN user_plan.embeddable_widget;
    
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Function to record usage
CREATE OR REPLACE FUNCTION record_usage(
  user_uuid uuid,
  usage_type text, -- 'minutes', 'agent_created'
  amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month text;
  user_plan RECORD;
  overage_minutes integer := 0;
  overage_cost integer := 0;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Get user's plan for overage calculation
  SELECT * INTO user_plan FROM get_user_plan(user_uuid);
  
  -- Insert or update usage record
  INSERT INTO user_usage (user_id, month_year, minutes_used, agents_created)
  VALUES (
    user_uuid, 
    current_month,
    CASE WHEN usage_type = 'minutes' THEN amount ELSE 0 END,
    CASE WHEN usage_type = 'agent_created' THEN amount ELSE 0 END
  )
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    minutes_used = user_usage.minutes_used + 
      CASE WHEN usage_type = 'minutes' THEN amount ELSE 0 END,
    agents_created = user_usage.agents_created + 
      CASE WHEN usage_type = 'agent_created' THEN amount ELSE 0 END,
    updated_at = now();
  
  -- Calculate overage for minutes if applicable
  IF usage_type = 'minutes' AND user_plan.overage_rate_cents > 0 THEN
    SELECT minutes_used INTO overage_minutes
    FROM user_usage 
    WHERE user_id = user_uuid AND month_year = current_month;
    
    IF overage_minutes > user_plan.monthly_minutes THEN
      overage_minutes := overage_minutes - user_plan.monthly_minutes;
      overage_cost := overage_minutes * user_plan.overage_rate_cents;
      
      UPDATE user_usage 
      SET 
        overage_minutes = overage_minutes,
        overage_charges_cents = overage_cost,
        updated_at = now()
      WHERE user_id = user_uuid AND month_year = current_month;
    END IF;
  END IF;
END;
$$;
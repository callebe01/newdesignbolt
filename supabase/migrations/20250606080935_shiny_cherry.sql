/*
  # Add Unlimited Plan and Authorize Specific User

  1. New Plan
    - Add "Unlimited Plan" to plan_limits table
    - Set very high limits to simulate unlimited usage

  2. User Authorization
    - Create a special table for authorized unlimited users
    - Add callebe0@gmail.com to the authorized users
*/

-- Add unlimited plan to plan_limits
INSERT INTO plan_limits (
  plan_name, 
  price_id, 
  monthly_minutes, 
  max_agents, 
  screen_sharing, 
  embeddable_widget, 
  overage_rate_cents
) VALUES (
  'Unlimited Plan', 
  'unlimited_plan', 
  999999, -- Very high number to simulate unlimited
  999, -- Very high number to simulate unlimited
  true, 
  true, 
  0
) ON CONFLICT (plan_name) DO UPDATE SET
  monthly_minutes = 999999,
  max_agents = 999,
  screen_sharing = true,
  embeddable_widget = true,
  overage_rate_cents = 0;

-- Create table for authorized unlimited users
CREATE TABLE IF NOT EXISTS authorized_unlimited_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE authorized_unlimited_users ENABLE ROW LEVEL SECURITY;

-- Add policy for viewing authorized users (admin only)
CREATE POLICY "Only system can view authorized users"
  ON authorized_unlimited_users
  FOR SELECT
  TO authenticated
  USING (false); -- No one can view this table directly

-- Insert the authorized email
INSERT INTO authorized_unlimited_users (email) 
VALUES ('callebe0@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Update the get_user_plan function to check for unlimited authorization
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
DECLARE
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = user_uuid;
  
  -- Check if user is authorized for unlimited plan
  IF EXISTS (
    SELECT 1 FROM authorized_unlimited_users 
    WHERE email = user_email
  ) THEN
    -- Update the user_id in authorized_unlimited_users if not set
    UPDATE authorized_unlimited_users 
    SET user_id = user_uuid, updated_at = now()
    WHERE email = user_email AND user_id IS NULL;
    
    -- Return unlimited plan
    RETURN QUERY
    SELECT 
      pl.plan_name,
      pl.monthly_minutes,
      pl.max_agents,
      pl.screen_sharing,
      pl.embeddable_widget,
      pl.overage_rate_cents
    FROM plan_limits pl
    WHERE pl.plan_name = 'Unlimited Plan'
    LIMIT 1;
    RETURN;
  END IF;
  
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

-- Update the can_user_perform_action function to handle unlimited users
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
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = user_uuid;
  
  -- Check if user is authorized for unlimited access
  IF EXISTS (
    SELECT 1 FROM authorized_unlimited_users 
    WHERE email = user_email
  ) THEN
    -- Unlimited users can do everything
    RETURN true;
  END IF;
  
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
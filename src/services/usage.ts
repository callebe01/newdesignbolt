import { supabase } from './supabase';

export interface UserPlan {
  plan_name: string;
  monthly_minutes: number;
  max_agents: number;
  screen_sharing: boolean;
  embeddable_widget: boolean;
  overage_rate_cents: number;
}

export interface UserUsage {
  id: string;
  user_id: string;
  month_year: string;
  minutes_used: number;
  agents_created: number;
  overage_minutes: number;
  overage_charges_cents: number;
  created_at: string;
  updated_at: string;
}

export async function getUserPlan(): Promise<UserPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('get_user_plan', {
    user_uuid: user.id
  });

  if (error) {
    console.error('Error fetching user plan:', error);
    return null;
  }

  return data[0] || null;
}

export async function getCurrentUsage(): Promise<UserUsage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', user.id)
    .eq('month_year', currentMonth)
    .maybeSingle();

  if (error) {
    console.error('Error fetching usage:', error);
    return null;
  }

  return data;
}

export async function canUserPerformAction(
  actionType: 'create_agent' | 'start_call' | 'use_screen_share' | 'use_widget',
  durationMinutes: number = 0
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc('can_user_perform_action', {
    user_uuid: user.id,
    action_type: actionType,
    duration_minutes: durationMinutes
  });

  if (error) {
    console.error('Error checking user permissions:', error);
    return false;
  }

  return data;
}

export async function recordUsage(
  usageType: 'minutes' | 'agent_created',
  amount: number = 1
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('record_usage', {
    user_uuid: user.id,
    usage_type: usageType,
    amount: amount
  });

  if (error) {
    console.error('Error recording usage:', error);
    throw error;
  }
}

export function formatUsageLimit(used: number, limit: number): string {
  if (limit === 0) return `${used} used`;
  return `${used} / ${limit}`;
}

export function getUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

export function isOverLimit(used: number, limit: number): boolean {
  return used > limit;
}
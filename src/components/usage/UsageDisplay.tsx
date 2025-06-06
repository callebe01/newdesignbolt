import React from 'react';
import { Clock, Bot, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useUsage } from '../../context/UsageContext';
import { formatUsageLimit, getUsagePercentage } from '../../services/usage';

export const UsageDisplay: React.FC = () => {
  const { plan, usage, loading } = useUsage();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse-subtle">Loading usage data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!plan || !usage) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Unable to load usage data</div>
        </CardContent>
      </Card>
    );
  }

  const minutesPercentage = getUsagePercentage(usage.minutes_used, plan.monthly_minutes);
  const agentsPercentage = getUsagePercentage(usage.agents_created, plan.max_agents);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Usage - {plan.plan_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Minutes Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm font-medium">Minutes Used</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatUsageLimit(usage.minutes_used, plan.monthly_minutes)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                minutesPercentage > 100 ? 'bg-destructive' :
                minutesPercentage > 80 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(minutesPercentage, 100)}%` }}
            />
          </div>
          {plan.plan_name === 'Free Plan' && minutesPercentage > 80 && (
            <p className="text-xs text-muted-foreground">
              {minutesPercentage > 100 ? 'Limit exceeded - upgrade to continue' : 'Approaching limit'}
            </p>
          )}
        </div>

        {/* Agents Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot className="h-4 w-4 mr-2 text-accent" />
              <span className="text-sm font-medium">Agents Created</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatUsageLimit(usage.agents_created, plan.max_agents)}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                agentsPercentage > 100 ? 'bg-destructive' :
                agentsPercentage > 80 ? 'bg-warning' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(agentsPercentage, 100)}%` }}
            />
          </div>
          {agentsPercentage > 80 && (
            <p className="text-xs text-muted-foreground">
              {agentsPercentage > 100 ? 'Limit reached - delete agents or upgrade' : 'Approaching limit'}
            </p>
          )}
        </div>

        {/* Overage Charges */}
        {usage.overage_charges_cents > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2 text-warning" />
                <span className="text-sm font-medium">Overage Charges</span>
              </div>
              <span className="text-sm font-medium text-warning">
                ${(usage.overage_charges_cents / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {usage.overage_minutes} minutes over limit at ${(plan.overage_rate_cents / 100).toFixed(2)}/min
            </p>
          </div>
        )}

        {/* Plan Features */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Plan Features</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={plan.screen_sharing ? 'text-success' : 'text-muted-foreground'}>
              {plan.screen_sharing ? '✓' : '✗'} Screen Sharing
            </div>
            <div className={plan.embeddable_widget ? 'text-success' : 'text-muted-foreground'}>
              {plan.embeddable_widget ? '✓' : '✗'} Embeddable Widget
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
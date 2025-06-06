import React from 'react';
import { AlertTriangle, Zap, CreditCard } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useUsage } from '../../context/UsageContext';
import { formatUsageLimit, getUsagePercentage, isOverLimit } from '../../services/usage';

interface UsageWarningProps {
  onUpgrade?: () => void;
}

export const UsageWarning: React.FC<UsageWarningProps> = ({ onUpgrade }) => {
  const { plan, usage } = useUsage();

  if (!plan || !usage) return null;

  const minutesUsed = usage.minutes_used;
  const minutesLimit = plan.monthly_minutes;
  const agentsCreated = usage.agents_created;
  const agentsLimit = plan.max_agents;

  const minutesPercentage = getUsagePercentage(minutesUsed, minutesLimit);
  const agentsPercentage = getUsagePercentage(agentsCreated, agentsLimit);

  const isMinutesOverLimit = isOverLimit(minutesUsed, minutesLimit);
  const isAgentsOverLimit = isOverLimit(agentsCreated, agentsLimit);
  const isNearMinutesLimit = minutesPercentage >= 80;
  const isNearAgentsLimit = agentsPercentage >= 80;

  // Don't show warning if everything is fine
  if (!isMinutesOverLimit && !isAgentsOverLimit && !isNearMinutesLimit && !isNearAgentsLimit) {
    return null;
  }

  const getWarningLevel = () => {
    if (isMinutesOverLimit || isAgentsOverLimit) return 'error';
    if (isNearMinutesLimit || isNearAgentsLimit) return 'warning';
    return 'info';
  };

  const warningLevel = getWarningLevel();

  const getIcon = () => {
    switch (warningLevel) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <Zap className="h-5 w-5 text-warning" />;
      default:
        return <CreditCard className="h-5 w-5 text-primary" />;
    }
  };

  const getTitle = () => {
    if (isMinutesOverLimit && plan.plan_name === 'Free Plan') {
      return 'Usage Limit Exceeded';
    }
    if (isAgentsOverLimit) {
      return 'Agent Limit Reached';
    }
    if (isNearMinutesLimit || isNearAgentsLimit) {
      return 'Approaching Usage Limits';
    }
    return 'Usage Update';
  };

  const getMessage = () => {
    const messages = [];
    
    if (isMinutesOverLimit && plan.plan_name === 'Free Plan') {
      messages.push(`You've used ${minutesUsed} minutes this month (limit: ${minutesLimit}). Upgrade to continue using the service.`);
    } else if (isMinutesOverLimit && plan.overage_rate_cents > 0) {
      const overageMinutes = minutesUsed - minutesLimit;
      const overageCost = (overageMinutes * plan.overage_rate_cents) / 100;
      messages.push(`You've exceeded your ${minutesLimit} minute limit by ${overageMinutes} minutes. Overage charges: $${overageCost.toFixed(2)}`);
    } else if (isNearMinutesLimit) {
      messages.push(`You've used ${formatUsageLimit(minutesUsed, minutesLimit)} minutes this month (${minutesPercentage.toFixed(0)}% of limit).`);
    }

    if (isAgentsOverLimit) {
      messages.push(`You've reached your agent limit (${formatUsageLimit(agentsCreated, agentsLimit)}). Delete an agent or upgrade to create more.`);
    } else if (isNearAgentsLimit) {
      messages.push(`You've created ${formatUsageLimit(agentsCreated, agentsLimit)} agents (${agentsPercentage.toFixed(0)}% of limit).`);
    }

    return messages.join(' ');
  };

  return (
    <Card className={`border-l-4 ${
      warningLevel === 'error' ? 'border-l-destructive bg-destructive/5' :
      warningLevel === 'warning' ? 'border-l-warning bg-warning/5' :
      'border-l-primary bg-primary/5'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getIcon()}
          <div className="flex-1">
            <h3 className="font-medium text-sm">{getTitle()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getMessage()}
            </p>
            
            {usage.overage_charges_cents > 0 && (
              <div className="mt-2 p-2 bg-warning/10 rounded-md">
                <p className="text-sm font-medium text-warning">
                  Current overage charges: ${(usage.overage_charges_cents / 100).toFixed(2)}
                </p>
              </div>
            )}

            {(isMinutesOverLimit || isAgentsOverLimit || isNearMinutesLimit || isNearAgentsLimit) && onUpgrade && (
              <Button
                size="sm"
                className="mt-3"
                onClick={onUpgrade}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
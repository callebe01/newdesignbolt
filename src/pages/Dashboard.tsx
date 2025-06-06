import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Bot, Activity, Clock, Calendar } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { UsageWarning } from '../components/usage/UsageWarning';
import { UsageDisplay } from '../components/usage/UsageDisplay';
import { useAgents } from '../context/AgentContext';
import { useAuth } from '../context/AuthContext';
import { useUsage } from '../context/UsageContext';
import { formatDateTime } from '../utils/format';

export const Dashboard: React.FC = () => {
  const { agents, loading, error, fetchAgents } = useAgents();
  const { user } = useAuth();
  const { plan, usage } = useUsage();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const activeAgents = agents.filter(a => a.status === 'active');
  const totalConversations = agents.reduce((sum, agent) => sum + (agent.analytics?.totalConversations || 0), 0);
  const avgDuration = agents.reduce((sum, agent) => sum + (agent.analytics?.avgDuration || 0), 0) / (agents.length || 1);
  
  const handleUpgrade = () => {
    navigate('/settings#billing');
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name}
          </p>
        </div>
        
        <Link to="/agents/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </Link>
      </div>

      {/* Usage Warning */}
      <UsageWarning onUpgrade={handleUpgrade} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard 
            title="Total Agents" 
            value={agents.length.toString()} 
            icon={<Bot className="h-5 w-5" />} 
            trend={`${activeAgents.length} active`}
            trendPositive={activeAgents.length > 0}
          />
          
          <StatCard 
            title="Total Conversations" 
            value={totalConversations.toString()} 
            icon={<Activity className="h-5 w-5" />} 
            trend="Last 30 days"
          />
          
          <StatCard 
            title="Minutes Used" 
            value={usage?.minutes_used?.toString() || '0'}
            icon={<Clock className="h-5 w-5" />} 
            trend={`${plan?.monthly_minutes || 0} limit`}
          />
          
          <StatCard 
            title="Current Plan" 
            value={plan?.plan_name || 'Loading...'} 
            icon={<Calendar className="h-5 w-5" />} 
            trend={agents.length > 0 ? "Active today" : "No agents"}
          />
        </div>

        {/* Usage Display */}
        <div>
          <UsageDisplay />
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Your Agents</h2>
          <Link to="/agents">
            <Button variant="outline">View All Agents</Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="opacity-70 animate-pulse-subtle">
                <CardContent className="p-6">
                  <div className="h-7 bg-muted rounded-md"></div>
                  <div className="h-4 bg-muted rounded-md w-1/2 mt-2"></div>
                  <div className="h-4 bg-muted rounded-md mt-4"></div>
                  <div className="flex justify-between mt-4">
                    <div className="h-4 bg-muted rounded-md w-1/4"></div>
                    <div className="h-4 bg-muted rounded-md w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Failed to load agents. Please try again.
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.slice(0, 3).map(agent => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <Card className="transition-all hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{agent.name}</h3>
                      <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                        agent.status === 'active' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {agent.status.toUpperCase()}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {agent.instructions}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-primary" />
                          <span>{agent.callDuration}s max</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Activity className="mr-2 h-4 w-4 text-accent" />
                          <span>0 calls today</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first AI agent
            </p>
            <Link to="/agents/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon,
  trend,
  trendPositive
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-1">{value}</h3>
          </div>
          <div className="p-2 bg-muted rounded-md">
            {icon}
          </div>
        </div>
        
        {trend && (
          <div className={`text-xs mt-2 ${trendPositive ? 'text-success' : 'text-muted-foreground'}`}>
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
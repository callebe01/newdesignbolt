import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BarChart2, Activity, Users, Calendar } from 'lucide-react';
import { ProjectCard } from '../components/dashboard/ProjectCard';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { projects, loading, error, fetchProjects } = useProjects();
  const { user } = useAuth();
  
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  const recentProjects = projects.slice(0, 3);
  const totalSessions = projects.reduce((count, project) => count + project.sessions.length, 0);
  const activeSessions = projects.reduce(
    (count, project) => count + project.sessions.filter(s => s.status === 'active').length, 
    0
  );
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name}
          </p>
        </div>
        
        <Link to="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Projects" 
          value={projects.length.toString()} 
          icon={<BarChart2 className="h-5 w-5" />} 
          trend="+2 this month"
          trendPositive
        />
        
        <StatCard 
          title="Total Sessions" 
          value={totalSessions.toString()} 
          icon={<Activity className="h-5 w-5" />} 
          trend={`${activeSessions} active`}
          trendPositive={activeSessions > 0}
        />
        
        <StatCard 
          title="Team Members" 
          value="5" 
          icon={<Users className="h-5 w-5" />} 
          trend="Full team access"
        />
        
        <StatCard 
          title="Last Session" 
          value="2 days ago" 
          icon={<Calendar className="h-5 w-5" />} 
          trend="E-commerce checkout"
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recent Projects</h2>
          <Link to="/projects">
            <Button variant="outline">View All Projects</Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="opacity-70 animate-pulse-subtle">
                <CardHeader className="pb-3">
                  <div className="h-7 bg-muted rounded-md"></div>
                  <div className="h-4 bg-muted rounded-md w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded-md mb-4"></div>
                  <div className="h-4 bg-muted rounded-md w-3/4 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-muted rounded-md w-1/4"></div>
                    <div className="h-4 bg-muted rounded-md w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Failed to load projects. Please try again.
          </div>
        ) : recentProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <Card className="text-center p-8">
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first design testing project
            </p>
            <Link to="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </Card>
        )}
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recent Sessions</h2>
          <Link to="/sessions">
            <Button variant="outline">View All Sessions</Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="opacity-70 animate-pulse-subtle">
            <Card className="p-6">
              <div className="h-6 bg-muted rounded-md w-1/4 mb-4"></div>
              <div className="h-4 bg-muted rounded-md w-full mb-2"></div>
              <div className="h-4 bg-muted rounded-md w-3/4"></div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.flatMap(p => p.sessions)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 3)
              .map(session => {
                const project = projects.find(p => p.id === session.projectId);
                return (
                  <Link to={`/sessions/${session.id}`} key={session.id}>
                    <Card className="transition-all hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">{session.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {project?.name}
                            </p>
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                            session.status === 'active' 
                              ? 'bg-accent/10 text-accent' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {session.status.toUpperCase()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
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
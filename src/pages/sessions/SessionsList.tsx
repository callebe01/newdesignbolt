import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Filter, Search } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useProjects } from '../../context/ProjectContext';
import { formatDateTime, formatDuration } from '../../utils/format';
import { Session } from '../../types';

export const SessionsList: React.FC = () => {
  const { projects, fetchProjects, loading } = useProjects();
  
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  
  // Flatten all sessions from all projects
  const allSessions: (Session & { projectName: string })[] = projects.flatMap(project =>
    project.sessions.map(session => ({
      ...session,
      projectName: project.name
    }))
  );
  
  // Sort by most recent first
  const sortedSessions = [...allSessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sessions</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            className="pl-9"
            fullWidth
          />
        </div>
        <Button variant="outline" className="sm:w-auto w-full">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse-subtle"></div>
          ))}
        </div>
      ) : sortedSessions.length > 0 ? (
        <div className="space-y-4">
          {sortedSessions.map(session => (
            <Link to={`/sessions/${session.id}`} key={session.id}>
              <Card className="transition-all hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold">{session.name}</h3>
                        <div className={`ml-3 px-2 py-0.5 text-xs rounded-full font-medium ${
                          session.status === 'active' 
                            ? 'bg-accent/10 text-accent' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {session.status.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.projectName}
                      </p>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                      <span>
                        {session.status === 'completed' && session.duration 
                          ? formatDuration(session.duration) 
                          : formatDateTime(session.startTime || session.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
          <p className="text-muted-foreground mb-6">
            Start by creating a new testing session in a project
          </p>
          <Link to="/projects">
            <Button>
              View Projects
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
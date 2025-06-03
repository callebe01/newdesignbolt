import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Phone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();
  
  const completedSessions = project.sessions.filter(session => session.status === 'completed').length;
  const activeSessions = project.sessions.filter(session => session.status === 'active').length;
  
  const formattedDate = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">{project.name}</CardTitle>
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <Calendar className="mr-1 h-4 w-4" />
          <span>Updated {formattedDate}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {project.description}
        </p>
        
        <div className="flex justify-between text-sm">
          <div className="flex items-center">
            <Phone className="mr-1 h-4 w-4 text-primary" />
            <span>
              {project.sessions.length} {project.sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          
          <div className="flex items-center">
            <Clock className="mr-1 h-4 w-4 text-accent" />
            <span>
              {activeSessions > 0 ? (
                <span className="text-accent font-medium">{activeSessions} active</span>
              ) : (
                <span>{completedSessions} completed</span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-3 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}`)}
        >
          View Details
        </Button>
        
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/projects/${project.id}/sessions/new`)}
        >
          New Session
        </Button>
      </CardFooter>
    </Card>
  );
};
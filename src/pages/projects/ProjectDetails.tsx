import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Clock, 
  Calendar, 
  Edit2, 
  Trash2, 
  MoreVertical,
  ChevronLeft,
  Plus 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useProjects } from '../../context/ProjectContext';
import { Project, Session } from '../../types';

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProject, updateProject, deleteProject } = useProjects();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedProject = await getProject(projectId);
        
        if (fetchedProject) {
          setProject(fetchedProject);
        } else {
          setError('Project not found');
        }
      } catch (err) {
        setError('Failed to load project details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId, getProject]);
  
  const handleDeleteProject = async () => {
    if (!project) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${project.name}"? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        await deleteProject(project.id);
        navigate('/projects');
      } catch (err) {
        console.error('Failed to delete project:', err);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse-subtle text-lg">Loading project details...</div>
      </div>
    );
  }
  
  if (error || !project) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error || 'Project not found'}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/projects')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }
  
  const activeSessions = project.sessions.filter(s => s.status === 'active');
  const completedSessions = project.sessions.filter(s => s.status === 'completed');
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/projects" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold">{project.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {project.description}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="destructive" onClick={handleDeleteProject}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <h3 className="text-3xl font-bold mt-1">{project.sessions.length}</h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Phone className="h-5 w-5" />
              </div>
            </div>
            
            <div className="flex mt-4 text-sm">
              <div className="mr-4">
                <span className="text-muted-foreground">Active: </span>
                <span className="font-medium text-accent">{activeSessions.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Completed: </span>
                <span className="font-medium">{completedSessions.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Session Time</p>
                <h3 className="text-3xl font-bold mt-1">
                  {formatDuration(
                    completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0)
                  )}
                </h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            
            <div className="mt-4 text-sm">
              <span className="text-muted-foreground">Avg. Session Length: </span>
              <span className="font-medium">
                {completedSessions.length > 0
                  ? formatDuration(
                      completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 
                      completedSessions.length
                    )
                  : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Project Age</p>
                <h3 className="text-3xl font-bold mt-1">
                  {Math.ceil(
                    (new Date().getTime() - new Date(project.createdAt).getTime()) / 
                    (1000 * 60 * 60 * 24)
                  )} days
                </h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            
            <div className="mt-4 text-sm">
              <span className="text-muted-foreground">Created: </span>
              <span className="font-medium">
                {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Sessions</h2>
        <Link to={`/projects/${project.id}/sessions/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </Link>
      </div>
      
      {project.sessions.length > 0 ? (
        <div className="space-y-4">
          {project.sessions
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map(session => (
              <SessionListItem 
                key={session.id} 
                session={session} 
              />
            ))}
        </div>
      ) : (
        <Card className="text-center p-8">
          <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by creating your first session
          </p>
          <Link to={`/projects/${project.id}/sessions/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Session
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
};

interface SessionListItemProps {
  session: Session;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ session }) => {
  return (
    <Link to={`/sessions/${session.id}`}>
      <Card className="transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{session.name}</h3>
              {session.description && (
                <p className="text-sm text-muted-foreground">
                  {session.description}
                </p>
              )}
              
              <div className="flex items-center mt-2 text-sm text-muted-foreground">
                <Clock className="mr-1 h-4 w-4" />
                <span>
                  {session.status === 'active' 
                    ? 'Started ' + formatDateTime(session.startTime || new Date()) 
                    : session.duration 
                      ? formatDuration(session.duration) 
                      : 'No duration recorded'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 text-xs rounded-full font-medium ${
                session.status === 'active' 
                  ? 'bg-accent/10 text-accent' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {session.status.toUpperCase()}
              </div>
              
              <button className="p-1 rounded-full hover:bg-muted">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
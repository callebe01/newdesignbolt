import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { useProjects } from '../../context/ProjectContext';
import { Project } from '../../types';
import { useSession } from '../../context/SessionContext';

export const NewSession: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  
  const { getProject } = useProjects();
  const { startSession } = useSession();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      
      try {
        const fetchedProject = await getProject(projectId);
        if (fetchedProject) {
          setProject(fetchedProject);
        } else {
          setError('Project not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load project');
      }
    };
    
    fetchProject();
  }, [projectId, getProject]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      setError('Project ID is missing');
      return;
    }
    
    if (!name.trim()) {
      setError('Session name is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await startSession(projectId, name, description);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link 
          to={projectId ? `/projects/${projectId}` : '/projects'} 
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to {project?.name || 'Projects'}
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Start New Session</CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            {project && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium">Project</p>
                <p className="text-lg">{project.name}</p>
              </div>
            )}
            
            <div>
              <Input
                label="Session Name"
                placeholder="E.g., Checkout Flow User Testing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
              />
            </div>
            
            <div>
              <label className="text-sm font-medium leading-none mb-2 block">
                Session Description (Optional)
              </label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                placeholder="What are you testing in this session?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(projectId ? `/projects/${projectId}` : '/projects')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Session'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
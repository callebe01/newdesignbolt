import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types';

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  getProject: (id: string) => Promise<Project | null>;
  createProject: (name: string, description: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data
      const mockProjects: Project[] = [
        {
          id: '1',
          name: 'E-commerce Redesign',
          description: 'Redesigning the checkout flow for better conversion',
          createdAt: new Date('2025-05-20'),
          updatedAt: new Date('2025-06-01'),
          sessions: [
            {
              id: '101',
              projectId: '1',
              name: 'Initial User Testing',
              status: 'completed',
              startTime: new Date('2025-05-25T10:00:00'),
              endTime: new Date('2025-05-25T11:15:00'),
              duration: 75 * 60, // 75 minutes in seconds
              insights: {
                statements: [],
                preferences: [],
                frictions: [],
                decisions: [],
              },
              createdAt: new Date('2025-05-23'),
              updatedAt: new Date('2025-05-25'),
            },
            {
              id: '102',
              projectId: '1',
              name: 'E-commerce checkout flow',
              status: 'active',
              startTime: new Date(),
              insights: {
                statements: [],
                preferences: [],
                frictions: [],
                decisions: [],
              },
              createdAt: new Date('2025-06-01'),
              updatedAt: new Date('2025-06-02'),
            }
          ]
        },
        {
          id: '2',
          name: 'Mobile Banking App',
          description: 'Streamlining the transaction history view',
          createdAt: new Date('2025-04-15'),
          updatedAt: new Date('2025-05-28'),
          sessions: [
            {
              id: '201',
              projectId: '2',
              name: 'Transaction History UX Test',
              status: 'completed',
              startTime: new Date('2025-05-10T14:00:00'),
              endTime: new Date('2025-05-10T15:30:00'),
              duration: 90 * 60, // 90 minutes in seconds
              insights: {
                statements: [],
                preferences: [],
                frictions: [],
                decisions: [],
              },
              createdAt: new Date('2025-05-08'),
              updatedAt: new Date('2025-05-10'),
            }
          ]
        }
      ];
      
      setProjects(mockProjects);
    } catch (err) {
      setError('Failed to fetch projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getProject = async (id: string): Promise<Project | null> => {
    try {
      const project = projects.find(p => p.id === id) || null;
      return project;
    } catch (err) {
      setError('Failed to get project');
      console.error(err);
      return null;
    }
  };

  const createProject = async (name: string, description: string): Promise<Project> => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newProject: Project = {
        id: Date.now().toString(),
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
        sessions: []
      };
      
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
      throw err;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedProjects = projects.map(project => {
        if (project.id === id) {
          return {
            ...project,
            ...data,
            updatedAt: new Date()
          };
        }
        return project;
      });
      
      const updatedProject = updatedProjects.find(p => p.id === id);
      
      if (!updatedProject) {
        throw new Error('Project not found');
      }
      
      setProjects(updatedProjects);
      
      if (currentProject && currentProject.id === id) {
        setCurrentProject(updatedProject);
      }
      
      return updatedProject;
    } catch (err) {
      setError('Failed to update project');
      console.error(err);
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProjects(prev => prev.filter(project => project.id !== id));
      
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null);
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        setCurrentProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  
  return context;
};
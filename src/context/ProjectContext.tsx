import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Session } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();

  const mapSession = (row: Record<string, unknown>): Session => ({
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    description: row.description as string,
    status: row.status as string,
    startTime: row.start_time ? new Date(row.start_time as string) : null,
    endTime: row.end_time ? new Date(row.end_time as string) : null,
    duration: row.duration as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  });

  const mapProject = (row: Record<string, unknown>): Project => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    userId: row.user_id as string,
    sessions: Array.isArray(row.sessions) ? row.sessions.map(mapSession) : [],
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*, sessions(*)')
        .order('created_at', { ascending: false });
      
      if (projectsError) throw projectsError;

      const projects = projectsData.map(mapProject);
      setProjects(projects);
    } catch (err) {
      setError('Failed to fetch projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getProject = async (id: string): Promise<Project | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, sessions(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return mapProject(data);
    } catch (err) {
      setError('Failed to get project');
      console.error(err);
      return null;
    }
  };

  const createProject = async (name: string, description: string): Promise<Project> => {
    if (!user) {
      throw new Error('User must be authenticated to create a project');
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ 
          name, 
          description,
          user_id: user.id 
        })
        .select('*, sessions(*)')
        .single();
      if (error) throw error;

      const project = mapProject(data);
      setProjects(prev => [...prev, project]);
      return project;
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
      throw err;
    }
  };

  const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
    try {
      // Remove any non-column properties before sending to Supabase
      const { sessions, ...updateData } = data;
      void sessions;
      
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, sessions(*)')
        .single();
      if (error) throw error;

      const project = mapProject(updated);
      setProjects(prev => prev.map(p => (p.id === id ? project : p)));

      if (currentProject && currentProject.id === id) {
        setCurrentProject(project);
      }

      return project;
    } catch (err) {
      setError('Failed to update project');
      console.error(err);
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;

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
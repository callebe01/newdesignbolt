import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { supabase } from '../services/supabase';

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

  const mapProject = (row: Record<string, unknown>): Project => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    sessions: [],
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data.map(mapProject));
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
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, description })
        .select()
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
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
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
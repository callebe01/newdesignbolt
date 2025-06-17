import { supabase } from './supabase';

export interface Persona {
  id: string;
  projectId: string;
  name: string;
  instructions: string;
  documentationUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export async function createPersona(
  projectId: string,
  name: string,
  instructions: string
): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .insert({
      project_id: projectId,
      name,
      instructions,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    instructions: data.instructions,
    documentationUrls: data.documentation_urls ?? [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function getProjectPersonas(projectId: string): Promise<Persona[]> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    instructions: row.instructions,
    documentationUrls: row.documentation_urls ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

export async function getPersona(id: string): Promise<Persona | null> {
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    instructions: data.instructions,
    documentationUrls: data.documentation_urls ?? [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function updatePersona(
  id: string,
  updates: Partial<Pick<Persona, 'name' | 'instructions' | 'documentationUrls'>>
): Promise<Persona> {
  const { data, error } = await supabase
    .from('personas')
    .update({
      ...updates,
      documentation_urls: (updates as any).documentationUrls,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    instructions: data.instructions,
    documentationUrls: data.documentation_urls ?? [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deletePersona(id: string): Promise<void> {
  const { error } = await supabase
    .from('personas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
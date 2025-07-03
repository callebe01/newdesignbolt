import React, { useState, useEffect } from 'react';
import { Plus, X, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { supabase } from '../../services/supabase';

interface AgentTool {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters: any;
}

interface AgentActionsMVPProps {
  agentId: string;
}

export const AgentActionsMVP: React.FC<AgentActionsMVPProps> = ({ agentId }) => {
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'POST',
    parameters: '{}',
  });

  useEffect(() => {
    fetchTools();
  }, [agentId]);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_tools')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (err) {
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveAction = async () => {
    try {
      setSaving(true);
      
      // Validate JSON parameters
      let parsedParameters;
      try {
        parsedParameters = JSON.parse(form.parameters || '{}');
      } catch (err) {
        alert('Invalid JSON in parameters field');
        return;
      }

      const { error } = await supabase.from('agent_tools').insert({
        agent_id: agentId,
        name: form.name.trim(),
        description: form.description.trim(),
        endpoint: form.endpoint.trim(),
        method: form.method,
        parameters: parsedParameters
      });

      if (error) throw error;

      setForm({ name: '', description: '', endpoint: '', method: 'POST', parameters: '{}' });
      setFormOpen(false);
      fetchTools();
    } catch (err) {
      console.error('Error saving tool:', err);
      alert('Failed to save tool');
    } finally {
      setSaving(false);
    }
  };

  const deleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      const { error } = await supabase
        .from('agent_tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;
      fetchTools();
    } catch (err) {
      console.error('Error deleting tool:', err);
      alert('Failed to delete tool');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse-subtle">Loading tools...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agent Actions</CardTitle>
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {formOpen && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Add New Action</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFormOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                placeholder="Action name (e.g., createEvent)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
              />

              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth
              />

              <Input
                placeholder="API endpoint URL"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                fullWidth
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Parameters (JSON Schema)
                </label>
                <textarea
                  placeholder='{"type":"object","properties":{"msg":{"type":"string"}},"required":["msg"]}'
                  value={form.parameters}
                  onChange={(e) => setForm({ ...form, parameters: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAction}
                  disabled={saving || !form.name || !form.description || !form.endpoint}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Action'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {tools.length > 0 ? (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{tool.name}</h4>
                      <span className="px-2 py-1 text-xs bg-muted rounded-full">
                        {tool.method}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {tool.description}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {tool.endpoint}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTool(tool.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No actions configured yet. Add your first action to enable custom functionality.
            </p>
            <Button onClick={() => setFormOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Action
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
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
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useAgents } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { Agent } from '../../types';
import { getTranscripts, analyzeTranscripts, getAnalysisResults, AnalysisResult } from '../../services/transcripts';

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent, deleteAgent } = useAgents();
  const { user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!agentId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const [fetchedAgent, fetchedTranscripts] = await Promise.all([
          getAgent(agentId),
          getTranscripts(agentId)
        ]);
        
        if (fetchedAgent) {
          setAgent(fetchedAgent);
          setTranscripts(fetchedTranscripts);
          
          if (fetchedTranscripts.length > 0) {
            const results = await getAnalysisResults(fetchedTranscripts.map(t => t.id));
            setAnalysisResults(results);
          }
        } else {
          setError('Agent not found');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId, getAgent]);

  const handleAnalyze = async () => {
    if (!transcripts.length) {
      setError('No conversations to analyze');
      return;
    }
    
    try {
      setAnalyzing(true);
      setError(null);
      
      // Get the 5 most recent transcripts
      const recentTranscripts = transcripts.slice(0, 5);
      const result = await analyzeTranscripts(recentTranscripts);
      
      setAnalysisResults([result, ...analysisResults]);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze conversations');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agent) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${agent.name}"? This action cannot be undone.`
    );
    
    if (confirmDelete) {
      try {
        await deleteAgent(agent.id);
        navigate('/agents');
      } catch (err) {
        console.error('Failed to delete agent:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse-subtle text-lg">Loading agent details...</div>
      </div>
    );
  }
  
  if (error || !agent) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p>{error || 'Agent not found'}</p>
        <Link to="/agents" className="underline">
          Back to Agents
        </Link>
      </div>
    );
  }

  const latestAnalysis = analysisResults[0];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link to="/agents" className="flex items-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Agents
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">
            {agent.status === 'active' ? 'Active • Last active 2h ago' : 'Inactive'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/agents/${agent.id}/edit`)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="destructive" onClick={handleDeleteAgent}>
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
                <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
                <h3 className="text-3xl font-bold mt-1">{transcripts.length}</h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Phone className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Duration</p>
                <h3 className="text-3xl font-bold mt-1">
                  {latestAnalysis?.sentimentScores?.average || 'N/A'}
                </h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Conversation</p>
                <h3 className="text-3xl font-bold mt-1">
                  {transcripts[0] 
                    ? formatDateTime(transcripts[0].created_at)
                    : 'Never'}
                </h3>
              </div>
              <div className="p-2 bg-muted rounded-md">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conversation History</h2>
          <Button 
            onClick={handleAnalyze}
            disabled={analyzing || transcripts.length === 0}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze Conversations'}
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            {error}
          </div>
        )}

        {transcripts.length > 0 ? (
          <div className="space-y-4">
            {transcripts.map((transcript, idx) => (
              <Card key={transcript.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">Conversation #{transcripts.length - idx}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(transcript.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{transcript.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No conversations yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {latestAnalysis && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Latest Analysis</h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <p className="text-sm whitespace-pre-wrap">{latestAnalysis.summary}</p>
              </div>

              {latestAnalysis.keyPoints?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Key Points</h3>
                  <ul className="space-y-2">
                    {latestAnalysis.keyPoints.map((point, idx) => (
                      <li key={idx} className="text-sm flex items-center">
                        <span className="w-2 h-2 rounded-full bg-primary mr-2" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {latestAnalysis.recommendations?.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {latestAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex items-center">
                        <span className="w-2 h-2 rounded-full bg-accent mr-2" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
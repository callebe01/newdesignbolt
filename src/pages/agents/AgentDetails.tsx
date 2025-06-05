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
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useProjects } from '../../context/ProjectContext';
import { Project, Session } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAgentTranscripts, analyzeTranscripts, getAnalysisResults, Transcript, AnalysisResult } from '../../services/transcripts';

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent } = useProjects();
  const { user, accessToken } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!agentId || !user) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const [fetchedAgent, fetchedTranscripts] = await Promise.all([
          getAgent(agentId),
          getAgentTranscripts(agentId)
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
        if (err instanceof Error && err.message === 'Unauthorized') {
          navigate('/login');
        } else {
          setError('Failed to load agent details');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId, getAgent, navigate, user]);

  const handleAnalyze = async () => {
    if (!transcripts.length || !user || !accessToken) {
      navigate('/login');
      return;
    }
    
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeTranscripts(
        transcripts.map(t => t.id),
        accessToken,
        5
      );
      setAnalysisResults([result, ...analysisResults]);
    } catch (err) {
      console.error('Analysis failed:', err);
      if (err instanceof Error) {
        if (err.message === 'Unauthorized') {
          navigate('/login');
          return;
        }
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
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
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/agents')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Agents
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
            <Link to="/agents" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {agent.description}
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
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
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
                    ? formatDateTime(transcripts[0].createdAt)
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
            disabled={analyzing || transcripts.length === 0 || !user || !accessToken}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'Analyze Conversations'}
          </Button>
        </div>

        {transcripts.length > 0 ? (
          <div className="space-y-4">
            {transcripts.map((transcript, idx) => (
              <Card key={transcript.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">Conversation #{transcripts.length - idx}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(transcript.createdAt)}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Clock, 
  Calendar, 
  Edit2, 
  Trash2, 
  ChevronLeft,
  RefreshCw,
  Table,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useAgents } from '../../context/AgentContext';
import { Agent } from '../../types';
import { getTranscripts, analyzeTranscripts, getAnalysisResults, AnalysisResult } from '../../services/transcripts';

interface ModalState {
  type: 'conversation' | null;
  data: any;
}

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent, deleteAgent } = useAgents();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);

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

  const renderAnalysisDetails = (analysis: AnalysisResult) => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setSelectedAnalysis(null)}
          className="hover:bg-transparent p-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analysis List
        </Button>
        <div className="text-sm text-muted-foreground">
          {formatDateTime(analysis.createdAt)}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Summary</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">{analysis.summary}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Sentiment Analysis</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(analysis.sentimentScores || {}).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{Math.round(value * 100)}%</div>
                <div className="text-sm text-muted-foreground capitalize">{key}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Key Points</h3>
        <Card>
          <CardContent className="p-4">
            <ul className="list-disc list-inside space-y-2">
              {analysis.keyPoints?.map((point, index) => (
                <li key={index} className="text-sm">{point}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Recommendations</h3>
        <Card>
          <CardContent className="p-4">
            <ul className="list-disc list-inside space-y-2">
              {analysis.recommendations?.map((rec, index) => (
                <li key={index} className="text-sm">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderConversationModal = (transcript: any) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Created: {formatDateTime(transcript.created_at)}</div>
      </div>
      <div className="bg-muted p-4 rounded-lg">
        <pre className="whitespace-pre-wrap font-sans text-sm">{transcript.content}</pre>
      </div>
    </div>
  );

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                      {analysisResults[0]?.sentimentScores?.average || 'N/A'}
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

          <Card>
            <CardHeader>
              <CardTitle>Agent Instructions</CardTitle>
            </CardHeader>
            <CardContent className="max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap">{agent.instructions}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Preview</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transcripts.map((transcript) => (
                  <tr key={transcript.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      {formatDateTime(transcript.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-md">
                      <p className="truncate">{transcript.content}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setModal({ type: 'conversation', data: transcript })}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {selectedAnalysis ? (
            renderAnalysisDetails(selectedAnalysis)
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Analysis Results</h2>
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

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Summary</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Sentiment</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analysisResults.map((analysis) => (
                      <tr key={analysis.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(analysis.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm max-w-md">
                          <p className="truncate">{analysis.summary}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {analysis.sentimentScores?.positive && (
                            <span className="text-success">
                              {Math.round(analysis.sentimentScores.positive * 100)}% Positive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedAnalysis(analysis)}
                          >
                            <Table className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Modal
        isOpen={modal.type !== null}
        onClose={() => setModal({ type: null, data: null })}
        title="Conversation Details"
      >
        {modal.type === 'conversation' && renderConversationModal(modal.data)}
      </Modal>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Phone, 
  Clock, 
  Calendar, 
  Edit2, 
  Trash2, 
  ChevronLeft,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useAgents } from '../../context/AgentContext';
import { useAuth } from '../../context/AuthContext';
import { Agent } from '../../types';
import { getTranscripts, analyzeTranscripts, getAnalysisResults, Transcript, AnalysisResult } from '../../services/transcripts';

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent, deleteAgent } = useAgents();
  const { accessToken, logout } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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
        if (err instanceof Error && err.message === 'Unauthorized') {
          setError('Your session expired. Please log in again.');
          await logout();
          navigate('/login');
        } else {
          console.error('Error fetching data:', err);
          setError('Failed to load agent details');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId, getAgent, logout, navigate]);

  const handleAnalyze = async () => {
    if (!transcripts.length || !accessToken) return;
    
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeTranscripts(transcripts);
      setAnalysisResults([result, ...analysisResults]);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Unauthorized') {
          setError('Your session expired. Please log in again.');
          await logout();
          navigate('/login');
          return;
        }
        console.error('Unexpected error during analysis:', err);
        setError('Failed to analyze transcripts. Please try again later.');
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
        <Link to="/agents" className="underline">
          Back to Agents
        </Link>
      </div>
    );
  }

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
            {agent.instructions}
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
                    <h3 className="text-3xl font-bold mt-1">15 min</h3>
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
                        ? formatDateTime(new Date(transcripts[0].createdAt))
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
        </TabsContent>

        <TabsContent value="conversations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Conversation History</h2>
            <Button onClick={() => navigate(`/agent/${agent.id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              New Conversation
            </Button>
          </div>

          {transcripts.length > 0 ? (
            <div className="space-y-4">
              {transcripts.map((transcript) => (
                <Card key={transcript.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">
                          Conversation from {formatDateTime(new Date(transcript.createdAt))}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {transcript.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <p className="text-muted-foreground">No conversations yet</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {selectedAnalysis ? (
            <div className="space-y-6">
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedAnalysis(null)}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Analysis List
                </Button>
              </div>
              {renderAnalysisModal(selectedAnalysis)}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Analysis Results</h2>
                <Button 
                  onClick={handleAnalyze}
                  disabled={analyzing || transcripts.length === 0 || !accessToken}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Analysis
                </Button>
              </div>

              {analysisResults.length > 0 ? (
                <div className="space-y-4">
                  {analysisResults.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">
                              Analysis from {formatDateTime(new Date(analysis.createdAt))}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {analysis.summary}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center p-8">
                  <p className="text-muted-foreground">No analysis results yet</p>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const renderAnalysisModal = (analysis: AnalysisResult) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-medium mb-2">Summary</h3>
      <p className="text-sm text-muted-foreground">{analysis.summary}</p>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Resolution Rate</h3>
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Task Completed</span>
            <span className={`text-sm font-medium ${analysis.resolutionRate?.taskCompleted ? 'text-success' : 'text-destructive'}`}>
              {analysis.resolutionRate?.taskCompleted ? 'Yes' : 'No'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.resolutionRate?.description}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Engagement Score</h3>
        <div className="bg-muted p-4 rounded-lg">
          <div className="text-3xl font-bold mb-1">{analysis.engagementScore}%</div>
          <div className="w-full bg-background rounded-full h-2.5">
            <div 
              className="bg-primary rounded-full h-2.5" 
              style={{ width: `${analysis.engagementScore}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">User Intent</h3>
      <div className="bg-muted p-4 rounded-lg">
        <div className="mb-2">
          <span className="text-sm font-medium">Primary Intent: </span>
          <span className="text-sm">{analysis.userIntent?.primary}</span>
        </div>
        {analysis.userIntent?.secondary?.length > 0 && (
          <div>
            <span className="text-sm font-medium">Secondary Intents: </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {analysis.userIntent.secondary.map((intent, i) => (
                <span key={i} className="text-xs bg-background px-2 py-1 rounded-full">
                  {intent}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">Workflow Patterns</h3>
      <div className="space-y-2">
        {analysis.workflowPatterns?.map((pattern, i) => (
          <div key={i} className="bg-muted p-4 rounded-lg text-sm">
            {pattern}
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">UX Issues</h3>
      {analysis.repetitiveQuestions?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Repetitive Questions</h4>
          <ul className="list-disc list-inside space-y-1">
            {analysis.repetitiveQuestions.map((question, i) => (
              <li key={i} className="text-sm text-muted-foreground">{question}</li>
            ))}
          </ul>
        </div>
      )}
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">Feature Requests</h3>
      <div className="space-y-2">
        {analysis.featureRequests?.map((request, i) => (
          <div key={i} className="bg-muted p-4 rounded-lg text-sm">
            {request}
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">Sentiment Analysis</h3>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(analysis.sentimentScores || {}).map(([key, value]) => (
          <div key={key} className="bg-muted p-4 rounded-lg">
            <div className="text-2xl font-bold">{Math.round(value * 100)}%</div>
            <div className="text-sm text-muted-foreground capitalize">{key}</div>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">Key Points</h3>
      <ul className="list-disc list-inside space-y-2">
        {analysis.keyPoints?.map((point, index) => (
          <li key={index} className="text-sm">{point}</li>
        ))}
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">Recommendations</h3>
      <ul className="list-disc list-inside space-y-2">
        {analysis.recommendations?.map((rec, index) => (
          <li key={index} className="text-sm">{rec}</li>
        ))}
      </ul>
    </div>
  </div>
);
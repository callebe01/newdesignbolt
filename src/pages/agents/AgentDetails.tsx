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
  ArrowLeft,
  CheckCircle,
  XCircle,
  BarChart2,
  Brain,
  GitPullRequest,
  AlertTriangle,
  Workflow,
  Repeat,
  UserCircle,
  Inbox,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Dialog } from '../../components/ui/Dialog';
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
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | '7days'>('today');

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

  const getTodayTranscripts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transcripts.filter(t => new Date(t.created_at) >= today);
  };

  const getLast7DaysTranscripts = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return transcripts.filter(t => new Date(t.created_at) >= sevenDaysAgo);
  };

  const handleAnalyzeClick = () => {
    setTimeframe('today');
    setSelectedTranscripts([]);
    setShowAnalyzeDialog(true);
  };

  const handleAnalyzeConfirm = async () => {
    const transcriptsToAnalyze = timeframe === 'today' ? getTodayTranscripts() : getLast7DaysTranscripts();
    
    if (transcriptsToAnalyze.length === 0) {
      setError('No conversations available for the selected timeframe');
      return;
    }

    // Filter out transcripts that have already been analyzed
    const analyzedIds = new Set(analysisResults.flatMap(r => r.transcriptionIds));
    const unanalyzedTranscripts = transcriptsToAnalyze.filter(t => !analyzedIds.has(t.id));

    if (unanalyzedTranscripts.length === 0) {
      setError('All conversations in this timeframe have already been analyzed');
      return;
    }

    setShowAnalyzeDialog(false);
    
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeTranscripts(unanalyzedTranscripts);
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
    <div className="space-y-8">
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

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Resolution and Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-24">
              {analysis.resolutionRate?.resolved > 50 ? (
                <div className="flex items-center text-success">
                  <CheckCircle className="h-8 w-8 mr-3" />
                  <span className="text-2xl font-bold">Yes</span>
                </div>
              ) : (
                <div className="flex items-center text-destructive">
                  <XCircle className="h-8 w-8 mr-3" />
                  <span className="text-2xl font-bold">No</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="h-5 w-5 mr-2" />
              Engagement Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold">{analysis.engagementScore}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {analysis.engagementScore >= 80 ? 'High Engagement' :
                 analysis.engagementScore >= 50 ? 'Moderate Engagement' :
                 'Low Engagement'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Intent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCircle className="h-5 w-5 mr-2" />
            User Intent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(analysis.userIntent || {}).map(([intent, percentage]) => (
              <div key={intent} className="bg-muted p-4 rounded-lg text-center">
                <div className="text-xl font-bold">{percentage}%</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {intent.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Workflow className="h-5 w-5 mr-2" />
            Workflow Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.workflowPatterns?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.workflowPatterns.map((pattern, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 flex-shrink-0 text-primary">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <span className="ml-2">{pattern}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No workflow patterns identified</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repetitive Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Repeat className="h-5 w-5 mr-2" />
            Repetitive Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.repetitiveQuestions?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.repetitiveQuestions.map((question, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 flex-shrink-0 text-accent">
                    <Repeat className="h-5 w-5" />
                  </div>
                  <span className="ml-2">{question}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No repetitive questions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GitPullRequest className="h-5 w-5 mr-2" />
            Feature Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.featureRequests?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.featureRequests.map((request, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 flex-shrink-0 text-secondary">
                    <GitPullRequest className="h-5 w-5" />
                  </div>
                  <span className="ml-2">{request}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No feature requests identified</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Key Points & UX Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.keyPoints?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 flex-shrink-0 text-warning">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <span className="ml-2">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No key points or UX issues found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.recommendations?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <div className="h-6 w-6 flex-shrink-0 text-success">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <span className="ml-2">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No recommendations available</p>
            </div>
          )}
        </CardContent>
      </Card>
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
                  onClick={handleAnalyzeClick}
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

      <Dialog
        isOpen={showAnalyzeDialog}
        onClose={() => setShowAnalyzeDialog(false)}
        title="Analyze Conversations"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowAnalyzeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnalyzeConfirm}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which conversations to analyze:
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              className={`p-4 rounded-lg border text-left ${
                timeframe === 'today' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setTimeframe('today')}
            >
              <div className="flex items-center justify-between mb-2">
                <CalendarIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {getTodayTranscripts().length} conversations
                </span>
              </div>
              <h3 className="font-medium">Today</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Analyze today's conversations
              </p>
            </button>

            <button
              className={`p-4 rounded-lg border text-left ${
                timeframe === '7days' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onClick={() => setTimeframe('7days')}
            >
              <div className="flex items-center justify-between mb-2">
                <CalendarIcon className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {getLast7DaysTranscripts().length} conversations
                </span>
              </div>
              <h3 className="font-medium">Last 7 Days</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Analyze conversations from the past week
              </p>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};
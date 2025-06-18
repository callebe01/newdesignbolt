import React, { useState, useEffect } from 'react';
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
  Calendar as CalendarIcon,
  Copy,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { Dialog } from '../../components/ui/Dialog';
import { EditAgentModal } from '../../components/agents/EditAgentModal';
import { formatDateTime, formatDuration } from '../../utils/format';
import { useAgents } from '../../context/AgentContext';
import { Agent } from '../../types';
import { getTranscripts, analyzeTranscripts, getAnalysisResults, AnalysisResult } from '../../services/transcripts';
import { supabase } from '../../services/supabase';

type TimeFilter = 'today' | 'last7days' | 'last30days' | 'last90days' | 'alltime';

interface OverviewMetrics {
  totalConversations: number;
  resolutionRate: number;
  engagementScore: number;
  avgDuration: number;
  changes?: {
    conversations?: string;
    resolution?: string;
    engagement?: string;
    duration?: string;
  };
}

interface ModalState {
  type: 'conversation' | null;
  data: any;
}

interface AgentConversation {
  id: string;
  agent_id: string;
  status: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  created_at: string;
  updated_at: string;
  messages?: ConversationMessage[];
  transcript?: string;
}

interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: string;
}

export const AgentDetails: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { getAgent, deleteAgent } = useAgents();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisResult | null>(null);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | '7days'>('today');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('last7days');
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics>({
    totalConversations: 0,
    resolutionRate: 0,
    engagementScore: 0,
    avgDuration: 0
  });

  const copyShareableLink = () => {
    if (!agent) return;
    const shareableUrl = `https://voicepilot.live/agent/${agent.id}`;
    navigator.clipboard.writeText(shareableUrl);
  };

  const handleAgentUpdated = (updatedAgent: Agent) => {
    setAgent(updatedAgent);
  };

  const refreshData = async () => {
    if (!agentId) return;
    
    try {
      const [fetchedAgent, fetchedTranscripts, fetchedConversations] = await Promise.all([
        getAgent(agentId),
        getTranscripts(agentId),
        getAgentConversations(agentId)
      ]);
      
      if (fetchedAgent) {
        setAgent(fetchedAgent);
        setTranscripts(fetchedTranscripts);
        setConversations(fetchedConversations);
        
        if (fetchedTranscripts.length > 0) {
          const results = await getAnalysisResults(fetchedTranscripts.map(t => t.id));
          setAnalysisResults(results);
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  const getAgentConversations = async (agentId: string): Promise<AgentConversation[]> => {
    try {
      console.log('Fetching conversations for agent:', agentId);
      
      // Get conversations with their messages
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('agent_conversations')
        .select(`
          *,
          conversation_messages (
            id,
            conversation_id,
            role,
            content,
            timestamp,
            created_at
          )
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        return [];
      }

      console.log('Raw conversations data:', conversationsData?.length || 0, conversationsData);

      // Also get transcripts for conversations that might not have messages yet
      const { data: transcriptsData, error: transcriptsError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (transcriptsError) {
        console.error('Error fetching transcripts:', transcriptsError);
      }

      console.log('Raw transcripts data:', transcriptsData?.length || 0, transcriptsData);

      // Merge conversation data with transcript data
      const conversationsWithContent = (conversationsData || []).map(conversation => {
        // Find matching transcript by timestamp (within 5 minutes)
        const conversationTime = new Date(conversation.start_time).getTime();
        const matchingTranscript = transcriptsData?.find(transcript => {
          const transcriptTime = new Date(transcript.created_at).getTime();
          const timeDiff = Math.abs(conversationTime - transcriptTime);
          return timeDiff < 5 * 60 * 1000; // 5 minutes tolerance
        });

        return {
          ...conversation,
          messages: conversation.conversation_messages || [],
          transcript: matchingTranscript?.content || null
        };
      });

      // Also include transcripts that don't have matching conversations
      // This might be the case for some conversations that were saved as transcripts only
      const usedTranscriptIds = new Set();
      conversationsWithContent.forEach(conv => {
        if (conv.transcript) {
          const conversationTime = new Date(conv.start_time).getTime();
          const matchingTranscript = transcriptsData?.find(transcript => {
            const transcriptTime = new Date(transcript.created_at).getTime();
            const timeDiff = Math.abs(conversationTime - transcriptTime);
            return timeDiff < 5 * 60 * 1000;
          });
          if (matchingTranscript) {
            usedTranscriptIds.add(matchingTranscript.id);
          }
        }
      });

      // Add orphaned transcripts as conversations
      const orphanedTranscripts = (transcriptsData || []).filter(transcript => 
        !usedTranscriptIds.has(transcript.id)
      );

      console.log('Orphaned transcripts:', orphanedTranscripts.length, orphanedTranscripts);

      const orphanedConversations = orphanedTranscripts.map(transcript => ({
        id: `transcript-${transcript.id}`,
        agent_id: transcript.agent_id,
        start_time: transcript.created_at,
        end_time: transcript.created_at,
        status: 'completed' as const,
        duration: 0,
        created_at: transcript.created_at,
        updated_at: transcript.created_at,
        messages: [],
        transcript: transcript.content
      }));

      const allConversations = [...conversationsWithContent, ...orphanedConversations]
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

      console.log('Final conversations count:', allConversations.length, allConversations);
      return allConversations;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!agentId) return;
      
      try {
        setLoading(true);
        setError(null);
        await refreshData();
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load agent details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [agentId]);

  // Add real-time subscription for conversations and transcripts
  useEffect(() => {
    if (!agentId) return;

    // Subscribe to changes in agent_conversations table
    const conversationsSubscription = supabase
      .channel(`agent_conversations_${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_conversations',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Conversation change detected:', payload);
          // Add a small delay to ensure data consistency
          setTimeout(() => {
            refreshData();
          }, 1000);
        }
      )
      .subscribe();

    // Subscribe to changes in transcriptions table
    const transcriptsSubscription = supabase
      .channel(`transcriptions_${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcriptions',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          console.log('Transcript change detected:', payload);
          // Add a small delay to ensure data consistency
          setTimeout(() => {
            refreshData();
          }, 1000);
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      conversationsSubscription.unsubscribe();
      transcriptsSubscription.unsubscribe();
    };
  }, [agentId]);

  useEffect(() => {
    // Calculate metrics based on analysis results and time filter
    const calculateMetrics = () => {
      console.log('Calculating metrics with conversations:', conversations.length);
      console.log('Conversations data:', conversations);
      
      const now = new Date();
      const filteredResults = analysisResults.filter(result => {
        const date = new Date(result.createdAt);
        switch (timeFilter) {
          case 'today':
            return date.toDateString() === now.toDateString();
          case 'last7days':
            return (now.getTime() - date.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case 'last30days':
            return (now.getTime() - date.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          case 'last90days':
            return (now.getTime() - date.getTime()) <= 90 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });

      if (filteredResults.length === 0) {
        const metrics = {
          totalConversations: conversations.length,
          resolutionRate: 0,
          engagementScore: 0,
          avgDuration: 0
        };
        console.log('Setting metrics (no analysis results):', metrics);
        setOverviewMetrics(metrics);
        return;
      }

      const avgDurationFromConversations = conversations.length > 0 
        ? conversations.reduce((acc, conv) => acc + (conv.duration || 0), 0) / conversations.length
        : 0;

      const metrics = {
        totalConversations: conversations.length,
        resolutionRate: filteredResults.reduce((acc, curr) => 
          acc + (curr.resolutionRate?.resolved || 0), 0) / filteredResults.length,
        engagementScore: filteredResults.reduce((acc, curr) => 
          acc + (curr.engagementScore || 0), 0) / filteredResults.length,
        avgDuration: avgDurationFromConversations,
        changes: {
          conversations: '+12 this week',
          resolution: '+5% vs last week',
          engagement: '+0.2 vs last week',
          duration: '-0.5m vs last week'
        }
      };

      console.log('Setting metrics (with analysis results):', metrics);
      setOverviewMetrics(metrics);
    };

    calculateMetrics();
  }, [timeFilter, analysisResults, conversations]);

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
      
      // Refresh the data to get the latest analysis
      await refreshData();
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

  const renderConversationModal = (conversation: AgentConversation) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Started: {formatDateTime(conversation.start_time)}</div>
        <div>
          {conversation.status === 'completed' && conversation.duration 
            ? `Duration: ${formatDuration(conversation.duration)}`
            : `Status: ${conversation.status}`
          }
        </div>
      </div>
      
      {/* Show transcript if available */}
      {conversation.transcript && (
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Transcript:</h4>
          <div className="max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm">{conversation.transcript}</pre>
          </div>
        </div>
      )}
      
      {/* Show conversation messages if available */}
      {conversation.messages && conversation.messages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Messages:</h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {conversation.messages.map((message: ConversationMessage, index: number) => (
              <div key={index} className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {message.role === 'user' ? 'User' : 'Assistant'} - {formatDateTime(message.timestamp)}
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show empty state if no content */}
      {!conversation.transcript && (!conversation.messages || conversation.messages.length === 0) && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No conversation content available</p>
          <p className="text-sm text-muted-foreground mt-1">
            This conversation may have been very brief or the content wasn't captured.
          </p>
        </div>
      )}
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
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button variant="destructive" onClick={handleDeleteAgent}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Shareable Link</h3>
              <p className="text-sm text-muted-foreground">
                Share this link with your users to let them talk to your AI agent
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={copyShareableLink}
              className="flex items-center"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Link
            </Button>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <code className="text-sm flex-1 break-all">
              https://voicepilot.live/agent/${agent?.id}
            </code>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversations">Conversations ({conversations.length})</TabsTrigger>
          <TabsTrigger value="analysis">Analysis ({analysisResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Time Filter */}
          <div className="flex space-x-2">
            {[
              { label: 'Today', value: 'today' },
              { label: 'Last 7 days', value: 'last7days' },
              { label: 'Last 30 days', value: 'last30days' },
              { label: 'Last 90 days', value: 'last90days' },
              { label: 'All time', value: 'alltime' },
            ].map(({ label, value }) => (
              <Button
                key={value}
                variant={timeFilter === value ? 'primary' : 'outline'}
                onClick={() => setTimeFilter(value as TimeFilter)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold">{overviewMetrics.totalConversations}</h3>
                  <p className="text-sm text-muted-foreground">Total Conversations</p>
                  {overviewMetrics.changes?.conversations && (
                    <p className="text-sm text-success mt-2">
                      {overviewMetrics.changes.conversations}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-success/10 text-success rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold">
                    {Math.round(overviewMetrics.resolutionRate * 100)}%
                  </h3>
                  <p className="text-sm text-muted-foreground">Resolution Rate</p>
                  {overviewMetrics.changes?.resolution && (
                    <p className="text-sm text-success mt-2">
                      {overviewMetrics.changes.resolution}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-accent/10 text-accent rounded-lg">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold">
                    {overviewMetrics.engagementScore.toFixed(1)}/10
                  </h3>
                  <p className="text-sm text-muted-foreground">Engagement Score</p>
                  {overviewMetrics.changes?.engagement && (
                    <p className="text-sm text-success mt-2">
                      {overviewMetrics.changes.engagement}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold">
                    {formatDuration(overviewMetrics.avgDuration)}
                  </h3>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  {overviewMetrics.changes?.duration && (
                    <p className="text-sm text-destructive mt-2">
                      {overviewMetrics.changes.duration}
                    </p>
                  )}
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
          {conversations.length > 0 ? (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {conversations.map((conversation) => (
                    <tr key={conversation.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {formatDateTime(conversation.start_time)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          conversation.status === 'completed' 
                            ? 'bg-success/10 text-success' 
                            : conversation.status === 'active'
                            ? 'bg-accent/10 text-accent'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {conversation.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {conversation.duration ? formatDuration(conversation.duration) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setModal({ type: 'conversation', data: conversation })}
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
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground">
                  Conversations will appear here after users interact with your agent.
                </p>
              </CardContent>
            </Card>
          )}
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

              {analysisResults.length > 0 ? (
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
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No analysis results yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Run analysis on your conversations to get insights and recommendations.
                    </p>
                    {transcripts.length > 0 && (
                      <Button onClick={handleAnalyzeClick}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Analyze Conversations
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
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

      <EditAgentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        agent={agent}
        onAgentUpdated={handleAgentUpdated}
      />

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
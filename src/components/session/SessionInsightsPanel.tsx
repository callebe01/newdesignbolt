import React from 'react';
import { 
  MessageSquare, 
  Heart, 
  AlertTriangle, 
  CheckSquare, 
  Copy, 
  Lightbulb, 
  Search 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useSession } from '../../context/SessionContext';

interface SessionInsightsPanelProps {
  liveSession?: boolean;
}

export const SessionInsightsPanel: React.FC<SessionInsightsPanelProps> = ({ liveSession = true }) => {
  const { insights, addUserStatement, addUserPreference, addUserFriction, addUserDecision, setHypothesis } = useSession();
  
  const handleCopyInsights = () => {
    // Create a formatted string of all insights
    const formattedInsights = `
# Session Insights Summary

## Testable Hypothesis
${insights.hypothesis || 'No hypothesis generated yet'}

## User Statements
${insights.statements.length > 0 
  ? insights.statements.map(s => `- "${s.content}"\n`).join('') 
  : 'No statements extracted yet'}

## Stated Preferences
${insights.preferences.length > 0 
  ? insights.preferences.map(p => `- "${p.content}"\n`).join('') 
  : 'No preferences identified yet'}

## Expressed Friction
${insights.frictions.length > 0 
  ? insights.frictions.map(f => `- "${f.content}" (${f.severity})\n`).join('') 
  : 'No friction points identified yet'}

## Stated Decisions
${insights.decisions.length > 0 
  ? insights.decisions.map(d => `- "${d.content}"\n`).join('') 
  : 'No decisions mentioned yet'}
    `;
    
    navigator.clipboard.writeText(formattedInsights)
      .then(() => {
        alert('Insights copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy insights:', err);
        alert('Failed to copy insights to clipboard');
      });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Real-time User Insights</h2>
        {liveSession && (
          <Button
            variant="outline"
            onClick={handleCopyInsights}
            className="flex items-center"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy All Insights
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Testable Hypothesis</h3>
          <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-medium">
            PENDING ANALYSIS
          </span>
        </div>

        {insights.hypothesis ? (
          <p>{insights.hypothesis}</p>
        ) : (
          <div className="text-center py-10 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No hypothesis generated yet</p>
            <p className="text-sm text-muted-foreground">
              Run analysis to generate testable hypotheses from transcript
            </p>
            
            {liveSession && (
              <Button className="mt-4">
                <Search className="mr-2 h-4 w-4" />
                Analyze Transcript
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <InsightSection 
          title="User Statements"
          icon={<MessageSquare className="h-5 w-5" />}
          count={insights.statements.length}
          emptyMessage="No statements extracted yet"
          emptySubMessage="Extract user quotes and reactions from transcript"
          actionLabel={liveSession ? "Extract Statements" : undefined}
          onAction={() => liveSession && addUserStatement("This checkout flow is confusing me")}
        />
        
        <InsightSection 
          title="Stated Preferences"
          icon={<Heart className="h-5 w-5" />}
          count={insights.preferences.length}
          emptyMessage="No preferences identified yet"
          emptySubMessage="Find explicitly stated user preferences"
          actionLabel={liveSession ? "Find Preferences" : undefined}
          onAction={() => liveSession && addUserPreference("I prefer a simpler checkout form")}
        />
        
        <InsightSection 
          title="Expressed Friction"
          icon={<AlertTriangle className="h-5 w-5" />}
          count={insights.frictions.length}
          emptyMessage="No friction points identified yet"
          emptySubMessage="Identify pain points in the user experience"
          actionLabel={liveSession ? "Identify Friction" : undefined}
          onAction={() => liveSession && addUserFriction("Can't find the checkout button", "medium")}
        />
        
        <InsightSection 
          title="Stated Decisions"
          icon={<CheckSquare className="h-5 w-5" />}
          count={insights.decisions.length}
          emptyMessage="No decisions mentioned yet"
          emptySubMessage="Track user decision points and choices"
          actionLabel={liveSession ? "Record Decisions" : undefined}
          onAction={() => liveSession && addUserDecision("Chose to abandon cart after seeing shipping costs")}
        />
      </div>
    </div>
  );
};

interface InsightSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  emptyMessage: string;
  emptySubMessage: string;
  actionLabel?: string;
  onAction?: () => void;
}

const InsightSection: React.FC<InsightSectionProps> = ({
  title,
  icon,
  count,
  emptyMessage,
  emptySubMessage,
  actionLabel,
  onAction
}) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center text-lg font-medium">
          <span className="mr-2">{icon}</span>
          {title}
        </h3>
        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
          PENDING
        </span>
      </div>
      
      {count > 0 ? (
        <div className="space-y-3">
          {/* This would map through actual data in a real app */}
          <p className="text-sm">Data will appear here when collected</p>
        </div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            {icon}
          </div>
          <p className="text-lg font-medium">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground">
            {emptySubMessage}
          </p>
          
          {actionLabel && onAction && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
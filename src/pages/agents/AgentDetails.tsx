import { useState } from 'react';
import type { AnalysisResult } from '@/types';

// Render analysis modal component
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
            <span className={`text-sm font-medium ${analysis.resolutionRate.taskCompleted ? 'text-success' : 'text-destructive'}`}>
              {analysis.resolutionRate.taskCompleted ? 'Yes' : 'No'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.resolutionRate.description}</p>
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
          <span className="text-sm">{analysis.userIntent.primary}</span>
        </div>
        {analysis.userIntent.secondary.length > 0 && (
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
        {analysis.workflowPatterns.map((pattern, i) => (
          <div key={i} className="bg-muted p-4 rounded-lg text-sm">
            {pattern}
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-medium mb-2">UX Issues</h3>
      {analysis.repetitiveQuestions.length > 0 && (
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
        {analysis.featureRequests.map((request, i) => (
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

// Main AgentDetails component
export const AgentDetails = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  return (
    <div>
      {analysis && renderAnalysisModal(analysis)}
    </div>
  );
};
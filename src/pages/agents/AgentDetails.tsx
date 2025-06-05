import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getTranscripts, analyzeTranscripts, type AnalysisResult } from '../../services/transcripts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function AgentDetails() {
  const { id } = useParams<{ id: string }>();
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchTranscripts() {
      try {
        const data = await getTranscripts(id);
        setTranscripts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transcripts');
      }
    }

    fetchTranscripts();
  }, [id]);

  const handleAnalyze = async () => {
    if (!transcripts.length) {
      setError('No transcripts available to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const transcriptIds = transcripts.map(t => t.id);
      const result = await analyzeTranscripts(transcriptIds);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Agent Details</h1>
      
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Transcripts</h2>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <Button
            onClick={handleAnalyze}
            disabled={loading || !transcripts.length}
          >
            {loading ? 'Analyzing...' : 'Analyze Transcripts'}
          </Button>
        </div>

        {analysis && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Analysis Results</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Summary</h4>
                <p>{analysis.summary}</p>
              </div>
              
              <div>
                <h4 className="font-medium">Sentiment Scores</h4>
                <ul>
                  <li>Positive: {analysis.sentiment_scores.positive}</li>
                  <li>Neutral: {analysis.sentiment_scores.neutral}</li>
                  <li>Negative: {analysis.sentiment_scores.negative}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Key Points</h4>
                <ul className="list-disc pl-5">
                  {analysis.key_points.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">Recommendations</h4>
                <ul className="list-disc pl-5">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {transcripts.map((transcript) => (
            <div key={transcript.id} className="border-b py-4">
              <p className="text-gray-600 text-sm">
                {new Date(transcript.created_at).toLocaleString()}
              </p>
              <p className="mt-2">{transcript.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export { AgentDetails }
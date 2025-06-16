import { VertexAI } from '@google-cloud/vertexai';

export async function startLiveStream(projectId: string, location: string) {
  const vertex = new VertexAI({ project: projectId, location });

  // Use Gemini preview model for live streaming
  const model = vertex.preview.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });

  const stream = await model.generateContentStream({
    realtimeInputConfig: {
      videoConfig: {
        mediaResolution: 'MEDIA_RESOLUTION_LOW',
      },
    },
  });

  return stream;
}

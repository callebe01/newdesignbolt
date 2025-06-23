export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

const env: any =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

function parseBoundingBoxes(data: any): BoundingBox[] {
  const boxes: BoundingBox[] = [];
  const candidates = data?.candidates ?? [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts ?? [];
    for (const part of parts) {
      const det = part.object_detection || part.objectDetection || part.inline_data?.object_detection;
      const detections = det?.bounding_boxes || det?.boundingBoxes || [];
      if (Array.isArray(detections)) {
        for (const b of detections) {
          boxes.push({
            x: b.x ?? b.left ?? 0,
            y: b.y ?? b.top ?? 0,
            width: b.width ?? (b.right && b.left ? b.right - b.left : 0),
            height: b.height ?? (b.bottom && b.top ? b.bottom - b.top : 0),
            label: b.displayName || b.label,
          });
        }
      }
    }
  }
  return boxes;
}

export async function detectObjects(base64Image: string): Promise<BoundingBox[]> {
  const apiKey =
    (window as any).voicepilotGoogleApiKey ||
    env.VITE_GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GOOGLE_API_KEY not set');
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  data: base64Image,
                  mime_type: 'image/jpeg',
                },
              },
            ],
          },
        ],
        tools: [{ object_detection: {} }],
      }),
    }
  );

  if (!resp.ok) {
    throw new Error('Object detection request failed');
  }

  const data = await resp.json();
  return parseBoundingBoxes(data);
}

import React, { useEffect, useRef } from 'react';
import { BoundingBox } from '../../services/objectDetection';

interface Props {
  boxes: BoundingBox[];
  visible: boolean;
}

export const ObjectDetectionOverlay: React.FC<Props> = ({ boxes, visible }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    for (const box of boxes) {
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
  }, [boxes, visible]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
};

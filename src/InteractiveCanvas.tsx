import React, { useState, useRef, useCallback, useEffect } from 'react';

interface InteractiveCanvasProps {
  children: React.ReactNode | ((canvasState: { canvasRef: React.RefObject<HTMLDivElement | null>; zoom: number; pan: { x: number; y: number } }) => React.ReactNode);
  onCanvasClick?: (x: number, y: number) => void;
  className?: string;
  disableCanvasClick?: boolean;
  onResetViewReady?: (resetFn: () => void) => void;
}

// Utility function to detect mobile devices
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
};

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  children,
  onCanvasClick,
  className = '',
  disableCanvasClick = false,
  onResetViewReady
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isTouch, setIsTouch] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Pan when holding Ctrl/Cmd
      setPan({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY
      });
    } else {
      // Zoom with plain scroll wheel
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
      
      const deltaZoom = newZoom - zoom;
      const newPan = {
        x: pan.x - (mouseX - pan.x) * (deltaZoom / zoom),
        y: pan.y - (mouseY - pan.y) * (deltaZoom / zoom)
      };
      
      setZoom(newZoom);
      setPan(newPan);
    }
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle mouse or Alt+click for panning
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (e.button === 0 && !disableCanvasClick) {
      // Left click on canvas (check if click is on canvas or canvas-content)
      const target = e.target as HTMLElement;
      const isCanvasClick = target.classList.contains('interactive-canvas') || 
                           target.classList.contains('canvas-content');
      
      if (!isCanvasClick) return;
      
      // Check if this is a person node or other interactive element
      const isPersonNode = target.closest('.person-node');
      const isInteractiveElement = target.closest('[data-person-id]') || 
                                  target.closest('button') || 
                                  target.closest('input') || 
                                  target.closest('select');
      
      if (isPersonNode || isInteractiveElement) {
        // Let the person node or other element handle the click
        return;
      }
      
      // Check if we're in a mode that allows canvas clicks (add-person)
      if (onCanvasClick && className?.includes('mode-add-person')) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        onCanvasClick(x, y);
        return;
      }
      
      // In navigate mode, start panning on empty canvas click
      if (className?.includes('mode-navigate')) {
        e.preventDefault();
        setIsPanning(true);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    }
  }, [pan, zoom, onCanvasClick, disableCanvasClick, className]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      // Reduce panning speed by 30%
      const panSpeed = 0.7;
      
      setPan({
        x: pan.x + deltaX * panSpeed,
        y: pan.y + deltaY * panSpeed
      });
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastPanPoint, pan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch event handlers for mobile devices
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsTouch(true);
    
    if (e.touches.length === 1) {
      // Single touch - start panning or handle tap
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      
      // Check if this is a canvas click
      const isCanvasClick = target.classList.contains('interactive-canvas') || 
                           target.classList.contains('canvas-content');
      
      if (!isCanvasClick) return;
      
      // Check if we're in a mode that allows canvas clicks (add-person)
      if (onCanvasClick && className?.includes('mode-add-person')) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = (touch.clientX - rect.left - pan.x) / zoom;
        const y = (touch.clientY - rect.top - pan.y) / zoom;
        onCanvasClick(x, y);
        return;
      }
      
      // Start panning
      setIsPanning(true);
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      e.preventDefault();
      setIsPanning(false);
      const distance = getTouchDistance(e.touches);
      setLastTouchDistance(distance);
      const center = getTouchCenter(e.touches);
      setLastPanPoint(center);
    }
  }, [pan, zoom, onCanvasClick, className]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isPanning) {
      // Single finger pan
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;
      
      const panSpeed = 1.0;
      
      setPan({
        x: pan.x + deltaX * panSpeed,
        y: pan.y + deltaY * panSpeed
      });
      
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      
      if (lastTouchDistance > 0) {
        const scale = distance / lastTouchDistance;
        const newZoom = Math.max(0.1, Math.min(3, zoom * scale));
        
        // Zoom towards the center of the pinch
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const centerX = center.x - rect.left;
          const centerY = center.y - rect.top;
          
          const deltaZoom = newZoom - zoom;
          const newPan = {
            x: pan.x - (centerX - pan.x) * (deltaZoom / zoom),
            y: pan.y - (centerY - pan.y) * (deltaZoom / zoom)
          };
          
          setZoom(newZoom);
          setPan(newPan);
        }
      }
      
      setLastTouchDistance(distance);
      setLastPanPoint(center);
    }
  }, [isPanning, lastPanPoint, lastTouchDistance, zoom, pan]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setIsTouch(false);
      setLastTouchDistance(0);
    } else if (e.touches.length === 1) {
      // Switch from multi-touch to single touch
      const touch = e.touches[0];
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      setLastTouchDistance(0);
    }
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const returnToOrigin = useCallback(() => {
    // Smooth transition to origin
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(3, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsPanning(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;
        
        // Reduce panning speed by 30%
        const panSpeed = 0.7;
        
        setPan(prev => ({
          x: prev.x + deltaX * panSpeed,
          y: prev.y + deltaY * panSpeed
        }));
        
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    };

    if (isPanning) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, lastPanPoint]);

  // Expose reset function to parent
  useEffect(() => {
    if (onResetViewReady) {
      onResetViewReady(returnToOrigin);
    }
  }, [onResetViewReady, returnToOrigin]);

  return (
    <div className={`interactive-canvas-container ${className} ${isPanning ? 'panning' : ''}`}>
      <div className="canvas-controls">
        <button onClick={zoomIn} title="Zoom In">+</button>
        <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomOut} title="Zoom Out">-</button>
        <button onClick={resetView} title="Reset View">⌂</button>
        <button onClick={returnToOrigin} title="Return to Origin">⊙</button>
      </div>
      
      <div
        ref={canvasRef}
        className={`interactive-canvas ${isPanning ? 'panning' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {typeof children === 'function' 
            ? children({ canvasRef, zoom, pan })
            : children
          }
        </div>
      </div>
      
      <div className="navigation-help">
        <small>
          {isMobile() 
            ? "Touch: Pan • Pinch: Zoom" 
            : "Drag: Pan • Scroll: Zoom • Ctrl+Scroll: Pan • Alt+Click: Pan"
          }
        </small>
      </div>
      
      <div className="debug-info">
        <small>
          Mode: {isMobile() ? "Mobile" : "Desktop"} | trvdition v0.0.1
        </small>
      </div>
    </div>
  );
};
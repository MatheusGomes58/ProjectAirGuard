import { useRef, useState, useCallback } from 'react';
import DraggableElement from './DraggableElement.jsx';
import styles from './SlideCanvas.module.css';

export default function SlideCanvas({
  slide,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  theme,
}) {
  const canvasRef = useRef(null);
  const [guides, setGuides] = useState({ x: false, y: false });

  const getBackgroundStyle = useCallback(() => {
    const bg = slide.background;
    if (bg.type === 'gradient') {
      return {
        background: `linear-gradient(${bg.gradientDirection || '135deg'}, ${bg.value}, ${bg.secondaryValue})`,
      };
    }
    if (bg.type === 'image') {
      return {
        backgroundImage: `url(${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    return { backgroundColor: bg.value };
  }, [slide.background]);

  function handleCanvasClick(e) {
    if (e.target === canvasRef.current) {
      onSelectElement(null);
    }
  }

  // Show center guides when element is near center
  function handleElementMove(element, x, y, width, height) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const threshold = 1.5;

    setGuides({
      x: Math.abs(centerX - 50) < threshold,
      y: Math.abs(centerY - 50) < threshold,
    });
  }

  function handleElementMoveEnd() {
    setGuides({ x: false, y: false });
  }

  // Snap to center helper
  function snapToCenter(element, x, y, width, height) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const threshold = 1.5;
    let snappedX = x;
    let snappedY = y;

    if (Math.abs(centerX - 50) < threshold) {
      snappedX = 50 - width / 2;
    }
    if (Math.abs(centerY - 50) < threshold) {
      snappedY = 50 - height / 2;
    }

    return { x: snappedX, y: snappedY };
  }

  return (
    <div className={styles.canvasWrapper}>
      <div
        ref={canvasRef}
        className={styles.canvas}
        style={getBackgroundStyle()}
        onClick={handleCanvasClick}
      >
        {/* Center guides */}
        {guides.x && <div className={styles.guideVertical} />}
        {guides.y && <div className={styles.guideHorizontal} />}

        {slide.elements.map((element) => (
          <DraggableElement
            key={element.id}
            element={element}
            isSelected={element.id === selectedElementId}
            onSelect={() => onSelectElement(element.id)}
            onUpdate={(updates) => onUpdateElement(element.id, updates)}
            onMove={handleElementMove}
            onMoveEnd={handleElementMoveEnd}
            snapToCenter={snapToCenter}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
}

import { useRef, useState, useCallback, useEffect } from 'react';
import styles from './DraggableElement.module.css';

export default function DraggableElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onMove,
  onMoveEnd,
  snapToCenter,
  theme,
}) {
  const elementRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const handleMouseDown = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect();
      setIsDragging(true);
      const parent = elementRef.current?.parentElement;
      if (!parent) return;
      setDragStart({
        x: e.clientX - (element.x / 100) * parent.clientWidth,
        y: e.clientY - (element.y / 100) * parent.clientHeight,
      });
    },
    [element.x, element.y, onSelect]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect();
      const touch = e.touches[0];
      setIsDragging(true);
      const parent = elementRef.current?.parentElement;
      if (!parent) return;
      setDragStart({
        x: touch.clientX - (element.x / 100) * parent.clientWidth,
        y: touch.clientY - (element.y / 100) * parent.clientHeight,
      });
    },
    [element.x, element.y, onSelect]
  );

  const handleResizeMouseDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY, w: element.width, h: element.height });
    },
    [element.width, element.height]
  );

  const handleResizeTouchStart = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      const touch = e.touches[0];
      setIsResizing(true);
      setResizeStart({ x: touch.clientX, y: touch.clientY, w: element.width, h: element.height });
    },
    [element.width, element.height]
  );

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (clientX, clientY) => {
      const parent = elementRef.current?.parentElement;
      if (!parent) return;

      if (isDragging) {
        const parentRect = parent.getBoundingClientRect();
        let newX = ((clientX - dragStart.x) / parentRect.width) * 100;
        let newY = ((clientY - dragStart.y) / parentRect.height) * 100;
        newX = Math.max(0, Math.min(100 - element.width, newX));
        newY = Math.max(0, Math.min(100 - element.height, newY));

        // Snap to center
        if (snapToCenter) {
          const snapped = snapToCenter(element, newX, newY, element.width, element.height);
          newX = snapped.x;
          newY = snapped.y;
        }

        // Report movement for guides
        if (onMove) {
          onMove(element, newX, newY, element.width, element.height);
        }

        onUpdate({ x: newX, y: newY });
      }

      if (isResizing) {
        const parentRect = parent.getBoundingClientRect();
        const deltaX = ((clientX - resizeStart.x) / parentRect.width) * 100;
        const deltaY = ((clientY - resizeStart.y) / parentRect.height) * 100;
        onUpdate({
          width: Math.max(5, Math.min(100 - element.x, resizeStart.w + deltaX)),
          height: Math.max(5, Math.min(100 - element.y, resizeStart.h + deltaY)),
        });
      }
    };

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (onMoveEnd) onMoveEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, element, onUpdate, onMove, onMoveEnd, snapToCenter]);

  function renderContent() {
    switch (element.type) {
      case 'title':
      case 'text':
        return (
          <div
            className={styles.textContent}
            style={{
              fontSize: element.style.fontSize,
              fontWeight: element.style.fontWeight,
              color: element.style.color,
              textAlign: element.style.textAlign,
              fontFamily: theme.fontFamily,
              whiteSpace: 'pre-wrap',
            }}
          >
            {element.content}
          </div>
        );
      case 'image':
        return element.content ? (
          <img
            src={element.content}
            alt=""
            className={styles.imageContent}
            style={{
              objectFit: element.style.objectFit || 'cover',
              borderRadius: element.style.borderRadius,
            }}
            draggable={false}
          />
        ) : (
          <div className={styles.placeholder}>
            <span>Imagem</span>
            <small>Upload ou URL nas propriedades</small>
          </div>
        );
      case 'video':
        return element.content ? (
          <video
            src={element.content}
            className={styles.videoContent}
            style={{ borderRadius: element.style.borderRadius }}
            controls={false}
            muted
          />
        ) : (
          <div className={styles.placeholder}>
            <span>Vídeo</span>
            <small>Upload ou URL nas propriedades</small>
          </div>
        );
      case 'iframe':
        return element.content ? (
          <div className={styles.iframeWrapper} style={{ borderRadius: element.style.borderRadius }}>
            <iframe
              src={element.content}
              className={styles.iframeContent}
              style={{ borderRadius: element.style.borderRadius }}
              title="Embedded content"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            <div className={styles.iframeOverlay} />
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span>Iframe</span>
            <small>Defina a URL nas propriedades</small>
          </div>
        );
      case 'table': {
        try {
          const tableData = JSON.parse(element.content);
          return (
            <table className={styles.tableContent} style={{ color: element.style.color, fontSize: element.style.fontSize }}>
              <tbody>
                {tableData.data.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} style={{ border: element.style.border, fontWeight: rowIdx === 0 ? '600' : '400' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        } catch {
          return <div className={styles.placeholder}>Tabela inválida</div>;
        }
      }
      case 'shape':
        return (
          <div
            className={styles.shapeContent}
            style={{
              backgroundColor: element.style.backgroundColor,
              borderRadius: element.style.borderRadius,
              opacity: element.style.opacity,
              border: element.style.border,
            }}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div
      ref={elementRef}
      className={`${styles.element} ${isSelected ? styles.selected : ''} ${isDragging ? styles.dragging : ''}`}
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {renderContent()}
      {isSelected && (
        <div
          className={styles.resizeHandle}
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeTouchStart}
        />
      )}
    </div>
  );
}

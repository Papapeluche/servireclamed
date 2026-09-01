"use client";

import { useRef, useState } from "react";

export default function ImageZoomViewer({ src, alt }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragState = useRef(null);

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.min(5, Math.max(1, s + delta)));
  }

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: pos };
  }

  function handlePointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({
      x: dragState.current.origin.x + dx,
      y: dragState.current.origin.y + dy,
    });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function resetZoom() {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Rueda del mouse o pellizco para hacer zoom · arrastra para mover</span>
        <button
          onClick={resetZoom}
          className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50"
        >
          Restablecer
        </button>
      </div>
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative flex-1 cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-900 active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
          className="pointer-events-none absolute left-0 top-0 h-full w-full select-none object-contain transition-transform duration-75"
        />
      </div>
    </div>
  );
}

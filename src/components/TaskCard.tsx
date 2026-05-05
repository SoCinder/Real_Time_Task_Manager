"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function TaskCard({ task, onClick }: any) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? "none"
      : transition || "transform 200ms ease",
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        bg-[var(--card)] border border-[var(--border)]
        p-3 mb-2 rounded-lg shadow-sm
        hover:shadow-md transition
        animate-in
        ${task._deleting ? "animate-out" : ""}
      `}
    >
      {/* drag handle */}
      <div
        {...listeners}
        className="h-2 bg-[var(--border)] rounded mb-2 cursor-grab active:cursor-grabbing"
      />

      {/* content */}
      <div
        onClick={() => onClick?.(task)}
        className="cursor-pointer"
      >
        {task.title}
      </div>
    </div>
  );
}
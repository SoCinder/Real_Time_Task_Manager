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
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        console.log("CLICK:", task.id);
        onClick?.(task);
      }}
      className="bg-white p-3 mb-2 rounded shadow cursor-grab active:cursor-grabbing"
    >
      {task.title}
    </div>
  );
}
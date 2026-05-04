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
    transition: transition || "transform 200ms ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white p-3 mb-2 rounded shadow"
    >
      
      <div
        {...listeners}
        className="h-2 bg-gray-300 rounded mb-2 cursor-grab active:cursor-grabbing"
      />

      
      <div
        onClick={() => {
          console.log("CLICK:", task.id);
          onClick?.(task);
        }}
        className="cursor-pointer"
      >
        {task.title}
      </div>
    </div>
  );
}
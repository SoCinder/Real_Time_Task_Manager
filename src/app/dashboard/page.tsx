"use client";

import { useEffect, useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TaskCard } from "@/components/TaskCard";
import { TaskSidebar } from "@/components/TaskSidebar";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
};

const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then(setTasks)
      .catch(console.error);
  }, []);

  const grouped = useMemo(() => {
    const g = {
      TODO: [] as Task[],
      IN_PROGRESS: [] as Task[],
      DONE: [] as Task[],
    };

    for (const t of tasks) {
      g[t.status].push(t);
    }

    for (const key of columns) {
      g[key].sort((a, b) => a.position - b.position);
    }

    return g;
  }, [tasks]);

  const onDragStart = (event: DragStartEvent) => {
    console.log("🚀 DRAG START:", event.active.id);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const dragged = tasks.find((t) => t.id === taskId);
    if (!dragged) return;

    let newStatus = dragged.status;

    if (columns.includes(overId as any)) {
      newStatus = overId as Task["status"];
    }

    const target = tasks.find((t) => t.id === overId);
    if (target) {
      newStatus = target.status;
    }

    const previous = tasks;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        setTasks(previous);
      }
    } catch {
      setTasks(previous);
    }
  };

  const onTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  function Column({ col }: { col: Task["status"] }) {
    const { setNodeRef } = useDroppable({ id: col });

    return (
      <div
        ref={setNodeRef}
        className="bg-gray-100 p-4 rounded min-h-[400px]"
      >
        <h2 className="font-bold mb-3">{ col }</h2>

        <SortableContext
          items={grouped[col].map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {grouped[col].map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))}
        </SortableContext>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">My Kanban Board</h1>

      {selectedTask && (
        <div className="fixed inset-0 z-50">
          <TaskSidebar
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdated={(updated) => {
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === updated.id ? updated : t
                )
              );
            }}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <Column key={col} col={col} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
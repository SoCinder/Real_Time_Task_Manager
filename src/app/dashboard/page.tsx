"use client";

import { useEffect, useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
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
import * as Ably from "ably";

import type { Task } from "@/types/task";

const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [showUndo, setShowUndo] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // ---------------- FETCH ----------------
  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // ---------------- ABLY ----------------
  useEffect(() => {
    const client = new Ably.Realtime(
      process.env.NEXT_PUBLIC_ABLY_KEY!
    );

    const channel = client.channels.get("tasks");

    channel.subscribe("bulk_update", (msg) => {
      setTasks(msg.data);
    });

    return () => {
      channel.unsubscribe();
      client.close();
    };
  }, []);

  // ---------------- GROUP ----------------
  const grouped = useMemo(() => {
    const g: Record<Task["status"], Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const t of tasks) {
      if (!t || t.deletedAt) continue;
      g[t.status].push(t);
    }

    for (const key of columns) {
      g[key].sort((a, b) => a.position - b.position);
    }

    return g;
  }, [tasks]);

  // ---------------- DRAG (LINEAR STYLE FIXED) ----------------
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // ❗ NO local ordering logic anymore
    // We only send intent to server

    try {
      await fetch("/api/tasks/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: activeId,
          overId,
        }),
      });
    } catch (err) {
      console.error("Move failed:", err);
      fetchTasks(); // fallback safety
    }
  };

  // ---------------- TASK CLICK ----------------
  const onTaskClick = (task: Task) => {
    setSelectedTask(task);
    setCreateMode(false);
  };

  // ---------------- UNDO ----------------
  const handleUndo = async () => {
    await fetch("/api/actions/undo", {
      method: "POST",
    });

    setShowUndo(false);
    fetchTasks();
  };

  // ---------------- COLUMN ----------------
  function Column({ col }: { col: Task["status"] }) {
    const { setNodeRef } = useDroppable({ id: col });

    return (
      <div
        ref={setNodeRef}
        className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl shadow-sm min-h-[400px]"
      >
        <h2 className="font-bold mb-3">{col}</h2>

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
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-bold">My Kanban Board</h1>

        <button
          onClick={() => {
            setSelectedTask(null);
            setCreateMode(true);
          }}
          className="bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg"
        >
          + Add Task
        </button>
      </div>

      {/* SIDEBAR */}
      {(selectedTask || createMode) && (
        <TaskSidebar
          task={selectedTask}
          createMode={createMode}
          onClose={() => {
            setSelectedTask(null);
            setCreateMode(false);
          }}
          onCreated={fetchTasks}
          onUpdated={fetchTasks}
          onDeleted={async (task: Task) => {
            await fetch(`/api/tasks/${task.id}`, {
              method: "DELETE",
            });

            setShowUndo(true);
          }}
        />
      )}

      {/* UNDO BAR */}
      {showUndo && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg flex gap-3 items-center">
          Task deleted
          <button onClick={handleUndo} className="underline">
            Undo
          </button>
        </div>
      )}

      {/* BOARD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
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
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const deleteTimerRef = useRef<any>(null);

  const pendingDeleteRef = useRef<Task | null>(null);
  const hydratedRef = useRef(false);
  const ablyRef = useRef<Ably.Realtime | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // ---------------- FETCH ----------------
  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data);
        hydratedRef.current = true;
      });
  }, []);

  // keep ref in sync
  useEffect(() => {
    pendingDeleteRef.current = pendingDelete;
  }, [pendingDelete]);

  // ---------------- ABLY ----------------
  useEffect(() => {
    if (ablyRef.current) return;

    const client = new Ably.Realtime(
      process.env.NEXT_PUBLIC_ABLY_KEY!
    );

    ablyRef.current = client;

    const channel = client.channels.get("tasks");

    channel.subscribe("bulk_update", (msg) => {
      if (!hydratedRef.current) return;

      const pendingId = pendingDeleteRef.current?.id;

      setTasks((prev) => {
        return msg.data.filter((t: Task) => t.id !== pendingId);
      });
    });

    return () => {
      channel.unsubscribe();
      client.close();
      ablyRef.current = null;
    };
  }, []);

  // ---------------- GROUP ----------------
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

  // ---------------- DRAG ----------------
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    const overTask = tasks.find((t) => t.id === overId);

    if (!activeTask) return;

    let newStatus = activeTask.status;

    if (columns.includes(overId as any)) {
      newStatus = overId as Task["status"];
    } else if (overTask) {
      newStatus = overTask.status;
    }

    const map: Record<Task["status"], Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const t of tasks) {
      if (t.id !== activeId) {
        map[t.status].push(t);
      }
    }

    const target = map[newStatus];

    let index = target.length;

    if (overTask) {
      index = target.findIndex((t) => t.id === overTask.id);
    }

    target.splice(index, 0, {
      ...activeTask,
      status: newStatus,
      position: index,
    });

    for (const col of columns) {
      map[col] = map[col].map((t, i) => ({
        ...t,
        position: i,
      }));
    }

    const rebuilt = [
      ...map.TODO,
      ...map.IN_PROGRESS,
      ...map.DONE,
    ];

    setTasks(rebuilt);

    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tasks: rebuilt }),
    });
  };

  const onTaskClick = (task: Task) => {
    setSelectedTask(task);
    setCreateMode(false);
  };

  // ---------------- UNDO ----------------
  // In undoDelete:
  const undoDelete = async () => {
    if (!pendingDelete) return;

    clearTimeout(deleteTimerRef.current);

    // 2. Restore the task to local state
    setTasks((prev) => [...prev, pendingDelete]);

    await fetch(`/api/tasks/${pendingDelete.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deletedAt: null }),
    });

    setPendingDelete(null);
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
          onCreated={(task: Task) =>
            setTasks((prev) => [...prev, task])
          }
          onUpdated={(updated: Task) =>
            setTasks((prev) =>
              prev.map((t) =>
                t.id === updated.id ? updated : t
              )
            )
          }
          // In onDeleted callback:
          onDeleted={(task: Task) => {
            if (!task?.id) return;

            // 1. Remove from local state immediately
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            setSelectedTask(null);
            setCreateMode(false);

            setPendingDelete(task);
            clearTimeout(deleteTimerRef.current);

            deleteTimerRef.current = setTimeout(async () => {
              await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
              setPendingDelete(null);
            }, 5000);
          }}
        />
      )}

      {/* UNDO BAR */}
      {pendingDelete && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg flex gap-3 items-center">
          Task deleted
          <button onClick={undoDelete} className="underline">
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
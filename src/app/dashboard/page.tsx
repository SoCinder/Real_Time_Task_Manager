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

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
  _source?: "client" | "server";
};

const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

function mergeTask(prev: Task[], incoming: Task) {
  const others = prev.filter((t) => t.id !== incoming.id);
  const updated = [...others, incoming];

  const grouped: Record<string, Task[]> = {};

  for (const t of updated) {
    if (!grouped[t.status]) grouped[t.status] = [];
    grouped[t.status].push(t);
  }

  return Object.values(grouped).flatMap((group) =>
    group
      .sort((a, b) => a.position - b.position)
      .map((t, i) => ({ ...t, position: i }))
  );
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const ablyRef = useRef<Ably.Realtime | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // ✅ INITIAL FETCH (FIXED)
  useEffect(() => {
    console.log("📦 fetching tasks...");

    fetch("/api/tasks")
      .then(async (res) => {
        console.log("STATUS:", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("API ERROR:", text);
          return [];
        }

        return res.json();
      })
      .then((data) => {
        console.log("✅ tasks loaded:", data);
        setTasks(data);
        setHydrated(true); // 🔥 important
      })
      .catch((err) => console.error("❌ fetch error", err));
  }, []);

  // ✅ REALTIME (FIXED + STABLE)
  useEffect(() => {
    if (ablyRef.current) return;

    const client = new Ably.Realtime(
      process.env.NEXT_PUBLIC_ABLY_KEY!
    );

    ablyRef.current = client;

    const channel = client.channels.get("tasks");

    channel.subscribe("created", (msg) => {
      if (!hydrated) return;

      const task = msg.data;

      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) return prev;
        return [...prev, task];
      });
    });

    channel.subscribe("updated", (msg) => {
      if (!hydrated) return;

      const task = msg.data;

      if (task._source === "client") return;

      setTasks((prev) => mergeTask(prev, task));
    });

    channel.subscribe("deleted", (msg) => {
      if (!hydrated) return;

      const { id } = msg.data;

      setTasks((prev) =>
        prev.filter((t) => t.id !== id)
      );
    });

    return () => {
      try {
        channel.unsubscribe("created");
        channel.unsubscribe("updated");
        channel.unsubscribe("deleted");

        // ❌ DO NOT close connection (prevents errors)
        ablyRef.current = null;
      } catch {}
    };
  }, [hydrated]);

  // ✅ GROUPING
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

  // ✅ DRAG
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

    const newTasks = [...tasks];

    const filtered = newTasks.filter(
      (t) => t.status === newStatus && t.id !== activeId
    );

    let newIndex = filtered.length;

    if (overTask) {
      newIndex = filtered.findIndex(
        (t) => t.id === overTask.id
      );
    }

    const updatedTask: Task = {
      ...activeTask,
      status: newStatus,
      position: newIndex,
      _source: "client",
    };

    filtered.splice(newIndex, 0, updatedTask);

    const final = newTasks
      .filter(
        (t) => t.id !== activeId && t.status !== newStatus
      )
      .concat(
        filtered.map((t, index) => ({
          ...t,
          position: index,
        }))
      );

    setTasks(final);

    try {
      await fetch(`/api/tasks/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          position: newIndex,
        }),
      });
    } catch {
      console.error("Failed to persist reorder");
    }
  };

  const onTaskClick = (task: Task) => {
    setSelectedTask(task);
    setCreateMode(false);
  };

  function Column({ col }: { col: Task["status"] }) {
    const { setNodeRef } = useDroppable({ id: col });

    return (
      <div
        ref={setNodeRef}
        className="bg-gray-100 p-4 rounded min-h-[400px]"
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">
          My Kanban Board
        </h1>

        <button
          onClick={() => {
            setSelectedTask(null);
            setCreateMode(true);
          }}
          className="bg-black text-white px-3 py-1 rounded"
        >
          + Add Task
        </button>
      </div>

      {/* SIDEBAR */}
      {(selectedTask || createMode) && (
        <div className="fixed inset-0 z-50">
          <TaskSidebar
            task={selectedTask}
            createMode={createMode}
            onClose={() => {
              setSelectedTask(null);
              setCreateMode(false);
            }}
            onCreated={(task: Task) => {
              setTasks((prev) => [...prev, task]);
            }}
            onUpdated={(updated: Task) => {
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === updated.id ? updated : t
                )
              );
            }}
          />
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
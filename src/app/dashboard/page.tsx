"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TaskCard } from "@/components/TaskCard";
import { TaskModal } from "@/components/TaskModal";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

const columns = ["TODO", "IN_PROGRESS", "DONE"] as const;

/* ================= COLUMN ================= */
function Column({
  id,
  tasks,
  onAdd,
  onSelect,
}: {
  id: Task["status"];
  tasks: Task[];
  onAdd: (status: Task["status"], title: string) => void;
  onSelect: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id, // ✅ ONLY STATUS HERE
  });

  const [title, setTitle] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) return;
    await onAdd(id, title);
    setTitle("");
  };

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded min-h-[500px] transition ${
        isOver ? "bg-blue-100" : "bg-gray-100"
      }`}
    >
      {/* COLUMN TITLE */}
      <h2 className="font-bold mb-3">{id}</h2>

      {/* ➕ ADD TASK */}
      <div className="mb-3">
        <input
          className="w-full p-2 text-sm border rounded"
          placeholder="Add task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />

        <button
          onClick={handleAdd}
          className="w-full mt-1 bg-black text-white text-sm py-1 rounded"
        >
          Add Task
        </button>
      </div>

      {/* TASK LIST */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onSelect}
          />
        ))}
      </SortableContext>
    </div>
  );
}

/* ================= DASHBOARD ================= */
export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // GET TASKS
  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  /* ================= CREATE TASK ================= */
  const addTask = async (
    status: Task["status"],
    title: string
  ) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: "",
        status,
      }),
    });

    const newTask = await res.json();
    setTasks((prev) => [newTask, ...prev]);
  };

  /* ================= DRAG FIX (IMPORTANT) ================= */
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // ✅ ONLY ACCEPT COLUMN DROPS (CRITICAL FIX)
    if (!columns.includes(overId as any)) return;

    const newStatus = overId as Task["status"];

    // optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  /* ================= FILTER ================= */
  const getTasks = (status: Task["status"]) =>
    tasks.filter((t) => t.status === status);

  /* ================= UI ================= */
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        My Kanban Board
      </h1>

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <Column
              key={col}
              id={col}
              tasks={getTasks(col)}
              onAdd={addTask}
              onSelect={setSelectedTask}
            />
          ))}
        </div>
      </DndContext>

      {/* MODAL */}
      <TaskModal
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
  );
}
"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  position: number;
};

export function TaskSidebar({
  task,
  onClose,
  onUpdated,
}: {
  task: Task | null;
  onClose: () => void;
  onUpdated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStatus(task.status);
    }
  }, [task]);

  if (!task) return null;

  const save = async () => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });

    if (!res.ok) return;

    onUpdated({ ...task, title, status });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
      <div className="w-[400px] bg-white p-5 h-full shadow-xl">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold">Edit Task</h2>
          <button onClick={onClose}>✕</button>
        </div>

        <input
          className="w-full border p-2 mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select
          className="w-full border p-2 mb-3"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as Task["status"])
          }
        >
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="DONE">DONE</option>
        </select>

        <button
          onClick={save}
          className="w-full bg-black text-white p-2 rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}
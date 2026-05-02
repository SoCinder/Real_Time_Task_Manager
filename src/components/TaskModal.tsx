"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

export function TaskModal({
  task,
  onClose,
  onUpdated,
}: {
  task: Task | null;
  onClose: () => void;
  onUpdated: (updated: Task) => void;
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task]);

  if (!task) return null;

  const saveTask = async () => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    const updated = await res.json();

    onUpdated(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[400px] p-5 rounded shadow-lg">
        <h2 className="text-lg font-bold mb-3">Edit Task</h2>

        <input
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded"
          >
            Cancel
          </button>

          <button
            onClick={saveTask}
            className="px-3 py-1 bg-black text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
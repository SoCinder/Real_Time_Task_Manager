"use client";

import { useEffect, useState } from "react";

import type { Task } from "@/types/task";

export function TaskModal({
  task,
  onClose,
  onUpdated,
  onCreated,
}: {
  task: Task | null;
  onClose: () => void;
  onUpdated?: (updated: Task) => void;
  onCreated?: (created: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
    } else {
      setTitle("");
      setDescription("");
      setStatus("TODO");
    }
  }, [task]);

  const saveTask = async () => {
    if (task) {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status }),
      });
      const updated = await res.json();
      onUpdated?.(updated);
      onClose();
    } else {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, status }),
      });
      if (!res.ok) {
        console.error("Failed to create task:", await res.text());
        return;
      }
      const created = await res.json();
      onCreated?.(created);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-[420px] p-5 rounded shadow-lg">
        <h2 className="text-lg font-bold mb-3">{task ? "Edit Task" : "Add Task"}</h2>

        <input
          className="w-full border p-2 rounded mb-2"
          value={title}
          placeholder="Title"
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border p-2 rounded mb-2"
          value={description}
          placeholder="Description"
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mb-2">
          <label className="mr-2">Status:</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])} className="border p-1 rounded">
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveTask} className="px-3 py-1 bg-black text-white rounded">{task ? "Save" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";

export function TaskSidebar({
  task,
  createMode,
  onClose,
  onCreated,
  onUpdated,
}: any) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("TODO");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setStatus(task.status || "TODO");
    } else {
      setTitle("");
      setStatus("TODO");
    }
  }, [task]);

  const handleSubmit = async () => {
    try {
      if (createMode) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            status,
          }),
        });

        const newTask = await res.json();
        onCreated?.(newTask);
      } else {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            status,
          }),
        });

        const updated = await res.json();
        onUpdated?.(updated);
      }

      onClose();
    } catch (e) {
      console.error("Submit error", e);
    }
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg p-4">
      <h2 className="text-lg font-bold mb-4">
        {createMode ? "Create Task" : "Edit Task"}
      </h2>

      <input
        className="w-full border p-2 mb-3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
      />

      <select
        className="w-full border p-2 mb-3"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="TODO">TODO</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="DONE">DONE</option>
      </select>

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-3 py-1 rounded w-full"
      >
        {createMode ? "Create" : "Update"}
      </button>

      <button
        onClick={onClose}
        className="mt-2 text-gray-500 w-full"
      >
        Cancel
      </button>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";

export function TaskSidebar({
  task,
  createMode,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
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

  // ---------------- CREATE / UPDATE ----------------
  const handleSubmit = async () => {
    try {
      if (createMode) {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, status }),
        });

        const newTask = await res.json();
        onCreated?.(newTask);
      } else {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, status }),
        });

        const updated = await res.json();
        onUpdated?.(updated);
      }

      onClose();
    } catch (e) {
      console.error("Submit error", e);
    }
  };

  // ---------------- DELETE (FIXED) ----------------
  const handleDelete = () => {
    if (!task) return;

    // ONLY notify parent (NO API CALL HERE)
    onDeleted?.(task);

    onClose();
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-[var(--card)] border-l border-[var(--border)] shadow-xl p-4">
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
        className="bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg font-medium w-full"
      >
        {createMode ? "Create" : "Update"}
      </button>

      {!createMode && (
        <button
          onClick={handleDelete}
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded w-full"
        >
          Delete
        </button>
      )}

      <button
        onClick={onClose}
        className="mt-2 text-gray-500 w-full"
      >
        Cancel
      </button>
    </div>
  );
}
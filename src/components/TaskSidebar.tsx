"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/types/task";

type Props = {
  task: Task | null;
  createMode: boolean;
  onClose: () => void;
  onCreated?: (task: Task) => void;
  onUpdated?: (task: Task) => void;
  onDeleted?: (task: Task) => void;
};

export function TaskSidebar({
  task,
  createMode,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("TODO");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------- SYNC ----------------
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "TODO");
    } else {
      setTitle("");
      setDescription("");
      setStatus("TODO");
    }
  }, [task]);

  // ---------------- CREATE / UPDATE ----------------
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = createMode
        ? "/api/tasks"
        : `/api/tasks/${task?.id}`;

      const method = createMode ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          description, 
        }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();

      if (createMode) {
        onCreated?.(data);
      } else {
        onUpdated?.(data);
      }

      onClose();
    } catch (e) {
      console.error("Submit error", e);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- DELETE ----------------
  const handleDelete = () => {
    if (!task) return;

    onDeleted?.(task);
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-[var(--card)] border-l border-[var(--border)] shadow-xl p-4">
      <h2 className="text-lg font-bold mb-4">
        {createMode ? "Create Task" : "Edit Task"}
      </h2>

      {/* ERROR */}
      {error && (
        <div className="mb-3 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* TITLE */}
      <input
        className="w-full border p-2 mb-3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        disabled={loading}
      />

      {/* DESCRIPTION ✨ NEW */}
      <textarea
        className="w-full border p-2 mb-3 h-24 resize-none"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Task description..."
        disabled={loading}
      />

      {/* STATUS */}
      <select
        className="w-full border p-2 mb-3"
        value={status}
        onChange={(e) =>
          setStatus(e.target.value as Task["status"])
        }
        disabled={loading}
      >
        <option value="TODO">TODO</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="DONE">DONE</option>
      </select>

      {/* SAVE */}
      <button
        onClick={handleSubmit}
        disabled={loading || !title.trim()}
        className="bg-[var(--accent)] text-white px-3 py-1.5 rounded-lg font-medium w-full disabled:opacity-50"
      >
        {loading
          ? "Saving..."
          : createMode
          ? "Create"
          : "Update"}
      </button>

      {/* DELETE */}
      {!createMode && (
        <button
          onClick={handleDelete}
          disabled={loading}
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded w-full disabled:opacity-50"
        >
          Delete
        </button>
      )}

      {/* CANCEL */}
      <button
        onClick={onClose}
        disabled={loading}
        className="mt-2 text-gray-500 w-full"
      >
        Cancel
      </button>
    </div>
  );
}
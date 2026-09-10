"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

export default function DefaultTasksPanel({
  shop,
  onSaved,
}: {
  shop: Shop | null;
  onSaved: () => void;
}) {
  const [tasks, setTasks] = useState<string[]>(shop?.default_tasks ?? []);
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!shop) {
    return (
      <p className="text-sm text-slate-500">
        Set up your Company Profile first to configure default tasks.
      </p>
    );
  }

  function addTask() {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, trimmed]);
    setNewTask("");
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    await supabase.from("shops").update({ default_tasks: tasks }).eq("id", shop!.id);
    setSaving(false);
    setSuccess(true);
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-600">Default Task Checklist</p>
        <p className="mt-1 text-xs text-slate-400">
          Pre-fills the task list whenever you assign a job to a technician —
          still editable per job at assignment time.
        </p>
      </div>

      <div className="space-y-1.5">
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400">No default tasks yet — add one below.</p>
        )}
        {tasks.map((task, index) => (
          <div
            key={`${task}-${index}`}
            className="flex items-center justify-between gap-2 rounded-xl bg-brand-slate px-3 py-2"
          >
            <span className="text-sm text-slate-900">{task}</span>
            <button
              type="button"
              onClick={() => removeTask(index)}
              className="shrink-0 text-slate-400 hover:text-red-400"
              aria-label="Remove task"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTask();
            }
          }}
          placeholder="e.g. Confirm client identity"
          className="w-full rounded-xl bg-brand-slate px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <button
          type="button"
          onClick={addTask}
          className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-brand-blue hover:text-brand-blue"
        >
          Add
        </button>
      </div>

      {success && (
        <p className="rounded-lg border border-brand-emerald/30 bg-brand-emerald/10 px-3.5 py-2.5 text-sm text-brand-emerald">
          Saved.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

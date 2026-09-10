"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function AssignTaskingModal({
  ticket,
  staffMember,
  defaultTasks,
  onClose,
  onAssigned,
}: {
  ticket: JobTicket;
  staffMember: StaffMember;
  defaultTasks: string[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [tasks, setTasks] = useState<string[]>(
    ticket.start_checklist.length > 0 ? ticket.start_checklist : defaultTasks
  );
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);

  function addTask() {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, trimmed]);
    setNewTask("");
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    setSaving(true);
    await supabase
      .from("job_tickets")
      .update({
        assigned_staff_id: staffMember.id,
        status: "SCHEDULED",
        start_checklist: tasks,
      })
      .eq("id", ticket.id);
    setSaving(false);
    onAssigned();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">
            Assign to {staffMember.full_name}
          </p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {ticket.client_name} — {ticket.service_type}
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Task Checklist
        </p>
        <div className="mt-2 space-y-1.5">
          {tasks.length === 0 && (
            <p className="text-xs text-slate-400">No tasks yet — add one below.</p>
          )}
          {tasks.map((task, index) => (
            <div
              key={`${task}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
            >
              <span className="text-sm text-slate-700">{task}</span>
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

        <div className="mt-2 flex gap-2">
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
            placeholder="Add a task..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
          <button
            type="button"
            onClick={addTask}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-blue hover:text-brand-blue"
          >
            Add
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Assigning..." : "Confirm & Notify Technician"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function TeamManager({ teams, editingTeam, onSubmit, onCancelEdit, onDelete, onEdit, canEdit }) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(editingTeam ? editingTeam.name : "");
  }, [editingTeam]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setName("");
  }

  return (
    <div className="bg-neutral-800 rounded-2xl shadow-lg border border-neutral-700 p-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Team Management
          </h2>
          <p className="text-sm text-neutral-400 mb-4">Add or edit the teams participating in the league.</p>

          {canEdit ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Team Name (e.g. Manchester City)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-4 rounded-lg transition-colors whitespace-nowrap"
                >
                  {editingTeam ? "Update Team" : "Add Team"}
                </button>
              </div>
              {editingTeam && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-sm text-neutral-400 hover:text-white self-start transition-colors underline decoration-neutral-600 underline-offset-2"
                >
                  Cancel Editing
                </button>
              )}
            </form>
          ) : (
            <p className="text-sm text-neutral-500 italic">Sign in to manage teams.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-3 uppercase tracking-wider">Active Teams</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {teams.length === 0 && <p className="text-neutral-500 text-sm italic">No teams added yet.</p>}
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex justify-between items-center bg-neutral-900 border border-neutral-700 p-3 rounded-lg"
              >
                <span className="text-sm text-white">{team.name}</span>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(team)}
                      className="text-neutral-400 hover:text-purple-400 transition-colors text-xs border border-neutral-700 hover:border-purple-400 px-2 py-1 rounded"
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => onDelete(team)}
                      className="text-neutral-500 hover:text-red-400 transition-colors text-xs border border-neutral-700 hover:border-red-400 px-2 py-1 rounded"
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

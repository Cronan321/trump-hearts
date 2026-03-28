import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTable } from '../api/tables'
import { useAuthStore } from '../store/authStore'
import type { TableResponse, RuleConfig } from '../types'

interface Props {
  onClose: () => void
  onCreated: (table: TableResponse) => void
}

const defaultRules: RuleConfig = {
  passing_direction: 'left',
  jack_of_diamonds: false,
  shoot_the_moon: 'add_to_others',
  breaking_hearts: true,
  first_trick_points: true,
}

export default function CreateTableModal({ onClose, onCreated }: Props) {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const [name, setName] = useState('')
  const [rules, setRules] = useState<RuleConfig>(defaultRules)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(field: keyof Pick<RuleConfig, 'jack_of_diamonds' | 'breaking_hearts' | 'first_trick_points'>) {
    setRules((r) => ({ ...r, [field]: !r[field] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      const table = await createTable(token, { name: name.trim(), rule_config: rules })
      onCreated(table)
      onClose()
      navigate(`/table/${table.table_id}`)
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string }
      setError(e.detail ?? e.message ?? 'Failed to create table.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-marble-light border border-gold rounded-lg p-6 max-w-md w-full shadow-gold-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-gold font-display font-bold text-xl mb-5">Create Table</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Table name */}
          <div className="flex flex-col gap-1">
            <label className="text-gold-light text-sm font-semibold">Table Name</label>
            <input
              type="text"
              required
              maxLength={64}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter table name…"
              className="bg-marble border border-gold/40 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-gold text-sm"
            />
          </div>

          {/* Passing direction — fixed cycle, not configurable */}
          <div className="flex flex-col gap-1">
            <label className="text-gold-light text-sm font-semibold">Passing Direction</label>
            <p className="text-gray-400 text-xs">
              Automatically cycles each round: Left → Right → Across → No Pass → repeat
            </p>
          </div>

          {/* Shoot the Moon */}
          <div className="flex flex-col gap-1">
            <label className="text-gold-light text-sm font-semibold">Shoot the Moon</label>
            <div className="flex gap-4 flex-wrap">
              {(['add_to_others', 'subtract_from_self'] as const).map((opt) => {
                const labels = { add_to_others: 'Add 26 to others', subtract_from_self: 'Subtract 26 from self' }
                return (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="shoot_the_moon"
                      value={opt}
                      checked={rules.shoot_the_moon === opt}
                      onChange={() => setRules((r) => ({ ...r, shoot_the_moon: opt }))}
                      className="accent-gold"
                    />
                    <span className="text-gray-300 text-sm">{labels[opt]}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Toggle rules */}
          <div className="flex flex-col gap-2">
            <label className="text-gold-light text-sm font-semibold">Rule Variants</label>
            {(
              [
                { field: 'jack_of_diamonds', label: 'J♦ worth -10 points' },
                { field: 'breaking_hearts', label: 'Must break hearts before leading' },
                { field: 'first_trick_points', label: 'No points on first trick' },
              ] as const
            ).map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => toggle(field)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    rules[field] ? 'bg-gold' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      rules[field] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span className="text-gray-300 text-sm group-hover:text-white transition-colors">{label}</span>
              </label>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm border border-red-500/40 bg-red-900/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn-gold px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating…' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

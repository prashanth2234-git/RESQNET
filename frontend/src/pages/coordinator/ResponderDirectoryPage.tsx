import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, PhoneCall, Mail, AlertTriangle } from 'lucide-react';
import { responderService } from '../../services/responderService';
import { ResponderProfile } from '../../types';
import { AvailabilityBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const ResponderDirectoryPage: React.FC = () => {
  const [responders, setResponders] = useState<ResponderProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New Responder Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [team, setTeam] = useState('');
  const [categories, setCategories] = useState<string[]>(['Rescue']);
  const [maxCapacity, setMaxCapacity] = useState(3);
  const [createLoading, setCreateLoading] = useState(false);

  const fetchResponders = async () => {
    setLoading(true);
    try {
      const data = await responderService.getResponders();
      setResponders(data);
    } catch (err: any) {
      console.error('Failed to load responders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponders();
  }, []);

  const handleToggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleCreateResponder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team.trim() || categories.length === 0) {
      alert('Please enter a team name and select at least one capability category.');
      return;
    }
    setCreateLoading(true);
    try {
      // Create responder profile for current session
      await responderService.createResponder({
        user_id: 1, // Coordinator fallback / assignment
        team: team.trim(),
        supported_categories: categories,
        max_concurrent_assignments: Number(maxCapacity),
      });
      await fetchResponders();
      setIsOpen(false);
      setTeam('');
    } catch (err: any) {
      alert('Registration failed: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading responder units directory..." className="py-20" />;
  }

  const allCategories = [
    'Rescue',
    'Medical assistance',
    'Food and water',
    'Shelter',
    'Evacuation support',
    'Essential supplies',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-resq-text tracking-tight">
            Responder Units Directory
          </h1>
          <p className="text-xs text-resq-muted mt-0.5">
            Monitor active volunteer disaster relief units, verify workload governance limits, and track field availability.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Volunteer Unit
        </Button>
      </div>

      {/* Responder Units Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {responders.map((resp) => {
          const workloadRatio = resp.current_assignment_count / resp.max_concurrent_assignments;
          const percentage = Math.min(100, Math.round(workloadRatio * 100));

          return (
            <div
              key={resp.id}
              className="bg-white rounded-xl border border-resq-border p-5 shadow-xs space-y-4 hover:border-blue-300 transition"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-resq-text leading-tight">{resp.team}</h3>
                  <p className="text-xs text-resq-muted mt-0.5">{resp.name}</p>
                </div>
                <AvailabilityBadge availability={resp.availability} />
              </div>

              {/* Workload Progress */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-500">Current Workload:</span>
                  <span className={`font-mono ${percentage >= 100 ? 'text-red-600' : 'text-slate-800'}`}>
                    {resp.current_assignment_count} / {resp.max_concurrent_assignments} cases ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      percentage >= 100
                        ? 'bg-resq-red'
                        : percentage >= 75
                        ? 'bg-resq-amber'
                        : 'bg-resq-blue'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Capabilities &amp; Categories:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {resp.supported_categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Footer */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[180px]">{resp.email}</span>
                </div>
                <span className="font-mono text-slate-400">
                  ID: #{resp.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Unit Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Register Responder Unit"
        subtitle="Add a new response team to the coordinator directory."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={createLoading} onClick={handleCreateResponder}>
              Register Unit
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateResponder} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-resq-text mb-1">Team Call-Sign / Name</label>
            <input
              type="text"
              required
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g., Tactical Water Rescue Charlie"
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border"
            />
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">Max Concurrent Workload Limit</label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">Supported Emergency Categories</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {allCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 p-2 rounded border bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => handleToggleCategory(cat)}
                    className="rounded text-resq-blue"
                  />
                  <span className="text-[11px] font-semibold text-slate-800">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

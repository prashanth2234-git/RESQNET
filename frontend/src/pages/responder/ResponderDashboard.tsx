import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  Play,
  FileCheck,
} from 'lucide-react';
import { responderService } from '../../services/responderService';
import { AssignmentDetailed, ResponderProfile } from '../../types';
import { PriorityBadge, StatusBadge, AvailabilityBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const ResponderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentDetailed[]>([]);
  const [myProfile, setMyProfile] = useState<ResponderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvail, setUpdatingAvail] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [asgData, respList] = await Promise.all([
        responderService.getMyAssignments(),
        responderService.getResponders(),
      ]);
      setAssignments(asgData);
      const prof = respList.find((r) => r.user_id === user?.id) || respList[0] || null;
      setMyProfile(prof);
    } catch (err: any) {
      console.error('Failed to load responder dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleUpdateAvailability = async (avail: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY') => {
    setUpdatingAvail(true);
    try {
      const updated = await responderService.updateMyAvailability(avail);
      setMyProfile(updated);
    } catch (err: any) {
      alert('Failed to update availability: ' + err.message);
    } finally {
      setUpdatingAvail(false);
    }
  };

  const handleAccept = async (assignmentId: number) => {
    try {
      await responderService.acceptAssignment(assignmentId);
      await loadData();
    } catch (err: any) {
      alert('Failed to accept: ' + err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to volunteer unit radio..." className="py-20" />;
  }

  const activeAssignments = assignments.filter(
    (a) =>
      (a.status === 'ASSIGNED' || a.status === 'ACCEPTED' || a.status === 'IN_PROGRESS') &&
      a.request_status !== 'CLOSED' &&
      a.request_status !== 'CANCELLED' &&
      a.request_status !== 'REJECTED'
  );
  const completedAssignments = assignments.filter(
    (a) => a.status === 'COMPLETED' || a.request_status === 'CLOSED'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Unit Command Banner */}
      <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-resq-text tracking-tight">
              {myProfile?.team || 'Field Response Unit'}
            </h1>
            {myProfile && <AvailabilityBadge availability={myProfile.availability} />}
          </div>
          <p className="text-xs text-resq-muted">
            Officer / EMT: <strong>{user?.full_name}</strong> • Specialties:{' '}
            {myProfile?.supported_categories?.join(', ') || 'Rescue, First Aid'}
          </p>
        </div>

        {/* Availability Toggle Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">My Status:</span>
          <div className="inline-flex rounded-md shadow-xs bg-slate-100 p-1">
            <button
              disabled={updatingAvail}
              onClick={() => handleUpdateAvailability('AVAILABLE')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                myProfile?.availability === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Available
            </button>
            <button
              disabled={updatingAvail}
              onClick={() => handleUpdateAvailability('BUSY')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                myProfile?.availability === 'BUSY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Busy
            </button>
            <button
              disabled={updatingAvail}
              onClick={() => handleUpdateAvailability('OFF_DUTY')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                myProfile?.availability === 'OFF_DUTY'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off Duty
            </button>
          </div>
        </div>
      </div>

      {/* Active Assignments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-resq-border pb-3">
          <h2 className="text-lg font-bold text-resq-text flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-resq-blue" />
            Active Incident Assignments ({activeAssignments.length})
          </h2>
          {myProfile && (
            <span className="text-xs font-mono font-semibold text-slate-500">
              Capacity: {myProfile.current_assignment_count} / {myProfile.max_concurrent_assignments} cases
            </span>
          )}
        </div>

        {activeAssignments.length === 0 ? (
          <EmptyState
            title="No active assignments"
            description="Your team is currently standing by. Coordinators will dispatch your unit when matching emergency cases arise."
          />
        ) : (
          <div className="space-y-4">
            {activeAssignments.map((asg) => (
              <div
                key={asg.id}
                className="bg-white p-5 rounded-xl border border-resq-border hover:border-blue-300 transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-resq-blue">
                      {asg.request_tracking_code}
                    </span>
                    <PriorityBadge
                      priority={asg.request_priority_band}
                      score={asg.request_priority_score}
                    />
                    <StatusBadge status={asg.request_status} />
                  </div>

                  <h3 className="text-base font-bold text-resq-text">{asg.request_title}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-resq-muted">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {asg.request_location_name}
                    </span>
                    <span>• {asg.request_incident_type}</span>
                    <span>• Contact: {asg.request_safe_contact_method} ({asg.request_contact_details || 'N/A'})</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {asg.status === 'ASSIGNED' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAccept(asg.id)}
                      icon={<Play className="w-3.5 h-3.5" />}
                    >
                      Accept &amp; En Route
                    </Button>
                  )}

                  <Link to={`/responder/assignments/${asg.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<FileCheck className="w-3.5 h-3.5" />}
                    >
                      Field Notes &amp; Complete
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Missions History */}
      {completedAssignments.length > 0 && (
        <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-resq-text flex items-center gap-2 border-b border-resq-border pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Completed Missions &amp; Handover History ({completedAssignments.length})
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {completedAssignments.map((asg) => (
              <div key={asg.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-resq-blue">
                      {asg.request_tracking_code}
                    </span>
                    <span className="font-bold text-slate-900">{asg.request_title}</span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {asg.request_location_name} • Completed:{' '}
                    {asg.completed_at ? new Date(asg.completed_at).toLocaleString() : 'N/A'}
                  </div>
                  {asg.assistance_notes && (
                    <div className="text-emerald-800 text-[11px] mt-1">
                      <strong>Assistance rendered:</strong> {asg.assistance_notes}
                    </div>
                  )}
                </div>

                <StatusBadge status="ASSISTANCE_PROVIDED" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

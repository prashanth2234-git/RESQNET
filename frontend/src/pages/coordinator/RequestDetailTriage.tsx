import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserX,
  FileCheck,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { responderService } from '../../services/responderService';
import { AssistanceRequest, ResponderProfile, PriorityBand } from '../../types';
import { PriorityBadge, StatusBadge, AvailabilityBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { PriorityBreakdown } from '../../features/priority/PriorityBreakdown';
import { DisasterMap } from '../../components/map/DisasterMap';

export const RequestDetailTriage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<AssistanceRequest | null>(null);
  const [responders, setResponders] = useState<ResponderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals State
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('Verified situation details via emergency desk phone triage.');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideScore, setOverrideScore] = useState(85);
  const [overrideBand, setOverrideBand] = useState<PriorityBand>('CRITICAL');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedResponderId, setSelectedResponderId] = useState<number | ''>('');
  const [overrideWorkloadReason, setOverrideWorkloadReason] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('VERIFIED');
  const [statusExplanation, setStatusExplanation] = useState('');
  const [isStatusOverride, setIsStatusOverride] = useState(false);
  const [statusOverrideReason, setStatusOverrideReason] = useState('');
  const [assistanceConfirmed, setAssistanceConfirmed] = useState(false);
  const [assistanceNotes, setAssistanceNotes] = useState('');
  const [closureExplanation, setClosureExplanation] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [reqData, respData] = await Promise.all([
        requestService.getRequestById(id),
        responderService.getResponders(),
      ]);
      setRequest(reqData);
      setResponders(respData);
      setOverrideScore(reqData.effective_priority_score);
      setOverrideBand(reqData.effective_priority_band);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setVerifyLoading(true);
    try {
      const updated = await requestService.verifyRequest(request.id, verifyNotes);
      setRequest(updated);
      setIsVerifyOpen(false);
    } catch (err: any) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleOverridePriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !overrideReason.trim()) {
      alert('An explicit explanation reason is required for administrative priority overrides.');
      return;
    }
    setOverrideLoading(true);
    try {
      const updated = await requestService.overridePriority(
        request.id,
        overrideScore,
        overrideBand,
        overrideReason.trim()
      );
      setRequest(updated);
      setIsOverrideOpen(false);
    } catch (err: any) {
      alert('Priority override failed: ' + err.message);
    } finally {
      setOverrideLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !selectedResponderId) return;
    setAssignLoading(true);
    try {
      const updated = await requestService.assignResponder(
        request.id,
        Number(selectedResponderId),
        overrideWorkloadReason || undefined
      );
      setRequest(updated);
      setIsAssignOpen(false);
      // Reload responders for updated workload counts
      const respData = await responderService.getResponders();
      setResponders(respData);
    } catch (err: any) {
      alert('Assignment failed: ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const openStatusModal = () => {
    if (!request) return;
    setIsStatusOverride(false);
    setStatusExplanation('');
    setStatusOverrideReason('');
    setAssistanceConfirmed(false);
    setAssistanceNotes('');
    setClosureExplanation('');

    const standardFlow: Record<string, string[]> = {
      RECEIVED: ['VERIFIED', 'REJECTED', 'CANCELLED'],
      VERIFIED: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
      ASSIGNED: ['EN_ROUTE', 'VERIFIED', 'CANCELLED'],
      EN_ROUTE: ['ASSISTANCE_PROVIDED', 'ASSIGNED'],
      ASSISTANCE_PROVIDED: ['CLOSED'],
      CLOSED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    const nextOptions = standardFlow[request.status] || [];
    if (nextOptions.length > 0) {
      setTargetStatus(nextOptions[0]);
    } else {
      setIsStatusOverride(true);
      setTargetStatus(request.status === 'CLOSED' ? 'VERIFIED' : 'CLOSED');
    }
    setIsStatusOpen(true);
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (isStatusOverride && statusOverrideReason.trim().length < 10) {
      alert('A meaningful explanation reason (at least 10 characters) is required for administrative status overrides.');
      return;
    }

    if (targetStatus === 'ASSISTANCE_PROVIDED') {
      if (!assistanceConfirmed) {
        alert('Explicit confirmation that assistance was provided is required before transitioning to ASSISTANCE_PROVIDED.');
        return;
      }
      if (assistanceNotes.trim().length < 10) {
        alert('A meaningful assistance completion note (at least 10 characters) is required.');
        return;
      }
    }

    if (targetStatus === 'CLOSED' && closureExplanation.trim().length < 10) {
      alert('A meaningful closure explanation (at least 10 characters) is required before closing an incident.');
      return;
    }

    if ((targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') && statusExplanation.trim().length < 5) {
      alert(`A meaningful explanation (at least 5 characters) is required when marking an incident as ${targetStatus}.`);
      return;
    }

    setStatusLoading(true);
    try {
      const updated = await requestService.updateStatus(request.id, {
        new_status: targetStatus,
        explanation: statusExplanation.trim() || undefined,
        is_override: isStatusOverride,
        assistance_confirmed: assistanceConfirmed,
        assistance_notes: assistanceNotes.trim() || undefined,
        closure_explanation: closureExplanation.trim() || undefined,
        override_reason: statusOverrideReason.trim() || undefined,
      });
      setRequest(updated);
      setIsStatusOpen(false);
      // Clear all fields so previous notes are never retained
      setStatusExplanation('');
      setStatusOverrideReason('');
      setAssistanceConfirmed(false);
      setAssistanceNotes('');
      setClosureExplanation('');
      setIsStatusOverride(false);
    } catch (err: any) {
      alert('Status transition failed: ' + (err.message || err));
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading triage workbench..." className="py-20" />;
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-xl border border-red-200 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-resq-red mx-auto" />
        <h2 className="text-lg font-bold text-resq-text">Incident Record Not Found</h2>
        <p className="text-xs text-resq-muted">{error}</p>
        <Link to="/coordinator/requests">
          <Button variant="outline" size="sm">
            Back to Requests
          </Button>
        </Link>
      </div>
    );
  }

  const selectedResponder = responders.find((r) => r.id === selectedResponderId);
  const responderOverCapacity =
    selectedResponder && selectedResponder.current_assignment_count >= selectedResponder.max_concurrent_assignments;
  const responderOffDuty = selectedResponder && selectedResponder.availability === 'OFF_DUTY';

  const standardTransitions: Record<string, string[]> = {
    RECEIVED: ['VERIFIED', 'REJECTED', 'CANCELLED'],
    VERIFIED: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
    ASSIGNED: ['EN_ROUTE', 'VERIFIED', 'CANCELLED'],
    EN_ROUTE: ['ASSISTANCE_PROVIDED', 'ASSIGNED'],
    ASSISTANCE_PROVIDED: ['CLOSED'],
    CLOSED: [],
    REJECTED: [],
    CANCELLED: [],
  };

  const allStatuses = ['RECEIVED', 'VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'ASSISTANCE_PROVIDED', 'CLOSED', 'REJECTED', 'CANCELLED'];
  const availableStatusOptions = request
    ? isStatusOverride
      ? allStatuses.filter((s) => s !== request.status)
      : standardTransitions[request.status] || []
    : [];

  const isStatusSubmitDisabled = (() => {
    if (!request || !targetStatus) return true;
    if (isStatusOverride) {
      if (statusOverrideReason.trim().length < 10) return true;
      if (targetStatus === 'ASSISTANCE_PROVIDED') {
        return !assistanceConfirmed || assistanceNotes.trim().length < 10;
      }
      if (targetStatus === 'CLOSED') {
        return closureExplanation.trim().length < 10;
      }
      return false;
    }
    if (targetStatus === 'ASSISTANCE_PROVIDED') {
      return !assistanceConfirmed || assistanceNotes.trim().length < 10;
    }
    if (targetStatus === 'CLOSED') {
      return closureExplanation.trim().length < 10;
    }
    if (targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') {
      return statusExplanation.trim().length < 5;
    }
    return false;
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <button
            onClick={() => navigate('/coordinator/requests')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-resq-muted hover:text-resq-text transition mb-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Incident Ledger
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-black text-resq-blue">
              {request.tracking_code}
            </span>
            <PriorityBadge
              priority={request.effective_priority_band}
              score={request.effective_priority_score}
            />
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* Action Buttons for Incident Coordinator */}
        <div className="flex flex-wrap items-center gap-2">
          {request.status === 'RECEIVED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVerifyOpen(true)}
              icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
            >
              Verify Incident
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAssignOpen(true)}
            icon={<Users className="w-4 h-4" />}
          >
            Assign Responder Unit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openStatusModal}
            icon={<FileCheck className="w-4 h-4" />}
          >
            Update Workflow Status
          </Button>
        </div>
      </div>

      {/* Main Grid: Details, Priority Engine & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Request Details & Priority Engine */}
        <div className="lg:col-span-8 space-y-6">
          {/* Situation Card */}
          <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-resq-text">{request.title}</h2>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              {request.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Hazard</span>
                <span className="font-bold text-slate-900">{request.incident_type}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Category</span>
                <span className="font-bold text-slate-900">{request.assistance_category}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Affected</span>
                <span className="font-bold text-slate-900">{request.people_affected} people</span>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Urgent Intervention</span>
                <span className="font-bold text-red-600">{request.people_urgent} people</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="font-semibold text-slate-800">Location:</span>
                <span>{request.location_name}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Contact Method: </span>
                <span>{request.safe_contact_method} {request.contact_details ? `(${request.contact_details})` : ''}</span>
              </div>
              {request.accessibility_medical_notes && (
                <div>
                  <span className="font-semibold text-slate-800">Special Notes: </span>
                  <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{request.accessibility_medical_notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Explainable Priority Engine Breakdown */}
          <PriorityBreakdown
            request={request}
            canOverride={true}
            onOpenOverrideModal={() => setIsOverrideOpen(true)}
          />

          {/* Map Location Preview if Coordinates Exist */}
          {request.latitude && request.longitude && (
            <div className="bg-white p-5 rounded-xl border border-resq-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-resq-text flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-resq-blue" />
                  Incident Geographic Location
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
                </span>
              </div>
              <DisasterMap
                requests={[request]}
                selectedRequest={request}
                heightClass="h-64"
                allowNavigate={false}
              />
            </div>
          )}
        </div>

        {/* Right Column: Assignments & Status Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Field Unit Assignment */}
          <div className="bg-white rounded-xl border border-resq-border p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-resq-text flex items-center justify-between border-b border-resq-border pb-2.5">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-resq-blue" />
                Assigned Responder Unit
              </span>
              <button
                onClick={() => setIsAssignOpen(true)}
                className="text-xs text-resq-blue hover:underline font-semibold"
              >
                Reassign
              </button>
            </h3>

            {request.assignments.length === 0 ? (
              <div className="text-center py-6 text-xs text-resq-muted">
                No responder unit assigned yet.
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => setIsAssignOpen(true)}>
                    Dispatch Unit Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {request.assignments.map((asg) => (
                  <div key={asg.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{asg.responder_team}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-100 text-blue-800">
                        {asg.status}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px] space-y-0.5">
                      <div>Assigned: {new Date(asg.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      {asg.accepted_at && <div>Accepted: {new Date(asg.accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                      {asg.completed_at && <div>Completed: {new Date(asg.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>

                    {asg.assistance_notes && (
                      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 text-[11px]">
                        <strong>Unit Field Notes:</strong> {asg.assistance_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chronological Status Timeline */}
          <div className="bg-white rounded-xl border border-resq-border p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-resq-text flex items-center gap-2 border-b border-resq-border pb-2.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Audit Status Timeline
            </h3>

            <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 text-xs">
              {request.status_history.map((hist, idx) => (
                <div key={hist.id} className="relative">
                  <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-resq-blue border-2 border-white ring-2 ring-blue-100" />
                  <div>
                    <div className="font-bold text-resq-text">{hist.new_status}</div>
                    <div className="text-[11px] text-slate-500">{hist.explanation}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {hist.changed_by_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verify Request Modal */}
      <Modal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title="Verify Assistance Request"
        subtitle="Confirm that situation details and contact info have been validated."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsVerifyOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={verifyLoading} onClick={handleVerify}>
              Confirm Verification
            </Button>
          </>
        }
      >
        <form onSubmit={handleVerify} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-resq-text mb-1">Coordinator Verification Notes</label>
            <textarea
              rows={3}
              required
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="e.g., Contacted resident via phone, confirmed 4 trapped on balcony..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border"
            />
          </div>
        </form>
      </Modal>

      {/* Priority Override Modal */}
      <Modal
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        title="Override Calculated Priority"
        subtitle="Administrative override with mandatory audit explanation."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsOverrideOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={overrideLoading} onClick={handleOverridePriority}>
              Apply Priority Override
            </Button>
          </>
        }
      >
        <form onSubmit={handleOverridePriority} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-resq-text mb-1">
              New Priority Score (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={overrideScore}
              onChange={(e) => {
                const s = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                setOverrideScore(s);
                if (s >= 75) setOverrideBand('CRITICAL');
                else if (s >= 50) setOverrideBand('HIGH');
                else if (s >= 25) setOverrideBand('MEDIUM');
                else setOverrideBand('LOW');
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border font-mono font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">Priority Band</label>
            <select
              value={overrideBand}
              onChange={(e) => setOverrideBand(e.target.value as PriorityBand)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white"
            >
              <option value="CRITICAL">CRITICAL (75-100)</option>
              <option value="HIGH">HIGH (50-74)</option>
              <option value="MEDIUM">MEDIUM (25-49)</option>
              <option value="LOW">LOW (0-24)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">
              Mandatory Audit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Document why the calculated algorithm score is being overridden..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border"
            />
          </div>
        </form>
      </Modal>

      {/* Assign Responder Unit Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Dispatch Responder Unit"
        subtitle="Select a volunteer rescue unit. Workload capacity constraints are enforced."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={assignLoading}
              disabled={!selectedResponderId || ((responderOverCapacity || responderOffDuty) && !overrideWorkloadReason.trim())}
              onClick={handleAssign}
            >
              Dispatch Unit
            </Button>
          </>
        }
      >
        <form onSubmit={handleAssign} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-resq-text mb-1">Select Unit</label>
            <select
              value={selectedResponderId}
              onChange={(e) => setSelectedResponderId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white"
            >
              <option value="">-- Choose Unit --</option>
              {responders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.team} ({r.current_assignment_count}/{r.max_concurrent_assignments} cases) - {r.availability}
                </option>
              ))}
            </select>
          </div>

          {selectedResponder && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-bold text-slate-900">{selectedResponder.team}</div>
              <div className="text-slate-600">Commander / Lead: {selectedResponder.name}</div>
              <div className="text-slate-600">
                Specialties: {selectedResponder.supported_categories.join(', ')}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span>Status:</span>
                <AvailabilityBadge availability={selectedResponder.availability} />
                <span className="font-mono text-slate-500">
                  Workload: {selectedResponder.current_assignment_count} / {selectedResponder.max_concurrent_assignments}
                </span>
              </div>
            </div>
          )}

          {(responderOverCapacity || responderOffDuty) && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-resq-red flex-shrink-0" />
                Workload Governance Restriction
              </div>
              <p className="text-[11px] leading-tight">
                This unit is currently {responderOffDuty ? 'OFF_DUTY' : 'at maximum capacity'}. You must provide an explicit emergency override reason to force assignment.
              </p>
              <div>
                <label className="block font-bold mb-1">Override Reason <span className="text-red-600">*</span></label>
                <textarea
                  rows={2}
                  required
                  value={overrideWorkloadReason}
                  onChange={(e) => setOverrideWorkloadReason(e.target.value)}
                  placeholder="e.g., Only available watercraft unit within 2 miles of active flood victim."
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-red-300 bg-white"
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Update Status Workflow Modal */}
      <Modal
        isOpen={isStatusOpen}
        onClose={() => setIsStatusOpen(false)}
        title="Update Request Status"
        subtitle={`Current Status: ${request.status} • Standard progression or authorized oversight`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsStatusOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={statusLoading}
              disabled={isStatusSubmitDisabled}
              onClick={handleStatusUpdate}
            >
              Commit Status Change
            </Button>
          </>
        }
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4 text-xs">
          {/* Current Status and Mode Summary */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-resq-muted uppercase tracking-wider block">Current Incident Status</span>
              <span className="text-sm font-bold text-slate-800">{request.status}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-resq-muted uppercase tracking-wider block">Mode</span>
              <span className={`text-xs font-bold ${isStatusOverride ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isStatusOverride ? 'Administrative Override' : 'Standard Workflow'}
              </span>
            </div>
          </div>

          {/* Target Status Select */}
          <div>
            <label className="block font-bold text-resq-text mb-1">Target Status</label>
            {availableStatusOptions.length > 0 ? (
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white font-medium"
              >
                {availableStatusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                No standard transitions available from <strong>{request.status}</strong>. Enable Administrative Status Override below if authorized.
              </div>
            )}
          </div>

          {/* Administrative Override Toggle */}
          <label className="flex items-start gap-2.5 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition">
            <input
              type="checkbox"
              checked={isStatusOverride}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsStatusOverride(checked);
                if (checked) {
                  const opts = allStatuses.filter((s) => s !== request.status);
                  if (opts.length > 0 && !opts.includes(targetStatus)) {
                    setTargetStatus(opts[0]);
                  }
                } else {
                  const stdOpts = standardTransitions[request.status] || [];
                  if (stdOpts.length > 0) {
                    setTargetStatus(stdOpts[0]);
                  }
                }
              }}
              className="mt-0.5 rounded text-resq-blue focus:ring-resq-blue"
            />
            <div>
              <span className="font-bold text-slate-800 block">
                Administrative Status Override
              </span>
              <span className="text-[11px] text-slate-500 block">
                Bypasses standard sequential progression. Requires mandatory justification recorded in the immutable audit log.
              </span>
            </div>
          </label>

          {/* Conditional field: Override Reason */}
          {isStatusOverride && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2">
              <label className="block font-bold text-amber-900">
                Override Justification <span className="text-red-500">*</span>
                <span className="font-normal text-[11px] text-amber-700 ml-1">(Required, minimum 10 characters)</span>
              </label>
              <textarea
                rows={2}
                required
                value={statusOverrideReason}
                onChange={(e) => setStatusOverrideReason(e.target.value)}
                placeholder="State operational reason for override (e.g., Coordinator radio confirmation of direct on-scene evacuation)..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex justify-between text-[11px] text-amber-700">
                <span>Logged with your credentials in audit ledger</span>
                <span>{statusOverrideReason.trim().length}/10 chars</span>
              </div>
            </div>
          )}

          {/* Conditional field: ASSISTANCE_PROVIDED */}
          {targetStatus === 'ASSISTANCE_PROVIDED' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assistanceConfirmed}
                  onChange={(e) => setAssistanceConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-emerald-900">
                  Explicit Assistance Confirmation <span className="text-red-500">*</span>
                  <span className="block font-normal text-[11px] text-emerald-700">
                    I explicitly confirm and verify that disaster assistance was delivered to the affected party.
                  </span>
                </span>
              </label>

              <div>
                <label className="block font-bold text-emerald-900 mb-1">
                  Assistance Completion Notes <span className="text-red-500">*</span>
                  <span className="font-normal text-[11px] text-emerald-700 ml-1">(Required, minimum 10 characters)</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={assistanceNotes}
                  onChange={(e) => setAssistanceNotes(e.target.value)}
                  placeholder="Detail assistance delivered, medical care provided, supplies distributed, or evacuation completed..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-emerald-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-emerald-700 mt-1">
                  <span>Cannot reuse en-route or dispatch note</span>
                  <span>{assistanceNotes.trim().length}/10 chars</span>
                </div>
              </div>
            </div>
          )}

          {/* Conditional field: CLOSED */}
          {targetStatus === 'CLOSED' && (
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg space-y-2">
              <label className="block font-bold text-slate-800">
                Incident Closure Explanation <span className="text-red-500">*</span>
                <span className="font-normal text-[11px] text-slate-600 ml-1">(Required, minimum 10 characters)</span>
              </label>
              <textarea
                rows={2}
                required
                value={closureExplanation}
                onChange={(e) => setClosureExplanation(e.target.value)}
                placeholder="State incident resolution outcome and confirm all field operations are complete..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Final incident disposition recorded</span>
                <span>{closureExplanation.trim().length}/10 chars</span>
              </div>
            </div>
          )}

          {/* Conditional field: REJECTED or CANCELLED */}
          {(targetStatus === 'REJECTED' || targetStatus === 'CANCELLED') && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg space-y-2">
              <label className="block font-bold text-rose-900">
                Reason for {targetStatus} <span className="text-red-500">*</span>
                <span className="font-normal text-[11px] text-rose-700 ml-1">(Required, minimum 5 characters)</span>
              </label>
              <textarea
                rows={2}
                required
                value={statusExplanation}
                onChange={(e) => setStatusExplanation(e.target.value)}
                placeholder={`Document reason for marking incident as ${targetStatus}...`}
                className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="text-right text-[11px] text-rose-700">
                {statusExplanation.trim().length}/5 chars
              </div>
            </div>
          )}

          {/* Standard transition notes (for other statuses) */}
          {targetStatus !== 'ASSISTANCE_PROVIDED' &&
            targetStatus !== 'CLOSED' &&
            targetStatus !== 'REJECTED' &&
            targetStatus !== 'CANCELLED' && (
              <div>
                <label className="block font-bold text-resq-text mb-1">
                  Transition Notes <span className="font-normal text-resq-muted">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={statusExplanation}
                  onChange={(e) => setStatusExplanation(e.target.value)}
                  placeholder="Additional context or operational instructions for this transition..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border bg-white"
                />
              </div>
            )}
        </form>
      </Modal>
    </div>
  );
};

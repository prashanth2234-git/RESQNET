import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  AlertTriangle,
  Edit2,
  XCircle,
  CheckCircle2,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { AssistanceRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';

export const CitizenRequestDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const trackingCodeQuery = searchParams.get('code');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<AssistanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContactMethod, setEditContactMethod] = useState('');
  const [editContactDetails, setEditContactDetails] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Cancel Request State
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelExplanation, setCancelExplanation] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      if (id) {
        const data = await requestService.getRequestById(id);
        setRequest(data);
        setEditContactMethod(data.safe_contact_method);
        setEditContactDetails(data.contact_details || '');
        setEditNotes(data.accessibility_medical_notes || '');
      } else if (trackingCodeQuery) {
        const list = await requestService.getRequests({ tracking_code: trackingCodeQuery });
        if (list.items.length > 0) {
          setRequest(list.items[0]);
          setEditContactMethod(list.items[0].safe_contact_method);
          setEditContactDetails(list.items[0].contact_details || '');
          setEditNotes(list.items[0].accessibility_medical_notes || '');
        } else {
          setError(`No request found with tracking code '${trackingCodeQuery}'.`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id, trackingCodeQuery]);

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setEditLoading(true);
    try {
      const updated = await requestService.updateRequestCitizen(request.id, {
        safe_contact_method: editContactMethod,
        contact_details: editContactDetails,
        accessibility_medical_notes: editNotes,
      });
      setRequest(updated);
      setIsEditOpen(false);
    } catch (err: any) {
      alert('Update failed: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setCancelLoading(true);
    try {
      const updated = await requestService.updateStatus(
        request.id,
        'CANCELLED',
        cancelExplanation || 'Cancelled by citizen.'
      );
      setRequest(updated);
      setIsCancelOpen(false);
    } catch (err: any) {
      alert('Cancellation failed: ' + err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching case information and timeline..." className="py-20" />;
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-xl border border-red-200 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-resq-red mx-auto" />
        <h2 className="text-lg font-bold text-resq-text">Incident Record Not Found</h2>
        <p className="text-xs text-resq-muted">{error || 'Unable to locate this incident.'}</p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="outline" size="sm">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = request.status === 'RECEIVED' || request.status === 'VERIFIED';
  const isOwner = user && request.citizen_id === user.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <DisclaimerBanner compact />

      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-resq-muted hover:text-resq-text transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-resq-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-resq-blue">
                {request.tracking_code}
              </span>
              <PriorityBadge
                priority={request.effective_priority_band}
                score={request.effective_priority_score}
              />
              <StatusBadge status={request.status} />
            </div>
            <h1 className="text-xl font-bold text-resq-text leading-tight">{request.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                icon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Update Contact Info
              </Button>
            )}

            {isOwner && canCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCancelOpen(true)}
                icon={<XCircle className="w-3.5 h-3.5" />}
              >
                Cancel Request
              </Button>
            )}
          </div>
        </div>

        {/* Incident Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block font-semibold">Incident Type</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">{request.incident_type}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block font-semibold">Assistance Category</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">{request.assistance_category}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500 block font-semibold">People Affected</span>
            <span className="text-slate-900 font-bold text-sm mt-0.5 block">
              {request.people_affected} total ({request.people_urgent} urgent)
            </span>
          </div>
        </div>

        {/* Location & Contact */}
        <div className="space-y-2 text-xs pt-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Location: </span>
              <span className="text-slate-900">{request.location_name}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <PhoneCall className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">Safe Contact Method: </span>
              <span className="text-slate-900">
                {request.safe_contact_method}
                {request.contact_details ? ` (${request.contact_details})` : ''}
              </span>
            </div>
          </div>

          {request.accessibility_medical_notes && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 mt-2">
              <strong>Medical / Accessibility Notes:</strong> {request.accessibility_medical_notes}
            </div>
          )}

          {request.verification_notes && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 mt-2 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Coordinator Verification Note:</strong> {request.verification_notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Status Progression Timeline */}
      <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-resq-text flex items-center gap-2 border-b border-resq-border pb-3">
          <Clock className="w-4 h-4 text-resq-blue" />
          Chronological Status Progression
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {request.status_history.map((hist, idx) => (
            <div key={hist.id} className="relative group">
              {/* Dot */}
              <div className={`absolute -left-[29px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                idx === request.status_history.length - 1
                  ? 'border-resq-blue ring-4 ring-blue-100'
                  : 'border-slate-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  idx === request.status_history.length - 1 ? 'bg-resq-blue' : 'bg-slate-400'
                }`} />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-xs text-resq-text uppercase tracking-wide">
                    {hist.new_status}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(hist.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{hist.explanation || 'Status recorded in ledger.'}</p>
                <div className="text-[10px] text-slate-400">
                  Recorded by: <span className="font-semibold text-slate-600">{hist.changed_by_name || 'System Dispatch'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Update Permitted Contact Details"
        subtitle="Keep your rescue contact details current."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={editLoading} onClick={handleUpdateContact}>
              Save Contact Updates
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateContact} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-resq-text mb-1">Preferred Safe Contact Method</label>
            <select
              value={editContactMethod}
              onChange={(e) => setEditContactMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white"
            >
              <option value="Phone">Phone Voice Call</option>
              <option value="SMS">SMS Text Message</option>
              <option value="In-Person">In-Person at Location</option>
              <option value="Radio">Two-Way Radio / CB</option>
              <option value="Proxy">Neighbor / Relative Proxy</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">Contact Phone or Channel</label>
            <input
              type="text"
              value={editContactDetails}
              onChange={(e) => setEditContactDetails(e.target.value)}
              placeholder="e.g., +1 (555) 902-1144"
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border"
            />
          </div>

          <div>
            <label className="block font-bold text-resq-text mb-1">Accessibility / Medical Notes</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Special medical equipment, mobility instructions..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border"
            />
          </div>
        </form>
      </Modal>

      {/* Cancel Request Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Assistance Request"
        subtitle="Confirm voluntary cancellation of this incident request."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCancelOpen(false)}>
              Keep Active
            </Button>
            <Button variant="danger" size="sm" loading={cancelLoading} onClick={handleCancelRequest}>
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            Are you sure you wish to cancel this request? Only cancel if you have already relocated safely, situation has resolved, or assistance is no longer required.
          </p>
          <div>
            <label className="block font-bold text-resq-text mb-1">Reason for Cancellation</label>
            <textarea
              rows={2}
              value={cancelExplanation}
              onChange={(e) => setCancelExplanation(e.target.value)}
              placeholder="e.g., Relocated to higher ground with family."
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

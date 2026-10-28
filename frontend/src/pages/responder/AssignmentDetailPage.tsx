import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  PhoneCall,
  CheckCircle2,
  Play,
  FileText,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { responderService } from '../../services/responderService';
import { requestService } from '../../services/requestService';
import { AssignmentDetailed, AssistanceRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { Button } from '../../components/common/Button';
import { DisasterMap } from '../../components/map/DisasterMap';

export const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<AssignmentDetailed | null>(null);
  const [request, setRequest] = useState<AssistanceRequest | null>(null);
  const [assistanceNotes, setAssistanceNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const myAssignments = await responderService.getMyAssignments();
      const asg = myAssignments.find((a) => a.id === parseInt(id, 10));
      if (asg) {
        setAssignment(asg);
        setAssistanceNotes(asg.assistance_notes || '');
        const reqData = await requestService.getRequestById(asg.request_id);
        setRequest(reqData);
      }
    } catch (err: any) {
      console.error('Failed to load assignment detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAccept = async () => {
    if (!assignment) return;
    setActionLoading(true);
    try {
      await responderService.acceptAssignment(assignment.id);
      await loadData();
    } catch (err: any) {
      alert('Acceptance failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !assistanceNotes.trim()) {
      alert('Please document assistance notes detailing the care or extraction provided.');
      return;
    }
    setActionLoading(true);
    try {
      await responderService.completeAssignment(assignment.id, assistanceNotes.trim());
      navigate('/responder');
    } catch (err: any) {
      alert('Completion failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading mission dispatch telemetry..." className="py-20" />;
  }

  if (!assignment || !request) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl border border-red-200 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-resq-red mx-auto" />
        <h2 className="text-base font-bold text-resq-text">Assignment Not Found</h2>
        <Link to="/responder">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = assignment.status === 'COMPLETED';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/responder')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-resq-muted hover:text-resq-text transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Responder Dashboard
        </button>
      </div>

      {/* Main Mission Card */}
      <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-resq-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black text-resq-blue">
                {assignment.request_tracking_code}
              </span>
              <PriorityBadge
                priority={assignment.request_priority_band}
                score={assignment.request_priority_score}
              />
              <StatusBadge status={assignment.request_status} />
            </div>
            <h1 className="text-xl font-bold text-resq-text">{assignment.request_title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {assignment.status === 'ASSIGNED' && (
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                onClick={handleAccept}
                icon={<Play className="w-4 h-4" />}
              >
                Accept &amp; Deploy En Route
              </Button>
            )}
          </div>
        </div>

        {/* Victim Situation Details */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
          <h4 className="font-bold text-slate-800">Situation Description:</h4>
          <p className="text-slate-700 leading-relaxed">{request.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Hazard:</span>
              <span className="font-bold text-slate-800">{request.incident_type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Category:</span>
              <span className="font-bold text-slate-800">{request.assistance_category}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Affected / Urgent:</span>
              <span className="font-bold text-slate-800">{request.people_affected} / {request.people_urgent}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Safe Contact:</span>
              <span className="font-bold text-slate-800">{request.safe_contact_method}</span>
            </div>
          </div>
        </div>

        {/* Contact Info & Location */}
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-800">Target Location: </span>
              <span className="text-slate-900 font-medium">{request.location_name}</span>
            </div>
          </div>

          {request.contact_details && (
            <div className="flex items-start gap-2">
              <PhoneCall className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Direct Contact Coordinates: </span>
                <span className="text-slate-900">{request.contact_details}</span>
              </div>
            </div>
          )}

          {request.accessibility_medical_notes && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 mt-2">
              <strong>Crucial Medical / Access Requirement:</strong> {request.accessibility_medical_notes}
            </div>
          )}
        </div>
      </div>

      {/* Map Preview */}
      {request.latitude && request.longitude && (
        <div className="bg-white p-5 rounded-xl border border-resq-border shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-resq-text flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-resq-blue" />
            Geographic Navigation Target
          </h3>
          <DisasterMap
            requests={[request]}
            selectedRequest={request}
            heightClass="h-64"
            allowNavigate={false}
          />
        </div>
      )}

      {/* Assistance Notes and Completion Form */}
      <div className="bg-white rounded-xl border border-resq-border p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-resq-text flex items-center gap-2 border-b border-resq-border pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Field Mission Handover &amp; Completion Notes
        </h3>

        {isCompleted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Mission Successfully Completed
            </div>
            <p>
              <strong>Field notes recorded:</strong> {assignment.assistance_notes}
            </p>
            <div className="text-[11px] text-emerald-700 mt-1">
              Recorded at: {assignment.completed_at ? new Date(assignment.completed_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        ) : (
          <form onSubmit={handleComplete} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-resq-text mb-1">
                Field Assistance Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={assistanceNotes}
                onChange={(e) => setAssistanceNotes(e.target.value)}
                placeholder="Document actions taken (e.g., extracted 4 residents via rescue dinghy, stabilized patient on backboard, supplied clean drinking water)..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={actionLoading}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Mark Assistance as Provided &amp; Free Unit Capacity
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

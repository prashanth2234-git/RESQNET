import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  Send,
  MapPin,
  Users,
  HeartPulse,
  Flame,
  Waves,
  CloudRain,
  Activity,
  CheckSquare,
  Square,
  WifiOff,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { savePendingRequest } from '../../features/offline/db';
import { OfflinePendingRequest } from '../../types';
import { DisclaimerBanner } from '../../components/common/DisclaimerBanner';
import { Button } from '../../components/common/Button';

export const CitizenRequestForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState('Flood');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | ''>(25.782);
  const [longitude, setLongitude] = useState<number | ''>(-80.201);
  const [showCoords, setShowCoords] = useState(false);
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [peopleUrgent, setPeopleUrgent] = useState(0);
  const [assistanceCategory, setAssistanceCategory] = useState('Rescue');

  // Indicators
  const [isImmediateThreat, setIsImmediateThreat] = useState(false);
  const [isMedicalEmergency, setIsMedicalEmergency] = useState(false);
  const [isVulnerablePresent, setIsVulnerablePresent] = useState(false);
  const [isEssentialUnavailable, setIsEssentialUnavailable] = useState(false);

  // Contact
  const [safeContactMethod, setSafeContactMethod] = useState('Phone');
  const [contactDetails, setContactDetails] = useState('');
  const [accessibilityNotes, setAccessibilityNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || !locationName.trim()) {
      setError('Please provide a title, situation description, and approximate location.');
      return;
    }

    setLoading(true);

    const isOnline = navigator.onLine;
    const clientLocalId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `idemp-${clientLocalId}`;

    const payload = {
      title: title.trim(),
      incident_type: incidentType,
      description: description.trim(),
      location_name: locationName.trim(),
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      people_affected: Number(peopleAffected),
      people_urgent: Number(peopleUrgent),
      assistance_category: assistanceCategory,
      is_immediate_threat: isImmediateThreat,
      is_medical_emergency: isMedicalEmergency,
      is_vulnerable_present: isVulnerablePresent,
      is_essential_unavailable: isEssentialUnavailable,
      safe_contact_method: safeContactMethod,
      contact_details: contactDetails.trim() || null,
      accessibility_medical_notes: accessibilityNotes.trim() || null,
      idempotency_key: idempotencyKey,
      client_local_id: clientLocalId,
    };

    if (isOnline) {
      try {
        const created = await requestService.createRequest(payload);
        navigate('/confirmation', {
          state: {
            request: created,
            isOffline: false,
          },
        });
        return;
      } catch (err: any) {
        // If API is unreachable despite navigator.onLine, gracefully fallback to IndexedDB offline queue
        console.warn('Network API submission failed. Falling back to offline queue:', err);
      }
    }

    // Offline handling via IndexedDB
    try {
      const offlineItem: OfflinePendingRequest = {
        ...payload,
        client_local_id: clientLocalId,
        idempotency_key: idempotencyKey,
        created_at: new Date().toISOString(),
        sync_status: 'PENDING',
      };

      await savePendingRequest(offlineItem);
      navigate('/confirmation', {
        state: {
          request: offlineItem,
          isOffline: true,
        },
      });
    } catch (saveErr: any) {
      setError('Failed to persist request locally in offline database: ' + saveErr.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <DisclaimerBanner />

      <div className="bg-white rounded-xl border border-resq-border shadow-sm p-6 sm:p-8">
        <div className="border-b border-resq-border pb-4 mb-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-resq-red" />
            <h1 className="text-xl sm:text-2xl font-black text-resq-text tracking-tight">
              Disaster Assistance Request Form
            </h1>
          </div>
          <p className="text-xs text-resq-muted mt-1 leading-relaxed">
            Fill in the details below. If your internet connection drops, this request will be securely preserved in your browser and automatically synchronized once connectivity is restored.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-resq-red mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Type & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-resq-text mb-1.5">
                Incident Hazard Type <span className="text-red-500">*</span>
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
              >
                <option value="Flood">Flood / Rising Water</option>
                <option value="Storm">Storm / Hurricane Wind</option>
                <option value="Fire">Fire / Wildfire Smoke</option>
                <option value="Earthquake">Earthquake Tremor</option>
                <option value="Landslide">Landslide / Mudflow</option>
                <option value="Medical assistance">Medical Emergency</option>
                <option value="Other">Other Emergency</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-resq-text mb-1.5">
                Request Summary Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Trapped on upper balcony due to rising canal water"
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-resq-text mb-1.5">
              Situation Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is happening, visible dangers, physical obstacles, water depth, structural damages..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
            />
          </div>

          {/* Location Details */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-resq-text mb-1">
                Approximate Location / Sector Landmark <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., 412 Riverbank Dr, Sector 3 Canal Crossing near High School"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowCoords(!showCoords)}
                className="text-xs font-semibold text-resq-blue hover:underline flex items-center gap-1"
              >
                {showCoords ? 'Hide coordinate settings' : '+ Specify latitude & longitude coordinates'}
              </button>

              {showCoords && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Latitude (Synthetic Demo: ~25.75 to 25.82)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Longitude (Synthetic Demo: ~ -80.25 to -80.18)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* People & Assistance Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-resq-text mb-1.5">
                Primary Assistance Category <span className="text-red-500">*</span>
              </label>
              <select
                value={assistanceCategory}
                onChange={(e) => setAssistanceCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
              >
                <option value="Rescue">Rescue / Extraction</option>
                <option value="Medical assistance">Medical Care / First Aid</option>
                <option value="Food and water">Clean Water &amp; Food</option>
                <option value="Shelter">Emergency Shelter</option>
                <option value="Evacuation support">Evacuation Transport</option>
                <option value="Essential supplies">Essential Supplies (Warmth/Generator)</option>
                <option value="Other">Other Assistance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-resq-text mb-1.5">
                Total People Affected
              </label>
              <input
                type="number"
                min={1}
                value={peopleAffected}
                onChange={(e) => setPeopleAffected(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-resq-text mb-1.5">
                Requiring Immediate Help
              </label>
              <input
                type="number"
                min={0}
                value={peopleUrgent}
                onChange={(e) => setPeopleUrgent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Explainable Priority Checklist Indicators */}
          <div className="space-y-3 border-t border-b border-resq-border py-5">
            <h3 className="text-xs font-bold text-resq-text uppercase tracking-wider">
              Urgency &amp; Triage Assessment Factors
            </h3>
            <p className="text-xs text-resq-muted">
              Select any factors that apply. These directly feed the transparent deterministic priority engine:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isImmediateThreat}
                  onChange={(e) => setIsImmediateThreat(e.target.checked)}
                  className="mt-0.5 rounded text-resq-blue focus:ring-resq-blue"
                />
                <div className="text-xs">
                  <span className="font-bold text-red-900 block">Immediate Threat to Life</span>
                  <span className="text-slate-500">Active collapse, rising water, fire boundary (+35 pts)</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMedicalEmergency}
                  onChange={(e) => setIsMedicalEmergency(e.target.checked)}
                  className="mt-0.5 rounded text-resq-blue focus:ring-resq-blue"
                />
                <div className="text-xs">
                  <span className="font-bold text-red-900 block">Acute Medical Emergency</span>
                  <span className="text-slate-500">Bleeding, trauma, oxygen failure, dialysis needed (+25 pts)</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVulnerablePresent}
                  onChange={(e) => setIsVulnerablePresent(e.target.checked)}
                  className="mt-0.5 rounded text-resq-blue focus:ring-resq-blue"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Vulnerable People Present</span>
                  <span className="text-slate-500">Infants, elderly, mobility impaired (+10 pts)</span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEssentialUnavailable}
                  onChange={(e) => setIsEssentialUnavailable(e.target.checked)}
                  className="mt-0.5 rounded text-resq-blue focus:ring-resq-blue"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Essential Resources Unavailable</span>
                  <span className="text-slate-500">No drinking water, trapped without warmth (+10 pts)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Safe Contact Method & Accessibility Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-resq-text mb-1">
                Preferred Safe Contact Method
              </label>
              <select
                value={safeContactMethod}
                onChange={(e) => setSafeContactMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
              >
                <option value="Phone">Phone Voice Call</option>
                <option value="SMS">SMS Text Message</option>
                <option value="In-Person">In-Person at Location</option>
                <option value="Radio">Two-Way Radio / CB</option>
                <option value="Proxy">Neighbor / Relative Proxy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-resq-text mb-1">
                Contact Details (Optional)
              </label>
              <input
                type="text"
                value={contactDetails}
                onChange={(e) => setContactDetails(e.target.value)}
                placeholder="Phone number, VHF channel, or neighbor contact"
                className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-resq-text mb-1">
              Accessibility or Medical Assistance Notes (Optional)
            </label>
            <input
              type="text"
              value={accessibilityNotes}
              onChange={(e) => setAccessibilityNotes(e.target.value)}
              placeholder="e.g., Needs stair-chair evacuation, uses pacemaker, speaks Spanish"
              className="w-full px-3 py-2 text-sm rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            size="lg"
            className="w-full"
            icon={<Send className="w-5 h-5" />}
          >
            Submit Assistance Request
          </Button>
        </form>
      </div>
    </div>
  );
};

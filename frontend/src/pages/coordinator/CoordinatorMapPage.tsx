import React, { useState, useEffect } from 'react';
import { DisasterMap } from '../../components/map/DisasterMap';
import { requestService } from '../../services/requestService';
import { AssistanceRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/Loading';
import { MapPin, Users, Filter, ExternalLink, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoordinatorMapPage: React.FC = () => {
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await requestService.getRequests({
        incident_type: filterType || undefined,
        priority_band: filterPriority || undefined,
        status: filterStatus || undefined,
        page_size: 100, // Load all map incidents
      });
      setRequests(data.items);
      if (data.items.length > 0 && !selectedRequest) {
        setSelectedRequest(data.items[0]);
      }
    } catch (err: any) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterType, filterPriority, filterStatus]);

  if (loading) {
    return <LoadingSpinner message="Loading geospatial incident telemetry..." className="py-20" />;
  }

  const mappedCount = requests.filter((r) => r.latitude && r.longitude).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Page Header & Filtering */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-resq-text tracking-tight">
            Interactive Disaster Map
          </h1>
          <p className="text-xs text-resq-muted mt-0.5">
            Geospatial visualization of synthetic emergency incidents with synchronized list triage.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-resq-border bg-white"
          >
            <option value="">All Hazards</option>
            <option value="Flood">Flood</option>
            <option value="Storm">Storm</option>
            <option value="Fire">Fire</option>
            <option value="Earthquake">Earthquake</option>
            <option value="Landslide">Landslide</option>
            <option value="Medical assistance">Medical Emergency</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-resq-border bg-white"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-resq-border bg-white"
          >
            <option value="">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="VERIFIED">Verified</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="ASSISTANCE_PROVIDED">Assistance Provided</option>
          </select>
        </div>
      </div>

      {/* Synchronized Split: Interactive Map & Side List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Panel (8 cols) */}
        <div className="lg:col-span-8 bg-white p-3 rounded-xl border border-resq-border shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Displaying <strong>{mappedCount}</strong> geocoded incidents on map (out of {requests.length} filtered).
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Coordinates synthetic for prototype demonstration
            </span>
          </div>

          <DisasterMap
            requests={requests}
            selectedRequest={selectedRequest}
            onSelectRequest={(req) => setSelectedRequest(req)}
            heightClass="h-[600px]"
          />
        </div>

        {/* Synchronized Side List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-resq-border shadow-xs overflow-hidden flex flex-col h-[645px]">
          <div className="p-4 border-b border-resq-border bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-resq-text">
              Active Incidents ({requests.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click to focus map</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2 space-y-1">
            {requests.map((req) => {
              const isSelected = selectedRequest?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`p-3 rounded-lg text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-resq-blue shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-resq-blue">
                      {req.tracking_code}
                    </span>
                    <PriorityBadge
                      priority={req.effective_priority_band}
                      score={req.effective_priority_score}
                      showScore={false}
                    />
                  </div>

                  <h4 className="font-bold text-slate-900 leading-tight line-clamp-2">
                    {req.title}
                  </h4>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{req.location_name}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                    <StatusBadge status={req.status} />
                    <Link
                      to={`/coordinator/requests/${req.id}`}
                      className="text-resq-blue font-semibold hover:underline flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Triage <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

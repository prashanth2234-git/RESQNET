import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AssistanceRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { ExternalLink, AlertTriangle, Users, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

// Custom colored DivIcon generator
const createPriorityIcon = (priority: string, isSelected: boolean) => {
  const p = priority?.toUpperCase();
  let bg = '#64748B';
  let border = '#334155';
  let pulse = false;

  if (p === 'CRITICAL') {
    bg = '#DC2626';
    border = '#991B1B';
    pulse = true;
  } else if (p === 'HIGH') {
    bg = '#D97706';
    border = '#92400E';
  } else if (p === 'MEDIUM') {
    bg = '#2563EB';
    border = '#1D4ED8';
  } else if (p === 'LOW') {
    bg = '#15803D';
    border = '#166534';
  }

  const selectedRing = isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-125' : '';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div class="relative flex items-center justify-center transition-transform ${selectedRing}">
        ${pulse ? `<span class="absolute inline-flex h-8 w-8 rounded-full opacity-75 animate-ping" style="background-color: ${bg};"></span>` : ''}
        <div style="background-color: ${bg}; border-color: ${border};" class="relative w-6 h-6 rounded-full border-2 text-white flex items-center justify-center shadow-lg font-bold text-[10px]">
          !
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

// Recenter component when selection changes
const MapRecenter: React.FC<{ coords?: [number, number] }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords[0] && coords[1]) {
      map.flyTo(coords, 14, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
};

interface DisasterMapProps {
  requests: AssistanceRequest[];
  selectedRequest?: AssistanceRequest | null;
  onSelectRequest?: (req: AssistanceRequest) => void;
  heightClass?: string;
  allowNavigate?: boolean;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  requests,
  selectedRequest,
  onSelectRequest,
  heightClass = 'h-[500px]',
  allowNavigate = true,
}) => {
  const [tileError, setTileError] = useState(false);

  // Filter requests that have valid coordinates
  const validRequests = requests.filter(
    (r) => typeof r.latitude === 'number' && typeof r.longitude === 'number'
  );

  // Center on selected or first valid request, or default cluster center
  const defaultCenter: [number, number] = [25.78, -80.21];
  const activeCenter: [number, number] = selectedRequest && selectedRequest.latitude && selectedRequest.longitude
    ? [selectedRequest.latitude, selectedRequest.longitude]
    : validRequests.length > 0 && validRequests[0].latitude && validRequests[0].longitude
    ? [validRequests[0].latitude, validRequests[0].longitude]
    : defaultCenter;

  return (
    <div className={`relative w-full ${heightClass} rounded-lg overflow-hidden border border-resq-border bg-slate-100 shadow-inner`}>
      {tileError && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-amber-50 border border-amber-300 p-2 text-xs text-amber-900 rounded shadow flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>OpenStreetMap tile server is responding slowly or offline. Incident markers remain functional.</span>
        </div>
      )}

      {/* Map Legend Banner */}
      <div className="absolute bottom-2 left-2 z-[1000] bg-white/95 backdrop-blur-sm border border-resq-border px-3 py-2 rounded-md shadow-md text-[11px] font-medium flex items-center gap-3">
        <span className="font-bold text-resq-text text-xs">Priority:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block animate-pulse" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          <span>Low</span>
        </div>
      </div>

      <MapContainer
        center={activeCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />

        {selectedRequest && selectedRequest.latitude && selectedRequest.longitude && (
          <MapRecenter coords={[selectedRequest.latitude, selectedRequest.longitude]} />
        )}

        {validRequests.map((req) => {
          const isSelected = selectedRequest?.id === req.id;
          return (
            <Marker
              key={req.id}
              position={[req.latitude!, req.longitude!]}
              icon={createPriorityIcon(req.effective_priority_band, isSelected)}
              eventHandlers={{
                click: () => onSelectRequest && onSelectRequest(req),
              }}
            >
              <Popup className="resqnet-popup" maxWidth={300}>
                <div className="p-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-mono font-bold text-resq-blue">
                      {req.tracking_code}
                    </span>
                    <PriorityBadge
                      priority={req.effective_priority_band}
                      score={req.effective_priority_score}
                    />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 leading-snug">{req.title}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {req.location_name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {req.people_affected} affected ({req.people_urgent} urgent)
                    </span>
                    <StatusBadge status={req.status} />
                  </div>

                  {allowNavigate && (
                    <div className="pt-2 text-right">
                      <Link
                        to={`/coordinator/requests/${req.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-resq-blue hover:underline"
                      >
                        Triage & Assign <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

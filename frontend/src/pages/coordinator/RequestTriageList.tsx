import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  MapPin,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { requestService } from '../../services/requestService';
import { AssistanceRequest } from '../../types';
import { PriorityBadge, StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner, TableSkeleton } from '../../components/common/Loading';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';

export const RequestTriageList: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [incidentType, setIncidentType] = useState(searchParams.get('incident_type') || '');
  const [priorityBand, setPriorityBand] = useState(searchParams.get('priority_band') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('assistance_category') || '');
  const [assignedState, setAssignedState] = useState(searchParams.get('assigned_state') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await requestService.getRequests({
        search: search || undefined,
        incident_type: incidentType || undefined,
        priority_band: priorityBand || undefined,
        status: status || undefined,
        assistance_category: category || undefined,
        assigned_state: assignedState || undefined,
        page,
        page_size: 15,
      });
      setRequests(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      console.error('Failed to load triage list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [search, incidentType, priorityBand, status, category, assignedState, page]);

  const handleResetFilters = () => {
    setSearch('');
    setIncidentType('');
    setPriorityBand('');
    setStatus('');
    setCategory('');
    setAssignedState('');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-resq-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-resq-text tracking-tight">
            Incident Triage Ledger
          </h1>
          <p className="text-xs text-resq-muted mt-0.5">
            Comprehensive registry of all simulated disaster assistance requests, triage statuses, and assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/coordinator/map">
            <Button variant="outline" size="sm">
              View on Map
            </Button>
          </Link>
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-md border text-slate-700">
            Total Records: {total}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-resq-border shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search code, title, location..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-resq-border focus:ring-2 focus:ring-resq-blue focus:outline-none"
            />
          </div>

          {/* Incident Type Filter */}
          <div>
            <select
              value={incidentType}
              onChange={(e) => {
                setIncidentType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
            >
              <option value="">All Incident Hazards</option>
              <option value="Flood">Flood</option>
              <option value="Storm">Storm</option>
              <option value="Fire">Fire</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Landslide">Landslide</option>
              <option value="Medical assistance">Medical Emergency</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Priority Band Filter */}
          <div>
            <select
              value={priorityBand}
              onChange={(e) => {
                setPriorityBand(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
            >
              <option value="">All Priority Bands</option>
              <option value="CRITICAL">CRITICAL (75-100)</option>
              <option value="HIGH">HIGH (50-74)</option>
              <option value="MEDIUM">MEDIUM (25-49)</option>
              <option value="LOW">LOW (0-24)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-resq-border bg-white focus:ring-2 focus:ring-resq-blue focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ASSISTANCE_PROVIDED">Assistance Provided</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Category, Assignment state & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white"
            >
              <option value="">All Assistance Categories</option>
              <option value="Rescue">Rescue</option>
              <option value="Medical assistance">Medical Care</option>
              <option value="Food and water">Food &amp; Water</option>
              <option value="Shelter">Shelter</option>
              <option value="Evacuation support">Evacuation Support</option>
              <option value="Essential supplies">Essential Supplies</option>
            </select>

            <select
              value={assignedState}
              onChange={(e) => {
                setAssignedState(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white"
            >
              <option value="">All Assignment States</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="assigned">Assigned / Dispatched</option>
            </select>
          </div>

          {(search || incidentType || priorityBand || status || category || assignedState) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-resq-red hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-resq-border shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No matching incident requests"
              description="No cases match your active search and filter parameters. Try clearing the filters."
              action={
                <Button size="sm" variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-resq-border text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tracking Code</th>
                  <th className="py-3 px-4">Title &amp; Location</th>
                  <th className="py-3 px-4">Hazard &amp; Category</th>
                  <th className="py-3 px-4">Priority (Score)</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-resq-blue whitespace-nowrap">
                      {req.tracking_code}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate" title={req.title}>
                        {req.title}
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{req.location_name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{req.incident_type}</span>
                      <span className="text-slate-400 block text-[11px]">{req.assistance_category}</span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge
                        priority={req.effective_priority_band}
                        score={req.effective_priority_score}
                      />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(req.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link to={`/coordinator/requests/${req.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Triage <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-resq-border bg-slate-50 flex items-center justify-between text-xs text-resq-muted">
            <div>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total requests)
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

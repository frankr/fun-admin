import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type DashboardData = {
  totalActivities: number;
  newThisWeek: number;
  liveLocations: number;
  openIssues: number;
  readyForLive: number;
};

type ActivityListItem = {
  externalId: string;
  name: string;
  location: string | null;
  websiteUrl: string | null;
  heroImageUrl: string | null;
  category: string;
  status: 'active' | 'inactive';
  approvedImageCount: number;
  hasFullImageSet: boolean;
  readyForLive: boolean;
  openIssueCount: number;
  hasLocationQualityIssue: boolean;
  belowRecommendedImages: boolean;
  needsAttention: boolean;
};

type ActivitiesResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ActivityListItem[];
};

type StatusFilter = 'all' | 'ready' | 'needs_review' | 'attention';

const CITY_CODE = 'HOU';
const PAGE_SIZE = 25;
const STATUS_FILTER_STORAGE_KEY = 'fun_admin.activities.status_filter';
const MIN_RECOMMENDED_IMAGES = 3;

const numberFormatter = new Intl.NumberFormat('en-US');

function parseStatusFilter(value: string | null): StatusFilter {
  if (value === 'ready' || value === 'needs_review' || value === 'attention') {
    return value;
  }
  return 'all';
}

function getInitialStatusFilter(): StatusFilter {
  if (typeof window === 'undefined') {
    return 'all';
  }

  const stored = window.localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
  return parseStatusFilter(stored);
}

const ActivitiesDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activities, setActivities] = useState<ActivitiesResponse | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(getInitialStatusFilter);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [queryInput]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await fetch(`/api/dashboard?city=${CITY_CODE}`);
        if (!response.ok) {
          throw new Error(`Dashboard request failed: ${response.status}`);
        }

        const payload = (await response.json()) as DashboardData;
        if (!cancelled) {
          setDashboard(payload);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load dashboard stats.';
          setError(message);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      city: CITY_CODE,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      search: query,
      status: statusFilter,
    });

    const loadActivities = async () => {
      try {
        const response = await fetch(`/api/activities?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Activities request failed: ${response.status}`);
        }

        const payload = (await response.json()) as ActivitiesResponse;
        if (!cancelled) {
          setActivities(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load activities.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      cancelled = true;
    };
  }, [page, query, statusFilter]);

  const totalItems = activities?.total ?? 0;
  const currentPage = activities?.page ?? page;
  const pageSize = activities?.pageSize ?? PAGE_SIZE;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [pageSize, totalItems]);
  const startRow = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Activities Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage and monitor all your platform experiences</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="material-symbols-outlined text-lg">file_download</span>
            Export
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
            title="Upload activities via CSV"
          >
            <span className="material-symbols-outlined text-lg">cloud_upload</span>
            Bulk Upload (CSV)
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-lg">add</span>
            Create Activity
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Activities</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {numberFormatter.format(dashboard?.totalActivities ?? 0)}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">list_alt</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400">City: {CITY_CODE}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">New This Week</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {numberFormatter.format(dashboard?.newThisWeek ?? 0)}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <span className="material-symbols-outlined text-2xl">new_releases</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400">Open data issues: {numberFormatter.format(dashboard?.openIssues ?? 0)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Live Locations</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {numberFormatter.format(dashboard?.liveLocations ?? 0)}
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <span className="material-symbols-outlined text-2xl">location_on</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400">
              From activities marked ready for live
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full rounded-lg border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            placeholder="Filter by name or location..."
            type="text"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <span className="material-symbols-outlined text-lg text-slate-400">filter_list</span>
          <label className="sr-only" htmlFor="status-filter">Status Filter</label>
          <select
            id="status-filter"
            className="bg-transparent pr-6 text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="ready">Ready for Live</option>
            <option value="needs_review">Needs Review</option>
            <option value="attention">Needs Attention</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          Could not load live activity data: {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800" type="checkbox" />
                </th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">Activity Name</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">Location</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200 text-center">URL</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">Category</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && !activities ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={7}>
                    Loading activities...
                  </td>
                </tr>
              ) : null}

              {!loading && activities && activities.items.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-center text-slate-500" colSpan={7}>
                    No activities found.
                  </td>
                </tr>
              ) : null}

              {activities?.items.map((activity) => {
                const attentionReasons: string[] = [];
                if (activity.readyForLive && activity.belowRecommendedImages) {
                  attentionReasons.push(`${activity.approvedImageCount} approved image${activity.approvedImageCount === 1 ? '' : 's'} (minimum ${MIN_RECOMMENDED_IMAGES})`);
                }
                if (activity.readyForLive && activity.hasLocationQualityIssue) {
                  attentionReasons.push('Location needs validation');
                }
                if (activity.openIssueCount > 0) {
                  attentionReasons.push(`${activity.openIssueCount} open data issue${activity.openIssueCount === 1 ? '' : 's'}`);
                }

                return (
                <tr key={activity.externalId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <input className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800" type="checkbox" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/activities/${activity.externalId}`}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary dark:bg-slate-800 dark:text-slate-200"
                        aria-label={`Open ${activity.name}`}
                      >
                        {activity.heroImageUrl && !imageLoadErrors[activity.externalId] ? (
                          <img
                            src={activity.heroImageUrl}
                            alt={`${activity.name} preview`}
                            className="h-10 w-10 rounded-lg object-cover"
                            onError={() =>
                              setImageLoadErrors((previous) => ({
                                ...previous,
                                [activity.externalId]: true,
                              }))
                            }
                          />
                        ) : (
                          activity.name.charAt(0).toUpperCase()
                        )}
                      </Link>
                      <div className="flex flex-col">
                        <Link
                          to={`/activities/${activity.externalId}`}
                          className="font-medium text-slate-900 hover:text-primary hover:underline dark:text-slate-100"
                        >
                          {activity.name}
                        </Link>
                        <p className="text-xs text-slate-500">{activity.externalId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{activity.location ?? 'Location pending review'}</td>
                  <td className="px-6 py-4 text-center">
                    {activity.websiteUrl ? (
                      <a className="text-primary hover:text-primary/80" href={activity.websiteUrl} target="_blank" rel="noreferrer">
                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {activity.category}
                    </span>
                    <p className={`mt-1 text-xs ${activity.readyForLive && activity.belowRecommendedImages ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-slate-500'}`}>
                      {activity.approvedImageCount}/5 approved images
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {activity.readyForLive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                        Ready for Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                        Needs Review
                      </span>
                    )}
                    {activity.needsAttention ? (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        Needs Attention
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.status === 'active' ? 'Active' : 'Inactive'}
                      {activity.hasFullImageSet ? ' · Full image set' : ' · Partial image set'}
                    </p>
                    {attentionReasons.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        {attentionReasons.join(' · ')}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/activities/${activity.externalId}`} className="p-1 text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </Link>
                      <button className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-slate-200">{numberFormatter.format(startRow)}</span> to{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">{numberFormatter.format(endRow)}</span> of{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">{numberFormatter.format(totalItems)}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
              disabled={!canGoPrevious || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Page {currentPage} / {totalPages}
            </div>
            <button
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
              disabled={!canGoNext || loading}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesDashboard;

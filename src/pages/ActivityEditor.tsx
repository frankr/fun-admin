import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

type ActivityDetailImage = {
  rankOrder: number;
  status: 'pending' | 'ready' | 'rejected';
  publicUrl: string | null;
  sourceFilename: string | null;
  reviewClassification: string | null;
  altText: string | null;
  approvedAt: string | null;
};

type ActivityDetailIssue = {
  fieldName: string;
  issueCode: string;
  issueMessage: string;
};

type ActivityDetail = {
  externalId: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  status: 'active' | 'inactive';
  hoursRaw: string | null;
  email: string | null;
  phoneRaw: string | null;
  phoneNormalized: string | null;
  locationType: string | null;
  primaryLocation: string | null;
  indoorOutdoor: 'indoor' | 'outdoor' | 'both' | null;
  goodForParties: boolean | null;
  seasonal: boolean | null;
  petFriendly: boolean | null;
  parkingAvailable: boolean | null;
  priceLevel: number | null;
  approvedImageCount: number;
  hasFullImageSet: boolean;
  readyForLive: boolean;
  ageGroups: string[];
  activityTypes: string[];
  images: ActivityDetailImage[];
  openIssues: ActivityDetailIssue[];
};

const CITY_CODE = 'HOU';

function formatBoolean(value: boolean | null): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not set';
}

function formatIndoorOutdoor(value: ActivityDetail['indoorOutdoor']): string {
  if (!value) return 'Not set';
  if (value === 'both') return 'Indoor + Outdoor';
  if (value === 'indoor') return 'Indoor';
  return 'Outdoor';
}

function formatPriceLevel(value: number | null): string {
  if (!value || value < 1 || value > 4) return 'Not set';
  return '$'.repeat(value);
}

const ActivityEditor: React.FC = () => {
  const { id } = useParams();
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!id) {
        setError('Missing activity ID in route.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/activities/${encodeURIComponent(id)}?city=${CITY_CODE}`);
        if (!response.ok) {
          throw new Error(`Activity request failed: ${response.status}`);
        }

        const payload = (await response.json()) as ActivityDetail;
        if (!cancelled) {
          setActivity(payload);
          setImageLoadErrors({});
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load activity.';
          setError(message);
          setActivity(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadActivity();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const approvedImages = useMemo(
    () => (activity?.images ?? []).filter((image) => image.status === 'ready' && image.publicUrl),
    [activity],
  );

  const heroImage = useMemo(() => {
    if (approvedImages.length === 0) {
      return null;
    }
    return approvedImages.find((image) => image.rankOrder === 1) ?? approvedImages[0];
  }, [approvedImages]);

  const galleryImages = useMemo(
    () =>
      approvedImages.filter((image) => {
        if (!heroImage) return true;
        return image.rankOrder !== heroImage.rankOrder;
      }),
    [approvedImages, heroImage],
  );

  if (loading) {
    return (
      <main className="px-4 lg:px-40 flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Loading activity details...
          </div>
        </div>
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main className="px-4 lg:px-40 flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col max-w-[1200px] flex-1 gap-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            Could not load activity details: {error ?? 'Unknown error'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 lg:px-40 flex flex-1 justify-center py-8">
      <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2 text-primary">
            <Link to="/" className="flex items-center gap-1 text-sm font-medium hover:underline">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <span>Dashboard</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>Activities</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">{activity.name}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-end gap-4 pb-8 border-b border-slate-200 dark:border-slate-800 mb-8">
          <div className="flex flex-col gap-2">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Activity ID: {activity.externalId}</p>
            <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-black leading-tight tracking-[-0.033em]">{activity.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {activity.readyForLive ? 'Ready for live' : 'Needs review'} · {activity.approvedImageCount}/5 approved images
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                activity.readyForLive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activity.readyForLive ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              ></span>
              {activity.readyForLive ? 'Ready for Live' : 'Needs Review'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                activity.status === 'active'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {activity.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Activity Details
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Name</label>
                <input
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                  type="text"
                  value={activity.name}
                  readOnly
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Primary Location</label>
                <textarea
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                  rows={2}
                  value={activity.primaryLocation ?? 'Location pending review'}
                  readOnly
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Website URL</label>
                  <input
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                    type="text"
                    value={activity.websiteUrl ?? 'Not set'}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                    type="text"
                    value={activity.phoneRaw ?? activity.phoneNormalized ?? 'Not set'}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                    type="text"
                    value={activity.email ?? 'Not set'}
                    readOnly
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hours</label>
                  <input
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                    type="text"
                    value={activity.hoursRaw ? activity.hoursRaw.replace(/\n/g, ' | ') : 'Not set'}
                    readOnly
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent dark:text-slate-100"
                  rows={5}
                  value={activity.description ?? 'Description pending review'}
                  readOnly
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">category</span>
                Categorization & Attributes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Location Type</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{activity.locationType ?? 'Not set'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Indoor / Outdoor</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatIndoorOutdoor(activity.indoorOutdoor)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Price Level</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatPriceLevel(activity.priceLevel)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Good for Parties</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatBoolean(activity.goodForParties)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Seasonal</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatBoolean(activity.seasonal)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pet Friendly</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatBoolean(activity.petFriendly)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700 md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parking Available</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatBoolean(activity.parkingAvailable)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Types</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
                  {activity.activityTypes.length === 0 ? (
                    <span className="text-xs text-slate-500">No activity types assigned.</span>
                  ) : (
                    activity.activityTypes.map((type) => (
                      <span key={type} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {type}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Age Groups</label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
                  {activity.ageGroups.length === 0 ? (
                    <span className="text-xs text-slate-500">No age groups assigned.</span>
                  ) : (
                    activity.ageGroups.map((group) => (
                      <span key={group} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        {group}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">image</span>
                Hero Shot (Rank 1)
              </h3>
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                {heroImage && !imageLoadErrors[heroImage.rankOrder] ? (
                  <img
                    className="w-full h-full object-cover"
                    src={heroImage.publicUrl ?? ''}
                    alt={heroImage.altText ?? `${activity.name} hero`}
                    onError={() =>
                      setImageLoadErrors((previous) => ({
                        ...previous,
                        [heroImage.rankOrder]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
                    No approved hero image yet
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Approved images imported: {activity.approvedImageCount}/5 {activity.hasFullImageSet ? '· Full set' : '· Partial set'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">collections</span>
                Approved Gallery
              </h3>
              {galleryImages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                  No additional approved images yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {galleryImages.map((image) => (
                    <div key={image.rankOrder} className="flex flex-col gap-2">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                        {image.publicUrl && !imageLoadErrors[image.rankOrder] ? (
                          <img
                            className="w-full h-full object-cover"
                            src={image.publicUrl}
                            alt={image.altText ?? `${activity.name} image ${image.rankOrder}`}
                            onError={() =>
                              setImageLoadErrors((previous) => ({
                                ...previous,
                                [image.rankOrder]: true,
                              }))
                            }
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                            Image unavailable
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                          Rank {image.rankOrder}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{image.reviewClassification ?? 'Approved'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-3 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">warning</span>
                Open Data Issues
              </h3>
              {activity.openIssues.length === 0 ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">No open issues for this activity.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activity.openIssues.map((issue) => (
                    <div key={`${issue.fieldName}-${issue.issueCode}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                      <p className="font-semibold">{issue.fieldName}</p>
                      <p>{issue.issueMessage}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ActivityEditor;

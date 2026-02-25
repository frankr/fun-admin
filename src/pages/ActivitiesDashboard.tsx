import React from 'react';
import { Link } from 'react-router-dom';

const ActivitiesDashboard: React.FC = () => {
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
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors" title="Upload activities via CSV">
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
        {/* Total Activities */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Activities</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">1,284</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">list_alt</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <span className="material-symbols-outlined text-sm">trending_up</span> 12.5%
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
          </div>
        </div>

        {/* New This Week */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">New This Week</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">42</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <span className="material-symbols-outlined text-2xl">new_releases</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <span className="material-symbols-outlined text-sm">trending_up</span> 8.2%
            </span>
            <span className="text-xs text-slate-400">vs last week</span>
          </div>
        </div>

        {/* Active Locations */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Locations</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">156</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <span className="material-symbols-outlined text-2xl">location_on</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex items-center text-xs font-medium text-emerald-600">
              <span className="material-symbols-outlined text-sm">trending_up</span> 2.1%
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input className="w-full rounded-lg border-slate-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" placeholder="Filter by name, address, or specific location..." type="text" />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <span className="material-symbols-outlined text-lg">filter_list</span>
          Filters
        </button>
      </div>

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
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <input className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800" type="checkbox" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 overflow-hidden">
                      <img alt="Skydiving" className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiQQQzCPYQhIRmI1ZuLKKIXel9QMdCsL9HjuQr9mAvysTQ4n3HJr1AFK6z8lhvdnT9FnatqMWJlsP3dGIcjP4NfpS-nHev55mrTprFBM-1BReH3whExNDJHWDKPYESS8NpqHMLTsdmb5isdPgK-Ua63MbEhO5BJk-Fw7ZXfqRa3FnV75m_ESVwEqUw8Hqlu1t-234gR2HgpgKmylElFonVHhboSdh5FCQtu9AZP7yXkFIVEM0BVU7Ka7cf62WIYycooqsM7yoL7QPo" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">Skydiving Adventure</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">New York, NY</td>
                <td className="px-6 py-4 text-center">
                  <a className="text-primary hover:text-primary/80" href="#">
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </a>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Outdoors</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to="/activities/1" className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </Link>
                    <button className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <input className="rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800" type="checkbox" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-slate-100 overflow-hidden">
                      <img alt="Science Museum" className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsdpqMy5HcwxXEbdFBRKzB-5z9hP6kBixJVTG9yTwVknhHshcI3vhwZet0OoM1KgteFbeuoY_OBNBGD6dxlN-E0JMvDGavTEAvmDNLVUOVt0shnu3gQCZ_sJW-i1jHsZJWaMKfCDlTh_jdBXX8l-lZk1CIIPxscWHmDFKnFqF5ZBs9i6VGAIFUpF-8BYJb45lFAXr1VqSyKPo7Nnms6CydfhoICt5UaYkizkZvzth8Tv_DxEAbT61AUX0Yt_liSSzJO3fuNiw0gc_v" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">Science Museum Tour</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">Boston, MA</td>
                <td className="px-6 py-4 text-center">
                  <a className="text-primary hover:text-primary/80" href="#">
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </a>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">Educational</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to="/activities/2" className="p-1 text-slate-400 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </Link>
                    <button className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-slate-200">1</span> to <span className="font-medium text-slate-900 dark:text-slate-200">10</span> of <span className="font-medium text-slate-900 dark:text-slate-200">1,284</span> results
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-1">
              <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white">1</button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800">2</button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800">3</button>
              <span className="px-2 text-slate-400">...</span>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800">128</button>
            </div>
            <button className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivitiesDashboard;

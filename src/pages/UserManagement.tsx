import React from 'react';
import { Link } from 'react-router-dom';

const UserManagement: React.FC = () => {
  return (
    <div className="max-w-[1280px] mx-auto w-full px-4 lg:px-10 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage, search, and monitor platform members and their activity.</p>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Add New User
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">group</span>
            <span className="text-emerald-600 dark:text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+5.2%</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mt-2">Total Users</p>
          <p className="text-slate-900 dark:text-white text-3xl font-bold">12,840</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">bolt</span>
            <span className="text-emerald-600 dark:text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+12.4%</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mt-2">Active This Month</p>
          <p className="text-slate-900 dark:text-white text-3xl font-bold">8,420</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">person_add</span>
            <span className="text-emerald-600 dark:text-emerald-500 text-xs font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">+8.1%</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mt-2">New Signups</p>
          <p className="text-slate-900 dark:text-white text-3xl font-bold">1,205</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400">search</span>
            </div>
            <input className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="Search by name, email, or phone number..." type="text" />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filters
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* User Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* User Row 1 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBCtBP396Dq-2OaBxUgkQsN6xOxjyNOWyY705gX5G8wX0StvTA7Em0dIEeYDt5LmGW_qVV1WTMD6Gd-7Ek83XR4t5hSNKBxSAUXjRVVW7Lu39d1fozgFyP5OQtEY5zdl6V2tQFwUYxRGyxF7NvKinOhWMl4gmnTT-0lHRckOgVo-AUJyUsK6SiZNmjZiyFPE326W708cy2UgIdygsNhpg8eDqQN7aCZtVM8eqX7WHk27OFHxipZhKwcSsuqacHMxC-3hAyKFvey9K4T')" }}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">Alex Thompson</span>
                      <span className="text-xs text-slate-500 mt-1">@alex_t</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">alex.thompson@gmail.com</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">+1 (555) 0123</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Oct 12, 2023</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">2h ago</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors" title="Message User">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </button>
                    <Link to="/users/1" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors" title="View Details">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Link>
                  </div>
                </td>
              </tr>
              {/* User Row 2 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-200 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCMCJ1VMNiVUAGMbC6EBoTb3st270vVmKEz5EIng3MpxsqB0wWuqo9-MVhd6tUlOrIE9-tLJOXWZfoQC_rDDg8SCM5-9MzTvDUqxZik_n7CkCEmGEYe88RlHYScdRpeH5WJNZvuKuG_vsyMVLP82jMWNYVHo8YTqzDKVKtnpJzn_kK4JmJnjoeuuRMso86T75kpMDUwCF4iju8ztIeWfm4g54SxjRUj3a9EU41EwGyfKkR23_YWpvSVVHzvv-oZPRG5SvRat5GGoA-Y')" }}></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">Sarah Chen</span>
                      <span className="text-xs text-slate-500 mt-1">@schen_dev</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">sarah.chen@tech.co</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">+44 20 7123 4567</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">Nov 05, 2023</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">1d ago</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    Suspended
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors" title="Message User">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </button>
                    <Link to="/users/2" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-colors" title="View Details">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </Link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Showing 1-2 of 12,840 users</span>
          <div className="flex gap-1">
            <button className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="size-8 rounded bg-primary text-white text-xs font-bold shadow-sm">1</button>
            <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">2</button>
            <button className="size-8 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors">3</button>
            <button className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
      <footer className="mt-8 border-t border-slate-200 dark:border-slate-800 py-6 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-600">© 2024 Funzinga Platform Admin. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default UserManagement;

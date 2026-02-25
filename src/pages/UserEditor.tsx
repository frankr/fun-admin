import React from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { findMockUser } from '../data/mockUsers';

const UserEditor: React.FC = () => {
  const { id } = useParams();
  const user = findMockUser(id);

  if (!user) {
    return (
      <main className="flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-[960px] px-4 md:px-10 gap-6">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link className="text-sm font-medium hover:text-primary" to="/users">User Management</Link>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">User Not Found</span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            The user ID <span className="font-bold">{id ?? '(missing)'}</span> was not found in this prototype dataset.
          </div>

          <div>
            <Link to="/users" className="inline-flex items-center justify-center rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
              Back to List
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const statusText = user.status === 'Active' ? 'ACTIVE' : 'SUSPENDED';

  return (
    <main className="flex flex-1 justify-center py-8">
      <div className="layout-content-container flex flex-col w-full max-w-[960px] px-4 md:px-10 gap-6">
        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
          <Link className="text-sm font-medium hover:text-primary" to="/users">User Management</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Edit User</span>
        </div>

        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">{user.fullName}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">ID: #USR-{user.id.padStart(4, '0')}</p>
          </div>
          <Link to="/users" className="flex items-center justify-center rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
            Back to List
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-slate-900 dark:text-slate-100 text-base font-bold">Account Status</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Currently active. Suspending will restrict user access to all platform features.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input defaultChecked={user.status === 'Active'} className="sr-only peer" type="checkbox" />
            <div className="w-14 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
            <span className="ml-3 text-sm font-bold text-primary">{statusText}</span>
          </label>
        </div>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="material-symbols-outlined text-primary">person</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <input className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-primary" type="text" defaultValue={user.fullName} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-primary" type="email" defaultValue={user.email} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-primary" type="tel" defaultValue={user.phone} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</label>
              <input className="w-full rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-primary focus:ring-primary" type="text" defaultValue="123 Adventure Lane, San Francisco, CA" />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="material-symbols-outlined text-primary">settings_account_box</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Account Details</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Join Date</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.createdDate}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Last Login</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.lastLogin}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Membership Tier</span>
              <div className="px-2 py-1 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">Paid Member</div>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Verification</span>
              <span className="flex items-center text-xs font-bold text-green-500">
                <span className="material-symbols-outlined text-sm mr-1">verified</span> Verified
              </span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Security</span>
              <button className="flex items-center justify-center rounded-lg h-8 px-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined mr-1 text-base">lock_reset</span>
                Reset Password
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="material-symbols-outlined text-primary">family_history</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Family Details</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Interests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100 font-medium">Sarah Doe</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">8</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Female</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Painting, Swimming</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100 font-medium">Leo Doe</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">5</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Male</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Dinosaurs, Soccer</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="material-symbols-outlined text-primary">monitoring</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Platform Activity</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Check Ins</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">24</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activities Viewed</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">142</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviews Left</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">8</p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">local_offer</span> Offers Redeemed
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100">5</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">Checked In</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Sunset Yacht Tour</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">Jan 12, 2024</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">Profile Updated</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Contact Details</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">Jan 08, 2024</td>
                </tr>
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-900 dark:text-slate-100">Activity Favorited</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">Deep Sea Diving</td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 text-right">Jan 05, 2024</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-6 pb-12 border-t border-slate-200 dark:border-slate-800">
          <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Discard changes
          </button>
          <button className="px-8 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </main>
  );
};

export default UserEditor;

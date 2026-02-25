import React from 'react';
import { Link } from 'react-router-dom';

const ActivityEditor: React.FC = () => {
  return (
    <main className="px-4 lg:px-40 flex flex-1 justify-center py-8">
      <div className="layout-content-container flex flex-col max-w-[1200px] flex-1">
        {/* Breadcrumbs & Back Button */}
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
            <span className="text-slate-900 dark:text-slate-100 font-medium">Skydiving Adventure</span>
          </div>
        </div>

        {/* Page Header & Status Toggle */}
        <div className="flex flex-wrap justify-between items-end gap-4 pb-8 border-b border-slate-200 dark:border-slate-800 mb-8">
          <div className="flex flex-col gap-2">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Activity ID: #SK-9920</p>
            <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-black leading-tight tracking-[-0.033em]">Skydiving Adventure</h1>
          </div>
          <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col gap-0.5">
              <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">Activity Status</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Platform Visibility</p>
            </div>
            <label className="relative flex h-[28px] w-[50px] cursor-pointer items-center rounded-full border-none bg-slate-200 dark:bg-slate-700 p-1 has-[:checked]:justify-end has-[:checked]:bg-primary transition-all">
              <div className="h-full aspect-square rounded-full bg-white shadow-md"></div>
              <input defaultChecked className="invisible absolute peer" type="checkbox" readOnly />
            </label>
            <span className="text-primary font-bold text-sm min-w-[48px]">Active</span>
          </div>
        </div>

        {/* Two-Column Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Details */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Activity Details
              </h3>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Name</label>
                <input className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100" type="text" defaultValue="Skydiving Adventure" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
                  <input className="w-full pl-10 rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100" type="text" defaultValue="123 Gravity Lane, Skydive Valley, AZ 85001" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Website URL</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">link</span>
                  <input className="w-full pl-10 rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100" type="url" defaultValue="https://skydivingadventure.com" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100" rows={5} defaultValue="Experience the ultimate thrill of freefall from 14,000 feet! Join our expert instructors for a tandem jump that offers breathtaking views of the desert landscape. Perfect for beginners and thrill-seekers alike. Equipment, training, and a commemorative video are included in the package." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category Tags</label>
                <div className="flex flex-wrap gap-2 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Adventure <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Extreme Sports <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Outdoor <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <button className="flex items-center gap-1 text-slate-400 hover:text-primary px-2 py-1 rounded-md text-xs font-bold transition-colors">
                    <span className="material-symbols-outlined text-[16px]">add</span> Add Tag
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">category</span>
                Categorization & Attributes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location Type</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option>Urban</option>
                    <option selected>Nature</option>
                    <option>Coastal</option>
                    <option>Rural</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Price Range</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option>$</option>
                    <option>$$</option>
                    <option selected>$$$</option>
                    <option>$$$$</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pet Friendly</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option selected>No</option>
                    <option>Yes</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Seasonal</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option selected>Year-round</option>
                    <option>Summer</option>
                    <option>Winter</option>
                    <option>Spring/Autumn</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Good for Parties</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option selected>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Indoor or Outdoor</label>
                  <select className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-primary dark:text-slate-100 text-sm">
                    <option selected>Outdoor</option>
                    <option>Indoor</option>
                    <option>Both</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Activity Type</label>
                <div className="flex flex-wrap gap-2 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Sports <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <button className="flex items-center gap-1 text-slate-400 hover:text-primary px-2 py-1 rounded-md text-xs font-bold transition-colors">
                    <span className="material-symbols-outlined text-[16px]">add</span> Add Type
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Age Group</label>
                <div className="flex flex-wrap gap-2 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Adults <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">
                    Teens <button className="material-symbols-outlined text-[14px]">close</button>
                  </span>
                  <button className="flex items-center gap-1 text-slate-400 hover:text-primary px-2 py-1 rounded-md text-xs font-bold transition-colors">
                    <span className="material-symbols-outlined text-[16px]">add</span> Add Group
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Media Management */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Hero Shot */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">image</span>
                  Hero Shot
                </h3>
                <div className="flex gap-2">
                  <button className="text-xs font-bold text-primary hover:underline">Replace</button>
                  <button className="text-xs font-bold text-red-500 hover:underline">Remove</button>
                </div>
              </div>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5adW4U0_onwIKVa7G6hxw7L5-GaZrFQ-YoP29wWDqqv_LN1Uoh0BPN8IWIobXB4Cq9xk30a9VrLDVstHUv9CX24iHfs1eSnd1fHdH2xPrw_HswlCJ6mSZ3vsZV0bDn0lBGU7Cea0j7FGm6ongOdQNOD_RNGfnx-AymLgtHfOSEsQwclY_DjVuhYMnTIPBknEiOlFS4kYby3l8LHUun0Bcz-IfKCM1y1r9R_XJwn5HIa0fHIPkt_WDnRtIiWZY_Bx9GPaYgJ6aIGN6" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm shadow-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                    Update Cover
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">Recommended size: 1920x1080px. Max file size: 5MB.</p>
            </div>

            {/* Gallery */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-6 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">collections</span>
                Gallery
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Gallery Item 1 */}
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCimkzA27AqLUqUp6JSVv2xtetwiHtuZfAjRMrdl2PgAPlD3LsMMEvB10qmqZfqCpyv1I5dwQHH4vFutGZndZzh_X28cnGJxp65Ezf4E63sclM-dZXih9zEsgKySEtCPRYXeP8Vw6LLYjoTvOfcI92n_-4ITs4kHhafASMihUZgqUtqfse9s-1-fwfLxuD4TNDH0V6J4P0E1q6FtCkx9cBwQ0UL5A95IiUiJCAgpIVyiJY60Yn7j-CJ9-o0sI7nKPIpU-U0jDwA-ElM" />
                    <button className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md shadow-lg hover:bg-red-600 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <input className="text-xs w-full border-none bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 focus:ring-1 focus:ring-primary" placeholder="Add caption..." type="text" defaultValue="Safe landing" />
                </div>
                {/* Gallery Item 2 */}
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                    <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1I8Cg5j-J3SIQUx-Pwovrq8kDH3jufnpbxpgTbzm8vXXn64UAnm8Hh-eCzOeTIaHiNm8nD9eD4tHhNnnWuyQjfpU23mCjIEYHSJUQoCVPLuWhuHdIwc35TIkuAM9moD5bcmQcMRUZaM3nZnt0iCQvOKssTOEf6uo5JtAAfmtN9xanu-_3Pk9dGXSIByc8ZZjjB4qkqfOLN_7rUOS9QW2C0QRA9aXFfDVQ4D5VUp9bWtLBMD0ovTpxG5hQiujVmqUoJnFluf_ZpQnn" />
                    <button className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md shadow-lg hover:bg-red-600 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                  <input className="text-xs w-full border-none bg-slate-100 dark:bg-slate-800 rounded px-2 py-1 focus:ring-1 focus:ring-primary" placeholder="Add caption..." type="text" defaultValue="Tandem instructors" />
                </div>
                {/* Add New Trigger */}
                <div className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-primary text-3xl">add_photo_alternate</span>
                  <span className="text-xs font-bold text-slate-500">Upload Media</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 mb-20 flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg sticky bottom-8 z-10">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-sm">sync</span>
            <span className="text-xs font-medium">Last saved 5 minutes ago</span>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Discard Changes
            </button>
            <button className="px-8 py-2.5 rounded-lg bg-primary text-white font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">save</span>
              Save Activity
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ActivityEditor;

function createSettingsPage() {

    return `

<section class="p-8 space-y-8">

    <!-- General Settings -->

    <div class="rounded-3xl border border-slate-700 bg-slate-800/60 overflow-hidden">

        <div class="px-8 py-6 border-b border-slate-700 flex items-center gap-3">

            <span class="text-2xl">🏪</span>

            <h2 class="text-2xl font-bold text-white">

                General Settings

            </h2>

        </div>

        <div class="p-8 grid grid-cols-2 gap-6">

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Cafe Name

                </label>

                <input type="text" value="Gaming Cafe"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Phone Number

                </label>

                <input type="tel" value="+91 98765 43210"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Email

                </label>

                <input type="email" value="admin@gamingcafe.in"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Address

                </label>

                <input type="text" value="123 MG Road, Bangalore, Karnataka"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

        </div>

    </div>

    <!-- Pricing Settings -->

    <div class="rounded-3xl border border-slate-700 bg-slate-800/60 overflow-hidden">

        <div class="px-8 py-6 border-b border-slate-700 flex items-center gap-3">

            <span class="text-2xl">💰</span>

            <h2 class="text-2xl font-bold text-white">

                Pricing (per hour)

            </h2>

        </div>

        <div class="p-8 grid grid-cols-3 gap-6">

            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-700">

                <div class="flex items-center gap-3 mb-4">

                    <span class="text-3xl">🎮</span>

                    <h3 class="text-xl font-bold text-white">

                        PS5

                    </h3>

                </div>

                <label class="block text-slate-400 text-sm mb-2">

                    Hourly Rate

                </label>

                <div class="relative">

                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">

                        ₹

                    </span>

                    <input type="number" value="200"

                        class="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

                </div>

            </div>

            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-700">

                <div class="flex items-center gap-3 mb-4">

                    <span class="text-3xl">🎮</span>

                    <h3 class="text-xl font-bold text-white">

                        PS4

                    </h3>

                </div>

                <label class="block text-slate-400 text-sm mb-2">

                    Hourly Rate

                </label>

                <div class="relative">

                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">

                        ₹

                    </span>

                    <input type="number" value="150"

                        class="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

                </div>

            </div>

            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-700">

                <div class="flex items-center gap-3 mb-4">

                    <span class="text-3xl">🥽</span>

                    <h3 class="text-xl font-bold text-white">

                        VR

                    </h3>

                </div>

                <label class="block text-slate-400 text-sm mb-2">

                    Hourly Rate

                </label>

                <div class="relative">

                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">

                        ₹

                    </span>

                    <input type="number" value="300"

                        class="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

                </div>

            </div>

        </div>

    </div>

    <!-- Operating Hours -->

    <div class="rounded-3xl border border-slate-700 bg-slate-800/60 overflow-hidden">

        <div class="px-8 py-6 border-b border-slate-700 flex items-center gap-3">

            <span class="text-2xl">🕐</span>

            <h2 class="text-2xl font-bold text-white">

                Operating Hours

            </h2>

        </div>

        <div class="p-8 grid grid-cols-2 gap-6">

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Opening Time

                </label>

                <input type="time" value="10:00"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Closing Time

                </label>

                <input type="time" value="23:00"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

            </div>

            <div class="col-span-2">

                <label class="block text-slate-400 text-sm mb-3">

                    Open Days

                </label>

                <div class="flex gap-3" id="openDays">

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Mon</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Tue</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Wed</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Thu</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Fri</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold transition">Sat</button>

                    <button class="day-btn px-5 py-2.5 rounded-xl bg-slate-700 text-slate-400 font-semibold transition">Sun</button>

                </div>

            </div>

        </div>

    </div>

    <!-- Session Settings -->

    <div class="rounded-3xl border border-slate-700 bg-slate-800/60 overflow-hidden">

        <div class="px-8 py-6 border-b border-slate-700 flex items-center gap-3">

            <span class="text-2xl">⏱</span>

            <h2 class="text-2xl font-bold text-white">

                Session Settings

            </h2>

        </div>

        <div class="p-8 grid grid-cols-2 gap-6">

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Warning Before End (minutes)

                </label>

                <input type="number" value="5"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

                <p class="text-slate-500 text-sm mt-2">

                    Alert customer X minutes before session ends

                </p>

            </div>

            <div>

                <label class="block text-slate-400 text-sm mb-2">

                    Grace Period (minutes)

                </label>

                <input type="number" value="10"

                    class="w-full bg-slate-900 border border-slate-600 rounded-xl px-5 py-3.5 text-white text-lg focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />

                <p class="text-slate-500 text-sm mt-2">

                    Extra time allowed after session expires

                </p>

            </div>

            <div class="col-span-2 flex items-center justify-between bg-slate-900 rounded-2xl p-5 border border-slate-700">

                <div>

                    <h3 class="text-white font-semibold text-lg">

                        Auto-End Expired Sessions

                    </h3>

                    <p class="text-slate-400 text-sm mt-1">

                        Automatically mark sessions as ended when time runs out

                    </p>

                </div>

                <button id="toggleAutoEnd" class="relative w-14 h-8 rounded-full bg-blue-600 transition-colors duration-300">

                    <div class="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 translate-x-6"></div>

                </button>

            </div>

            <div class="col-span-2 flex items-center justify-between bg-slate-900 rounded-2xl p-5 border border-slate-700">

                <div>

                    <h3 class="text-white font-semibold text-lg">

                        Sound Notifications

                    </h3>

                    <p class="text-slate-400 text-sm mt-1">

                        Play a sound alert when session time is about to end

                    </p>

                </div>

                <button id="toggleSound" class="relative w-14 h-8 rounded-full bg-slate-600 transition-colors duration-300">

                    <div class="absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300"></div>

                </button>

            </div>

        </div>

    </div>

    <!-- Save Button -->

    <div class="flex justify-end gap-4">

        <button class="px-8 py-3.5 rounded-xl border border-slate-600 text-slate-300 font-semibold hover:bg-slate-800 transition">

            Cancel

        </button>

        <button class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition">

            💾 Save Settings

        </button>

    </div>

</section>

`;

}

module.exports = createSettingsPage;

function createSidebar() {

    return `

<aside class="w-80 h-screen bg-[#0A1020] border-r border-slate-800 flex flex-col">

    <!-- Logo -->

    <div class="px-8 py-8 border-b border-slate-800">

        <div class="flex items-center gap-5">

            <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-5xl shadow-2xl shadow-blue-500/30">

                🎮

            </div>

            <div>

                <h1 class="text-3xl font-extrabold text-white leading-none">

                    GAMING CAFE

                </h1>

                <p class="text-blue-400 font-medium mt-2 tracking-wide">

                    MANAGEMENT SOFTWARE

                </p>

            </div>

        </div>

    </div>

    <!-- Menu -->

    <nav class="flex-1 px-6 py-8 space-y-4">

        <button class="group w-full flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white font-semibold shadow-lg shadow-blue-500/25 transition duration-300 hover:scale-[1.02]">

            <span class="text-xl">🏠</span>

            Dashboard

        </button>

        <button class="group w-full flex items-center gap-4 rounded-2xl px-6 py-4 text-slate-300 font-medium transition duration-300 hover:bg-slate-800 hover:text-white">

            <span class="text-xl">💰</span>

            Pricing

        </button>

        <button class="group w-full flex items-center gap-4 rounded-2xl px-6 py-4 text-slate-300 font-medium transition duration-300 hover:bg-slate-800 hover:text-white">

            <span class="text-xl">🎮</span>

            Sessions

        </button>

        <button class="group w-full flex items-center gap-4 rounded-2xl px-6 py-4 text-slate-300 font-medium transition duration-300 hover:bg-slate-800 hover:text-white">

            <span class="text-xl">📜</span>

            History

        </button>

        <button class="group w-full flex items-center gap-4 rounded-2xl px-6 py-4 text-slate-300 font-medium transition duration-300 hover:bg-slate-800 hover:text-white">

            <span class="text-xl">📊</span>

            Reports

        </button>

        <button class="group w-full flex items-center gap-4 rounded-2xl px-6 py-4 text-slate-300 font-medium transition duration-300 hover:bg-slate-800 hover:text-white">

            <span class="text-xl">⚙</span>

            Settings

        </button>

    </nav>

    <!-- Admin Card -->

    <div class="px-6 pb-5">

        <div class="rounded-3xl border border-slate-700 bg-slate-900/80 backdrop-blur-md p-5">

            <div class="flex items-center gap-4">

                <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/30">

                    A

                </div>

                <div>

                    <h2 class="text-lg font-bold text-white">

                        Admin

                    </h2>

                    <p class="text-slate-400">

                        Gaming Manager

                    </p>

                    <div class="flex items-center gap-2 mt-2">

                        <div class="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>

                        <span class="text-green-400 text-sm">

                            Online

                        </span>

                    </div>

                </div>

            </div>

        </div>

        <div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">

            <p class="text-slate-400 text-sm">

                Gaming Cafe Management

            </p>

            <p class="text-white font-semibold mt-1">

                Version 1.0.0
            </p>
        </div>

    </div>

</aside>

`;

}

module.exports = createSidebar;
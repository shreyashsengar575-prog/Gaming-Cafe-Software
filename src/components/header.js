function createHeader() {

    return `

<header class="flex items-center justify-between px-10 py-7 border-b border-slate-800 bg-[#101827]">

    <div>

        <h1 class="text-5xl font-extrabold text-white tracking-tight">

            Dashboard

        </h1>

        <p class="text-slate-400 text-xl mt-2">

            Welcome Back,
            <span class="text-blue-400 font-semibold">
                Admin
            </span>
            👋

        </p>

    </div>

    <div
        class="bg-slate-800 border border-slate-700 rounded-3xl px-8 py-5 flex items-center gap-5 shadow-xl">

        <div
            class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl">

            🕒

        </div>

        <div class="text-right">

            <p class="text-slate-400 text-sm">

                Current Time

            </p>

            <h2 id="clock" class="text-4xl font-bold text-white">

                00:00:00

            </h2>

            <p id="date" class="text-slate-500 text-sm mt-1">

                Loading...

            </p>

        </div>

    </div>

</header>

`;

}

function initHeaderClock() {

    function updateClock(){

        const now = new Date();

        const clockEl = document.getElementById("clock");
        const dateEl = document.getElementById("date");

        if (clockEl) clockEl.innerHTML = now.toLocaleTimeString();

        if (dateEl) dateEl.innerHTML = now.toLocaleDateString("en-IN",{
            weekday:"long",
            day:"numeric",
            month:"long",
            year:"numeric"
        });

    }

    updateClock();

    setInterval(updateClock,1000);

}

module.exports = { createHeader, initHeaderClock };
function createStatCard(stat) {

    return `

<div class="relative rounded-3xl border border-slate-700 bg-slate-800/80 p-7 overflow-hidden hover:border-blue-500 transition-all duration-300">

    <div class="absolute top-0 right-0 w-44 h-44 rounded-full bg-blue-500/10 blur-3xl"></div>

    <div class="relative flex justify-between items-start">

        <div>

            <p class="text-slate-400 text-lg">
                ${stat.title}
            </p>

            <h2 class="text-5xl font-bold text-white mt-4">
                ${stat.value}
            </h2>

            <p class="text-green-400 mt-5 text-sm">
                ● Live
            </p>

        </div>

        <div class="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30">

            ${stat.icon}

        </div>

    </div>

</div>

`;

}

module.exports = createStatCard;
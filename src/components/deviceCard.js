function createDeviceCard(device) {

    return `

<div class="rounded-3xl border border-slate-700 bg-slate-800 overflow-hidden hover:border-blue-500 transition duration-300">

    <div class="p-7">

        <div class="flex justify-between items-center">
    
            <div>

                <p class="text-5xl">
                    ${device.icon}
                </p>

                <h2 class="text-4xl font-bold text-white mt-3">
                    ${device.name}
                </h2>

            </div>

            <span class="${device.statusColor} bg-green-500/20 px-4 py-2 rounded-full font-semibold">

                ${device.status}

            </span>

        </div>


        <div class="grid grid-cols-2 gap-4 mt-8">

            <div class="rounded-2xl bg-slate-900 p-5">

                <p class="text-slate-400">

                    Customer

                </p>

                <h3 class="text-white text-xl mt-3">

                    ${device.customer}

                </h3>

            </div>

            <div class="rounded-2xl bg-slate-900 p-5">

                <p class="text-slate-400">

                    Time Left

                </p>

                <h3 class="text-white text-xl mt-3">

                    ${device.time}

                </h3>

            </div>

        </div>

        <button class="w-full mt-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-5 text-white text-xl font-bold hover:from-blue-500 hover:to-indigo-500 transition">

            ▶ Start Session

        </button>

    </div>

</div>

`;

}

module.exports = createDeviceCard;
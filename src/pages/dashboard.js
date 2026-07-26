const createSidebar = require("../components/sidebar");
const { createHeader, initHeaderClock } = require("../components/header");
const createStatCard = require("../components/statCard");
const createDeviceCard = require("../components/deviceCard");

function Dashboard() {

    return `

<div class="flex h-screen bg-[#0B1120]">

    ${createSidebar()}

    <main class="flex-1 overflow-y-auto">

        ${createHeader()}

        <section class="p-8">

            <!-- Top Stats -->

            <div class="grid grid-cols-3 gap-7">

                ${createStatCard({
                    title: "Today's Revenue",
                    value: "₹0",
                    icon: "💰"
                })}

                ${createStatCard({
                    title: "Active Sessions",
                    value: "0",
                    icon: "🎮"
                })}

                ${createStatCard({
                    title: "Total Devices",
                    value: "3",
                    icon: "🖥️"
                })}

            </div>


            <!-- Devices -->

            <div class="grid grid-cols-3 gap-7 mt-8">

                ${createDeviceCard({
                    icon: "🎮",
                    name: "PS5",
                    status: "Available",
                    statusColor: "text-green-400",
                    customer: "-",
                    time: "--:--:--"
                })}

                ${createDeviceCard({
                    icon: "🎮",
                    name: "PS4",
                    status: "Available",
                    statusColor: "text-green-400",
                    customer: "-",
                    time: "--:--:--"
                })}

                ${createDeviceCard({
                    icon: "🥽",
                    name: "VR",
                    status: "Available",
                    statusColor: "text-green-400",
                    customer: "-",
                    time: "--:--:--"
                })}

            </div>


            <!-- Overview -->

            <div class="mt-8 rounded-3xl border border-slate-700 bg-slate-800/60 p-7">

                <h2 class="text-xl font-bold text-white mb-6">
                    📊 Quick Overview
                </h2>

                <div class="grid grid-cols-4 gap-6">

                    <div>

                        <p class="text-slate-400 text-sm">
                            Today's Date
                        </p>

                        <h3 class="text-white text-xl font-bold mt-2">
                            10 July 2026
                        </h3>

                    </div>

                    <div>

                        <p class="text-slate-400 text-sm">
                            Operating Hours
                        </p>

                        <h3 class="text-white text-xl font-bold mt-2">
                            0h 0m
                        </h3>

                    </div>

                    <div>

                        <p class="text-slate-400 text-sm">
                            Completed Sessions
                        </p>

                        <h3 class="text-white text-xl font-bold mt-2">
                            0
                        </h3>

                    </div>

                    <div>

                        <p class="text-slate-400 text-sm">
                            Total Revenue
                        </p>

                        <h3 class="text-green-400 text-xl font-bold mt-2">
                            ₹0
                        </h3>

                    </div>

                </div>

            </div>

        </section>

    </main>

</div>

`;

}

module.exports = Dashboard;
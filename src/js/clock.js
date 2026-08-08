function startClock() {
    const clock = document.getElementById("clock");
    if (!clock) return;
    function updateClock() {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString("en-IN");
    }
    updateClock();
    setInterval(updateClock, 1000);
}
module.exports = startClock;
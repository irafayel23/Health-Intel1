// Keep a small VM from spawning an unbounded number of Python workers.
function createForecastCapacity(limit = 1) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 4) {
        throw new Error('FORECAST_MAX_CONCURRENT must be an integer from 1 through 4.');
    }
    let active = 0;
    return {
        acquire() {
            if (active >= limit) return null;
            active++;
            let released = false;
            return () => {
                if (released) return;
                released = true;
                active--;
            };
        }
    };
}

module.exports = { createForecastCapacity };

// Canvas text does not inherit CSS theme colors. Run for new charts and updates.
if (window.Chart) {
    Chart.register({
        id: 'healthIntelTheme',
        beforeUpdate(chart) {
            const dark = document.documentElement.classList.contains('dark');
            const text = dark ? '#cbd5e1' : '#475569';
            const grid = dark ? '#334155' : '#e2e8f0';
            // Change raw configuration, not Chart.js's resolved options proxy.
            const options = chart.config.options;
            options.color = text;
            const plugins = options.plugins = options.plugins || {};
            if (plugins.legend !== false) {
                plugins.legend = plugins.legend || {};
                plugins.legend.labels = plugins.legend.labels || {};
                plugins.legend.labels.color = text;
            }
            if (plugins.title !== false) {
                plugins.title = plugins.title || {};
                plugins.title.color = text;
            }
            if (['bar', 'line'].includes(chart.config.type)) {
                options.scales = options.scales || {};
                options.scales.x = options.scales.x || {};
                options.scales.y = options.scales.y || {};
            }
            for (const scale of Object.values(options.scales || {})) {
                scale.ticks = scale.ticks || {};
                scale.ticks.color = text;
                scale.grid = scale.grid || {};
                scale.grid.color = grid;
                scale.title = scale.title || {};
                scale.title.color = text;
                scale.border = scale.border || {};
                scale.border.color = grid;
            }
        }
    });
}

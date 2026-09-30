window.HealthIntelDate = {
    parseBirthdate(value) {
        if (typeof value !== 'string') return null;
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
        if (!match) return null;
        const [, month, day, year] = match;
        const iso = `${year}-${month}-${day}`;
        const parsed = new Date(`${iso}T00:00:00Z`);
        return Number(year) >= 1900 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
    },
    formatCaseDate(value) {
        if (!value) return 'Not recorded';
        const date=new Date(value);
        return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : 'Not recorded';
    }
};

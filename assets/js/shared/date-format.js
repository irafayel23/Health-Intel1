window.HealthIntelDate = {
    todayInManila() {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
    },
    parseBirthdate(value) {
        if (typeof value !== 'string') return null;
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
        if (!match) return null;
        const [, month, day, year] = match;
        const iso = `${year}-${month}-${day}`;
        const parsed = new Date(`${iso}T00:00:00Z`);
        return Number(year) >= 1900 && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : null;
    },
    bindNumericBirthdate(input) {
        const events = new AbortController();
        const options = {signal:events.signal};
        const format = digits => [digits.slice(0,2),digits.slice(2,4),digits.slice(4,8)].filter(Boolean).join('/');
        input.addEventListener('beforeinput', event => {
            if (event.inputType === 'insertText' && event.data && /[^0-9/]/.test(event.data)) event.preventDefault();
        }, options);
        input.addEventListener('paste', event => {
            const pasted = event.clipboardData.getData('text').trim();
            // Reject text instead of replacing a valid date with a blank value.
            if (!/^\d[\d/ -]*$/.test(pasted)) { event.preventDefault(); return; }
            event.preventDefault();
            const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pasted);
            const value = iso ? iso[2]+iso[3]+iso[1] : pasted.replace(/\D/g,'');
            const start=input.selectionStart ?? input.value.length, end=input.selectionEnd ?? start;
            const updated=input.value.slice(0,start)+value+input.value.slice(end);
            input.value=format(updated.replace(/\D/g,'').slice(0,8));
            input.setSelectionRange(input.value.length,input.value.length);
            input.dispatchEvent(new Event('input',{bubbles:true}));
        }, options);
        input.addEventListener('input', () => {
            const position=input.selectionStart ?? input.value.length;
            const digitsBefore=input.value.slice(0,position).replace(/\D/g,'').length;
            const digits=input.value.replace(/\D/g,'').slice(0,8);
            const updated=format(digits);
            input.value=updated;
            let caret=digitsBefore;
            if (digitsBefore>2) caret++;
            if (digitsBefore>4) caret++;
            input.setSelectionRange(Math.min(caret,updated.length),Math.min(caret,updated.length));
        }, options);
        return {destroy(){events.abort();}};
    },
    residentAge(record) {
        const birth=String(record.birthdate || '').slice(0,10),today=record.is_deceased?String(record.death_date||'').slice(0,10):this.todayInManila();
        if(record.is_deceased&&!today)return null;
        const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
        if(match && this.parseBirthdate(`${match[2]}/${match[3]}/${match[1]}`) && birth<=today){
            const [by,bm,bd]=birth.split('-').map(Number),[cy,cm,cd]=today.split('-').map(Number);
            const age=cy-by-(cm<bm||(cm===bm&&cd<bd)?1:0);
            if(age<=130)return age;
        }
        return record.is_deceased?null:record.age;
    },
    formatCaseDate(value) {
        if (!value) return 'Not recorded';
        const date=new Date(value);
        return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : 'Not recorded';
    }
};

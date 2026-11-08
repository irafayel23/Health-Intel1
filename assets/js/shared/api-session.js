(() => {
    const originalFetch = window.fetch.bind(window);
    const apiOrigin = window.HEALTH_INTEL_API_ORIGIN ||
        (window.location.protocol === 'https:' ? window.location.origin : 'http://localhost:3000');
    const tokenKey = 'health_intel_token';
    const publicPaths = new Set(['/api/login', '/api/register', '/api/get-next-id', '/api/check-email',
        '/api/forgot-password', '/api/reset-password']);
    let leaving = false;
    const pageRole = /\/(bhw|mho|admin|superadmin)\.html$/.exec(window.location.pathname)?.[1];
    let pageToken = pageRole ? localStorage.getItem(tokenKey) : null;
    let sessionEnded = false;
    const lockPortal = (reason) => {
        if (sessionEnded) return;
        const signedInElsewhere = reason === 'OTHER_SIGN_IN';
        const browserSignInChanged = !signedInElsewhere && !!localStorage.getItem(tokenKey) &&
            localStorage.getItem(tokenKey) !== pageToken;
        sessionEnded = true;
        // Never erase a newer sign-in made in another tab.
        if (localStorage.getItem(tokenKey) === pageToken) clearSession();
        const render = () => {
            if (!document.body || !document.createElement) {
                window.location.replace('index.html');
                return;
            }
            const element = (tag, classes, text) => {
                const node = document.createElement(tag);
                node.className = classes;
                if (text) node.textContent = text;
                return node;
            };
            const icon = name => {
                const node = element('i', 'w-5 h-5 shrink-0');
                node.setAttribute('data-lucide', name);
                node.setAttribute('aria-hidden', 'true');
                return node;
            };
            const backdrop = element('div', 'w-full h-full overflow-y-auto flex items-start p-3 bg-slate-100 dark:bg-slate-950');
            const panel = element('section', 'my-auto mx-auto max-w-lg w-full shrink-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-50 p-5 shadow-sm');
            panel.setAttribute('role', 'alert');
            panel.setAttribute('aria-labelledby', 'session-ended-title');
            const brand = element('div', 'flex items-center gap-2 text-xs font-bold tracking-widest text-emerald-800 dark:text-emerald-300', 'HEALTH-INTEL');
            const logo = element('img', 'w-9 h-9 object-contain');
            logo.src = 'assets/img/Health-Intel-Symbol.png';
            logo.alt = '';
            logo.width = 36;
            logo.height = 36;
            const brandName = element('span', '', 'HEALTH-INTEL');
            brand.textContent = '';
            brand.append(logo, brandName);
            const heading = element('div', 'flex items-center gap-3 mt-3 mb-3');
            const lock = element('span', 'w-12 h-12 shrink-0 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center');
            lock.append(icon('lock-keyhole'));
            const headingText = element('div', 'min-w-0');
            const eyebrow = element('p', 'text-xs font-semibold tracking-widest text-emerald-800 dark:text-emerald-300', 'ACCOUNT SECURITY');
            const title = element('h1', 'mt-1 text-2xl font-bold leading-tight', signedInElsewhere ? 'Signed in elsewhere' : browserSignInChanged ? 'Sign-in changed in this browser' : 'Please sign in again');
            title.id = 'session-ended-title';
            headingText.append(eyebrow, title);
            heading.append(lock, headingText);
            const description = element('p', 'text-sm leading-relaxed text-slate-700 dark:text-slate-200', signedInElsewhere ? 'This browser session has ended because this account was signed in from another browser or device.' : browserSignInChanged ? 'Another tab changed the account signed in to this browser. Sign in again to use this page.' : 'This browser session has ended. Patient information is hidden and further saves are blocked.');
            const steps = element('div', 'my-3');
            for (const [name, label, text] of [
                ['log-in', 'Return to your account', 'Sign in to continue. Unsaved entries are not stored.'],
                ['clipboard-list', 'Check recent records first', 'A submission already sent may have completed. Check before entering it again.']
            ]) {
                const step = element('div', 'flex items-start gap-3 py-3 border-b border-slate-200 dark:border-slate-700');
                const symbol = element('span', 'mt-0.5 text-emerald-800 dark:text-emerald-300');
                symbol.append(icon(name));
                const copy = element('div', 'min-w-0');
                copy.append(element('h2', 'text-sm font-semibold', label), element('p', 'mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200', text));
                step.append(symbol, copy);
                steps.append(step);
            }
            const button = element('button', 'w-full min-h-12 flex items-center justify-center gap-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-300 dark:hover:bg-emerald-200 text-white dark:text-emerald-950 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-300', 'Return to sign in');
            button.type = 'button';
            button.append(icon('arrow-right'));
            button.addEventListener('click', () => window.location.replace('index.html'));
            const reason = element('p', 'mt-3 text-xs leading-relaxed text-slate-700 dark:text-slate-200', signedInElsewhere || browserSignInChanged ? 'Patient information is hidden and further saves are blocked.' : 'Ended by a sign-out, expired session or account security change.');
            panel.append(brand, heading, description, steps, button, reason);
            // Remove patient content, including any open entry dialog. Do not
            // persist unfinished medical information in browser storage.
            backdrop.append(panel);
            document.body.replaceChildren(backdrop);
            window.lucide?.createIcons();
            button.focus();
        };
        if (document.body) render();
        else document.addEventListener('DOMContentLoaded',render,{once:true});
    };
    const clearSession = () => {
        localStorage.removeItem(tokenKey);
        localStorage.removeItem('active_user_id');
    };
    const signInAgain = () => {
        clearSession();
        if (!leaving) { leaving = true; window.location.replace('index.html'); }
    };
    const isApiUrl = url => url.origin === new URL(apiOrigin).origin && url.pathname.startsWith('/api/');
    window.fetch = async (input, options = {}) => {
        const url = new URL(input instanceof Request ? input.url : input, window.location.href);
        let target = input;
        if (url.origin === 'http://localhost:3000' && url.origin !== new URL(apiOrigin).origin) {
            const configured = new URL(apiOrigin);
            url.protocol = configured.protocol;
            url.host = configured.host;
            url.port = configured.port;
            target = input instanceof Request ? new Request(url.href, input) : url.href;
        }
        if (!isApiUrl(url) || publicPaths.has(url.pathname)) return originalFetch(target, options);
        const token = localStorage.getItem(tokenKey);
        if (pageRole && (sessionEnded || token !== pageToken)) { lockPortal(); throw new Error('This browser session has ended.'); }
        if (!token) { signInAgain(); throw new Error('Please sign in to continue.'); }
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(options.headers).forEach((value, name) => headers.set(name, value));
        headers.set('Authorization', `Bearer ${token}`);
        const response = await originalFetch(target, { ...options, headers });
        // An older in-flight request must not end a newly renewed password session.
        if (pageRole && token !== pageToken) throw new Error('An older session response was discarded.');
        if (pageRole && url.pathname === '/api/change-password' && response.ok && !sessionEnded && localStorage.getItem(tokenKey) === pageToken) {
            const updated = await response.clone().json();
            if (sessionEnded || pageToken !== token || localStorage.getItem(tokenKey) !== token) { lockPortal(); throw new Error('Sign-in changed during password update.'); }
            if (updated.success && typeof updated.token === 'string' && updated.token) {
                pageToken = updated.token;
                localStorage.setItem(tokenKey, pageToken);
            } else throw new Error('Session renewal failed. Please sign in again.');
        }
        if (pageRole && (sessionEnded || localStorage.getItem(tokenKey) !== pageToken)) { lockPortal(); throw new Error('This browser session has ended.'); }
        if (!response.ok) {
            let detail = {};
            try { detail = await response.clone().json(); } catch { /* A non-JSON failure still needs a useful message. */ }
            if (['AUTH_REQUIRED', 'SESSION_INVALID', 'SESSION_REPLACED', 'ACCOUNT_INACTIVE'].includes(detail.code)) {
                if (pageRole) lockPortal(detail.reason);
                else if (localStorage.getItem(tokenKey) === token) signInAgain();
            }
            throw new Error(detail.error || `Request failed (${response.status}). Please try again.`);
        }
        return response;
    };
    async function download(url, options = {}, fallbackName = 'health_intel_download') {
        const response = await window.fetch(url, options);
        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition') || '';
        const name = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || fallbackName;
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }
    let logoutRequest;
    function logout() {
        if(logoutRequest)return logoutRequest;
        const token=localStorage.getItem(tokenKey);
        if(pageRole && (sessionEnded || token !== pageToken)){lockPortal();return Promise.reject(new Error('This browser session has ended.'));}
        if(!token){clearSession();return Promise.resolve();}
        logoutRequest=(async()=>{
            const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),10000);
            try {
                const response=await originalFetch(`${apiOrigin}/api/logout`,{method:'POST',headers:{Authorization:`Bearer ${token}`},signal:controller.signal});
                if(!response.ok && response.status!==401)throw Error('Sign out could not be completed. Please try again.');
                // Do not erase a newer login created by another browser tab.
                if(localStorage.getItem(tokenKey)===token)clearSession();
            }finally{clearTimeout(deadline);logoutRequest=null;}
        })();
        return logoutRequest;
    }
    window.HealthIntel = { clearSession, logout, download, apiOrigin };
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('a.sign-out').forEach(link => link.addEventListener('click', async event => {
            event.preventDefault();
            try {await logout();window.location.replace('index.html');}
            catch(error){
                if(window.Swal)window.Swal.fire({icon:'error',title:'Still signed in',text:'The server could not confirm sign out. Check your connection and try again.',customClass:{popup:'hi-dialog'}});
                else window.alert('Sign out could not be completed. Check your connection and try again.');
            }
        }));
    });
    if (pageRole) {
        window.addEventListener?.('storage',event=>{
            if (event.key === null || event.key === tokenKey) {
                if (localStorage.getItem(tokenKey) !== pageToken) lockPortal();
            }
        });
        let checking = false;
        const checkSession = async () => {
            if (checking || sessionEnded) return;
            if (localStorage.getItem(tokenKey) !== pageToken) { lockPortal(); return; }
            checking = true;
            try { await window.fetch(apiOrigin+'/api/session'); }
            catch { /* Network/database outages do not prove session revocation. */ }
            finally { checking = false; }
        };
        window.addEventListener?.('focus',checkSession);
        document.addEventListener('visibilitychange',()=>{ if (!document.hidden) checkSession(); });
        // Server checks every request immediately. This poll clears an idle
        // visible page too; background browser timers can be delayed.
        const timer = window.setInterval?.(checkSession,30000);
        window.addEventListener?.('pagehide',()=>window.clearInterval?.(timer));
        window.HealthIntel.checkSession = checkSession;
        window.fetch(`${apiOrigin}/api/session`).then(response => response.json()).then(result => {
            if(sessionEnded || localStorage.getItem(tokenKey)!==pageToken){lockPortal();return;}
            localStorage.setItem('active_user_id', result.user.system_id);
            if (result.user.role !== pageRole) window.location.replace(`${result.user.role}.html`);
        }).catch(error => console.error(error.message));
    }
})();

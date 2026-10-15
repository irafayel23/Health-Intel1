(() => {
    const originalFetch = window.fetch.bind(window);
    const apiOrigin = window.HEALTH_INTEL_API_ORIGIN ||
        (window.location.protocol === 'https:' ? window.location.origin : 'http://localhost:3000');
    const tokenKey = 'health_intel_token';
    const publicPaths = new Set(['/api/login', '/api/register', '/api/get-next-id', '/api/check-email',
        '/api/forgot-password', '/api/reset-password']);
    let leaving = false;
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
        if (!token) { signInAgain(); throw new Error('Please sign in to continue.'); }
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        new Headers(options.headers).forEach((value, name) => headers.set(name, value));
        headers.set('Authorization', `Bearer ${token}`);
        const response = await originalFetch(target, { ...options, headers });
        if (!response.ok) {
            let detail = {};
            try { detail = await response.clone().json(); } catch { /* A non-JSON failure still needs a useful message. */ }
            if (['AUTH_REQUIRED', 'SESSION_INVALID', 'ACCOUNT_INACTIVE'].includes(detail.code)) signInAgain();
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
    const pageRole = /\/(bhw|mho|admin|superadmin)\.html$/.exec(window.location.pathname)?.[1];
    if (pageRole) {
        window.addEventListener?.('storage',event=>{if(event.key===tokenKey && !event.newValue)window.location.replace('index.html');});
        window.fetch(`${apiOrigin}/api/session`).then(response => response.json()).then(result => {
            localStorage.setItem('active_user_id', result.user.system_id);
            if (result.user.role !== pageRole) window.location.replace(`${result.user.role}.html`);
        }).catch(error => console.error(error.message));
    }
})();

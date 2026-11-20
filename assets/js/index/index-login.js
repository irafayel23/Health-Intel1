// Passwords and takeover challenges stay in this submit handler's memory only.
(() => {
<<<<<<< HEAD
    function showCooldown(seconds, code) {
        const deadline = Date.now() + seconds * 1000;
        const remainingText = remaining => {
            if (!remaining) return 'You can try signing in again.';
            const minutes = Math.floor(remaining / 60);
            const remainder = String(remaining % 60).padStart(2, '0');
            return `Try again in ${minutes}:${remainder}.`;
        };
        let tick;
        return Swal.fire({
            icon:'warning', title:code === 'ACCOUNT_COOLDOWN' ? 'Too many incorrect attempts for this ID' : code === 'CONNECTION_COOLDOWN' ? 'Too many attempts from this connection' : 'Sign-in temporarily blocked', text:remainingText(seconds),
            customClass:{popup:'hi-dialog'},
            didOpen:popup => {
                const message = popup.querySelector('.swal2-html-container');
                if (!message) return;
                const update = () => {
                    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
                    message.textContent = remainingText(remaining);
                    if (!remaining) clearInterval(tick);
                };
                tick = setInterval(update, 1000);
                update();
            },
            willClose:() => clearInterval(tick)
        });
    }
=======
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
    const form = document.getElementById('login-form');
    let pending = false;
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (pending) return;
        pending = true;
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        const systemId = document.getElementById('login_id').value.trim().toUpperCase();
        const passwordField = document.getElementById('login_password');
        const password = passwordField.value;
<<<<<<< HEAD
        const currentToken = sessionStorage.getItem('health_intel_token');
=======
        const currentToken = localStorage.getItem('health_intel_token');
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
        const signIn = async extra => {
            const headers = {'Content-Type':'application/json'};
            if (currentToken) headers.Authorization = `Bearer ${currentToken}`;
            const response = await fetch('http://localhost:3000/api/login', {
                method:'POST', headers, body:JSON.stringify({system_id:systemId, password, ...extra})
            });
            return response.json();
        };
        try {
            let result = await signIn({});
            if (result.code === 'SESSION_CONFLICT') {
<<<<<<< HEAD
                const answer = await Swal.fire({icon:'warning', title:'This account has an active session',
                    text:'An earlier sign-in can remain active after the browser is closed. If you recognize that sign-in, you can end it and continue. Unsaved entries there may be lost.',
=======
                const answer = await Swal.fire({icon:'warning', title:'Account already signed in', text:result.error,
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
                    showCancelButton:true, cancelButtonText:'Cancel', confirmButtonText:'Sign out other session and continue',
                    focusCancel:true, allowOutsideClick:false, confirmButtonColor:'#b91c1c', cancelButtonColor:'#475569', customClass:{popup:'hi-dialog'}});
                if (!answer.isConfirmed) return;
                result = await signIn({replace_existing:true, takeover_token:result.takeover_token});
            }
<<<<<<< HEAD
            if (Number.isSafeInteger(result.retry_after_seconds) && result.retry_after_seconds > 0) {
                passwordField.value = '';
                await showCooldown(result.retry_after_seconds, result.code);
                return;
            }
            if (result.success) {
                // This tab may have signed in while this warning/request was open.
                if (sessionStorage.getItem('health_intel_token') !== currentToken) {
                    await Swal.fire({icon:'info', title:'Sign-in changed in this tab', text:'Reload the sign-in page before continuing.', customClass:{popup:'hi-dialog'}});
                    return;
                }
                sessionStorage.setItem('health_intel_token',result.token);
                sessionStorage.setItem('active_user_id',result.system_id);
                if (document.getElementById('remember_me').checked) localStorage.setItem('remembered_system_id',systemId);
                else localStorage.removeItem('remembered_system_id');
                await Swal.fire({icon:'success', title:'Login Successful', text:'Routing to dashboard...', timer:1500, showConfirmButton:false});
                window.location.replace(result.redirect);
=======
            if (result.success) {
                // Another tab may have signed in while this warning/request was open.
                if (localStorage.getItem('health_intel_token') !== currentToken) {
                    await Swal.fire({icon:'info', title:'Sign-in changed in another tab', text:'Reload the sign-in page before continuing.', customClass:{popup:'hi-dialog'}});
                    return;
                }
                localStorage.setItem('health_intel_token',result.token);
                localStorage.setItem('active_user_id',result.system_id);
                if (document.getElementById('remember_me').checked) localStorage.setItem('remembered_system_id',systemId);
                else localStorage.removeItem('remembered_system_id');
                await Swal.fire({icon:'success', title:'Login Successful', text:'Routing to dashboard...', timer:1500, showConfirmButton:false});
                window.location.href = result.redirect;
>>>>>>> 77e33a469de54a41ddaeb994c2f5451c516ee426
            } else {
                await Swal.fire({icon:result.code === 'SESSION_CONFLICT' ? 'warning':'error', title:'Sign-in not completed',
                    text:result.code === 'SESSION_CONFLICT' ? 'The other session changed. Please sign in again and review the new warning.' : result.error,
                    customClass:{popup:'hi-dialog'}});
            }
        } catch {
            await Swal.fire({icon:'error', title:'Connection Error', text:'Could not complete sign-in. Check your connection and try again.'});
        } finally {
            passwordField.value = '';
            pending = false;
            if (submit) submit.disabled = false;
        }
    });
})();

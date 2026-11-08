// Passwords and takeover challenges stay in this submit handler's memory only.
(() => {
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
        const currentToken = localStorage.getItem('health_intel_token');
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
                const answer = await Swal.fire({icon:'warning', title:'Account already signed in', text:result.error,
                    showCancelButton:true, cancelButtonText:'Cancel', confirmButtonText:'Sign out other session and continue',
                    focusCancel:true, allowOutsideClick:false, confirmButtonColor:'#b91c1c', cancelButtonColor:'#475569', customClass:{popup:'hi-dialog'}});
                if (!answer.isConfirmed) return;
                result = await signIn({replace_existing:true, takeover_token:result.takeover_token});
            }
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

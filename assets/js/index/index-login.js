async function activateStaffAccount(reset = false) {
    const passwordField = (name, label) => `<div class="staff-activation-secret">
        <label for="staff-${name}">${label}</label>
        <div class="staff-activation-password">
            <input id="staff-${name}" name="${name}" type="password" autocomplete="new-password" minlength="8" required>
            <button type="button" data-password-label="${label.toLowerCase()}" aria-controls="staff-${name}" aria-label="Show ${label.toLowerCase()}"><i data-lucide="eye" aria-hidden="true"></i></button>
        </div>
    </div>`;
    const result = await Swal.fire({
        title: reset ? 'Reset staff password' : 'Activate staff account',
        width: '36rem', heightAuto: false,
        customClass: { popup: 'staff-activation-popup' },
        html: `<p class="staff-activation-intro">${reset ? "Enter your System ID and HRIS reset code, then choose a different password." : "Use your System ID and the activation code from HRIS."}</p>
            <div class="staff-activation-fields">
              <label class="staff-activation-id">System ID<input name="system_id" autocomplete="off" spellcheck="false" maxlength="50" required></label>
              <div class="staff-activation-token">
                <label for="staff-code">${reset ? 'Reset code' : 'Activation code'}</label>
                <div class="staff-activation-code">
                    <input id="staff-code" name="code" autocomplete="one-time-code" spellcheck="false" maxlength="40" required>
                    <button type="button" data-paste-activation aria-label="Paste text" title="Paste text">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="8" y="3" width="8" height="4" rx="1"></rect>
                            <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 11h8m-8 4h5"></path>
                        </svg>
                    </button>
                </div>
                <p data-paste-status role="status"></p>
              </div>
              ${passwordField('password', 'New password')}
              ${passwordField('confirm_password', 'Confirm password')}
            </div>`,
        showCancelButton: true, confirmButtonText: reset ? 'Save new password' : 'Activate account',
        confirmButtonColor: '#007d82', showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        didOpen: popup => {
            const id = popup.querySelector('[name="system_id"]');
            const code = popup.querySelector('[name="code"]');
            const status = popup.querySelector('[data-paste-status]');
            function fillActivation(text) {
                const copiedCode = text.match(/\b[A-F0-9]{32}\b|\b[A-F0-9]{8}(?:[-\s]+[A-F0-9]{8}){3}\b/gi);
                if (copiedCode?.length !== 1) return false;
                code.value = copiedCode[0].replace(/[\s-]/g, '').toUpperCase();
                const copiedId = text.match(/\b(?:BHW|MHO|ADM)-(?:\d{3,9}|S[A-F0-9]{12})\b/i);
                if (copiedId) id.value = copiedId[0].toUpperCase();
                status.textContent = '';
                return true;
            }
            code.addEventListener('paste', event => {
                if (fillActivation(event.clipboardData?.getData('text/plain') || '')) event.preventDefault();
            });
            popup.querySelector('[data-paste-activation]').addEventListener('click', async () => {
                try {
                    if (!fillActivation(await navigator.clipboard.readText())) status.textContent = reset ? 'Copy your HRIS reset code and try again.' : 'Copy your activation details or code and try again.';
                } catch {
                    status.textContent = 'Use your keyboard or context menu to paste.';
                }
                code.focus();
            });
            for (const button of popup.querySelectorAll('[data-password-label]')) {
                const input = popup.querySelector('#' + button.getAttribute('aria-controls'));
                button.addEventListener('click', () => {
                    const showing = input.type === 'password';
                    input.type = showing ? 'text' : 'password';
                    button.setAttribute('aria-label', (showing ? 'Hide ' : 'Show ') + button.dataset.passwordLabel);
                    button.innerHTML = showing ? '<i data-lucide="eye-off" aria-hidden="true"></i>' : '<i data-lucide="eye" aria-hidden="true"></i>';
                    window.lucide?.createIcons();
                });
            }
            window.lucide?.createIcons();
        },
        preConfirm: async () => {
            const fields = [...Swal.getHtmlContainer().querySelectorAll('input[name]')];
            if (!fields.every(field => field.reportValidity())) return false;
            const data = Object.fromEntries(fields.map(field => [field.name, field.value]));
            try {
                const response = await fetch('http://localhost:3000/api/' + (reset ? 'redeem-staff-reset' : 'activate-staff'), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw Error(result.error || 'The code could not be accepted.');
                return reset ? result.data : result;
            } catch (error) {
                Swal.showValidationMessage(error.message);
                return false;
            }
        }
    });
    if (result.isConfirmed) {
        const id = document.getElementById('login_id');
        id.value = result.value.system_id;
        await Swal.fire({ icon: 'success', title: reset ? 'Password updated' : 'Account activated', text: 'You can now sign in with your new password.', confirmButtonColor: '#007d82' });
        document.getElementById('login_password').focus();
    }
}

// Passwords and takeover challenges stay in this submit handler's memory only.
(() => {
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
        const currentToken = sessionStorage.getItem('health_intel_token');
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
                const answer = await Swal.fire({icon:'warning', title:'This account has an active session',
                    text:'An earlier sign-in can remain active after the browser is closed. If you recognize that sign-in, you can end it and continue. Unsaved entries there may be lost.',
                    showCancelButton:true, cancelButtonText:'Cancel', confirmButtonText:'Sign out other session and continue',
                    focusCancel:true, allowOutsideClick:false, confirmButtonColor:'#b91c1c', cancelButtonColor:'#475569', customClass:{popup:'hi-dialog'}});
                if (!answer.isConfirmed) return;
                result = await signIn({replace_existing:true, takeover_token:result.takeover_token});
            }
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

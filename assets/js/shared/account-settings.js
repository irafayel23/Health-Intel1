// One account dialog for all four portals; the authenticated session supplies identity.
(() => {
    async function open() {
        try {
            const response = await fetch(HealthIntel.apiOrigin + '/api/session');
            const result = await response.json();
            if (!response.ok || !result.user) throw Error(result.error || 'Account details could not be loaded.');
            const user = result.user;
            const escape = HealthIntelText.escape;
            const roles = {bhw:'Barangay Health Worker',mho:'Municipal Health Officer',admin:'Admin',superadmin:'Superadmin'};
            const field = (id, label, autocomplete) => `<div class="hi-account-field"><label for="${id}">${label}</label><input id="${id}" type="password" autocomplete="${autocomplete}" aria-describedby="account-password-help" required></div>`;
            const answer = await Swal.fire({
                titleText: 'Profile & security',
                customClass: {container:'hi-account-container',popup:'hi-account-dialog',confirmButton:'hi-account-save',cancelButton:'hi-account-cancel'},
                html: `<div class="hi-account-identity"><span class="hi-account-mark" aria-hidden="true"><i data-lucide="shield-check"></i></span><dl><dt>Account ID</dt><dd>${escape(user.system_id)}</dd></dl><span class="hi-account-role">${escape(roles[user.role] || 'Account')}</span></div><h3 class="hi-account-heading">Change password</h3><p id="account-password-help" class="hi-account-help">Use at least 8 characters (maximum 72 UTF-8 bytes).</p><div class="hi-account-fields">${field('account-current-password','Current password','current-password')}${field('account-new-password','New password','new-password')}${field('account-confirm-password','Confirm new password','new-password')}</div><p class="hi-account-note">Your current browser stays signed in. Other sessions will end.</p>`,
                showCloseButton: true, closeButtonAriaLabel: 'Close profile settings',
                showCancelButton: true, cancelButtonText: 'Cancel', confirmButtonText: 'Save password',
                reverseButtons: true, focusConfirm: false, returnFocus: true,
                showLoaderOnConfirm: true, allowOutsideClick: () => !Swal.isLoading(),
                allowEscapeKey: () => !Swal.isLoading(),
                didOpen: () => {
                    window.lucide?.createIcons();
                    document.getElementById('account-current-password').focus();
                },
                preConfirm: async () => {
                    const current = document.getElementById('account-current-password').value;
                    const password = document.getElementById('account-new-password').value;
                    const confirmation = document.getElementById('account-confirm-password').value;
                    if (!current || !password || !confirmation) {
                        Swal.showValidationMessage('Complete all three password fields.');
                        return false;
                    }
                    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
                        Swal.showValidationMessage('Use at least 8 characters and at most 72 UTF-8 bytes.');
                        return false;
                    }
                    if (password !== confirmation) {
                        Swal.showValidationMessage('New password and confirmation must match.');
                        return false;
                    }
                    try {
                        const response = await fetch(HealthIntel.apiOrigin + '/api/change-password', {
                            method: 'POST', headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({current_password:current,new_password:password})
                        });
                        const result = await response.json();
                        if (!response.ok || !result.success) throw Error(result.error || 'Password could not be updated.');
                        return result;
                    } catch (error) {
                        Swal.showValidationMessage(error.message || 'Please try again.');
                        return false;
                    }
                }
            });
            if (answer.isConfirmed && answer.value?.success) {
                await Swal.fire({icon:'success',title:'Password updated',text:'Your new password is saved. You can continue using your account.',showCloseButton:true,confirmButtonText:'Done'});
            }
        } catch (error) {
            await Swal.fire({icon:'error',title:'Account unavailable',text:error.message || 'Please try again.'});
        }
    }
    window.HealthIntelAccount = {open};
})();

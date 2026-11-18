// Superadmin encrypted backup dialog and download.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      async function backupDB() {
        const button = document.getElementById('backup-download-button');
        if (button.disabled) return;
        button.disabled = true;
        try {
          const result = await Swal.fire({
            titleText: 'Database Backup',
            customClass: { container: 'hi-account-container', popup: 'hi-account-dialog hi-backup-dialog', confirmButton: 'hi-backup-create', cancelButton: 'hi-account-cancel' },
            buttonsStyling: false,
            html: '<div class="hi-account-identity hi-backup-intro"><span class="hi-account-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/></svg></span><div><strong>Encrypted ZIP backup</strong><p class="hi-account-help">Protect your database copy with a password.</p></div></div>' +
              '<div class="hi-account-fields hi-backup-fields"><div class="hi-account-field"><label for="backup-password">Backup password</label><input id="backup-password" type="password" placeholder="Enter backup password" autocomplete="new-password" minlength="12" maxlength="128" aria-describedby="backup-password-help" required></div>' +
              '<div class="hi-account-field"><label for="backup-password-confirm">Confirm backup password</label><input id="backup-password-confirm" type="password" placeholder="Re-enter backup password" autocomplete="new-password" minlength="12" maxlength="128" required></div></div>' +
              '<p id="backup-password-help" class="hi-account-note">Use 12–128 characters. Keep this password safe; you will need it to open the ZIP.</p>',
            showCloseButton: true, closeButtonAriaLabel: 'Close backup dialog',
            showCancelButton: true, cancelButtonText: 'Cancel', confirmButtonText: 'Create backup',
            focusConfirm: false,
            didOpen: () => document.getElementById('backup-password').focus(),
            preConfirm: () => {
              const password = document.getElementById('backup-password').value;
              const confirmation = document.getElementById('backup-password-confirm').value;
              if (password.length < 12 || password.length > 128) { Swal.showValidationMessage('Use between 12 and 128 characters.'); return false; }
              if (password !== confirmation) { Swal.showValidationMessage('The passwords must match.'); return false; }
              return password;
            }
          });
          if (!result.isConfirmed) return;
          Swal.fire({ title: 'Creating backup...', text: 'Preparing the database tables and records.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
          await HealthIntel.download('http://localhost:3000/api/superadmin/backup', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: result.value })
          }, 'health_intel_backup.zip');
          Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog", title: 'Download started', text: 'Keep your backup password to open the encrypted ZIP.', icon: 'success' });
        } catch (error) {
          Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog", title: 'Backup failed', text: error.message, icon: 'error' });
        } finally {
          button.disabled = false;
        }
      }

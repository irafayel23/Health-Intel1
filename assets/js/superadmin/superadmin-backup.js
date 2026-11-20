// Superadmin encrypted backup dialog and download.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      function downloadRecoveryGuide() {
        const title = document.getElementById('recovery-guide-title').textContent.trim();
        const guide = document.getElementById('recovery-guide-steps');
        const sections = Array.from(guide.querySelectorAll('h3, p, li'), item => item.textContent.trim());
        const file = new Blob([['Health-Intel', title, ...sections].join('\r\n\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Health-Intel Offline Recovery Guide.txt';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

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
              '<div class="hi-account-fields hi-backup-fields"><div class="hi-account-field"><label for="backup-password">Backup password</label><div class="hi-backup-password-wrap"><input id="backup-password" type="password" placeholder="Enter backup password" autocomplete="new-password" minlength="12" maxlength="128" aria-describedby="backup-password-help" required><button type="button" id="backup-password-toggle" class="hi-backup-password-toggle" aria-controls="backup-password" aria-label="Show backup password" title="Show backup password"><i data-lucide="eye" aria-hidden="true"></i></button></div></div>' +
              '<div class="hi-account-field"><label for="backup-password-confirm">Confirm backup password</label><div class="hi-backup-password-wrap"><input id="backup-password-confirm" type="password" placeholder="Re-enter backup password" autocomplete="new-password" minlength="12" maxlength="128" required><button type="button" id="backup-password-confirm-toggle" class="hi-backup-password-toggle" aria-controls="backup-password-confirm" aria-label="Show confirmation password" title="Show confirmation password"><i data-lucide="eye" aria-hidden="true"></i></button></div></div></div>' +
              '<p id="backup-password-help" class="hi-account-note">Use 12–128 characters. Keep this password safe; you will need it to open the ZIP.</p>',
            showCloseButton: true, closeButtonAriaLabel: 'Close backup dialog',
            showCancelButton: true, cancelButtonText: 'Cancel', confirmButtonText: 'Create backup',
            focusConfirm: false,
            didOpen: () => {
              for (const [id, label] of [['backup-password', 'backup password'], ['backup-password-confirm', 'confirmation password']]) {
                const input = document.getElementById(id);
                const toggle = document.getElementById(id + '-toggle');
                toggle.addEventListener('click', () => {
                  const show = input.type === 'password';
                  input.type = show ? 'text' : 'password';
                  const action = (show ? 'Hide ' : 'Show ') + label;
                  toggle.setAttribute('aria-label', action);
                  toggle.title = action;
                  toggle.innerHTML = show ? '<i data-lucide="eye-off" aria-hidden="true"></i>' : '<i data-lucide="eye" aria-hidden="true"></i>';
                  window.lucide?.createIcons();
                });
              }
              window.lucide?.createIcons();
              document.getElementById('backup-password').focus();
            },
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
          Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog", title: 'Download started', text: 'Open your browser’s Downloads list and look for health_intel_backup_*.zip. Save a copy in approved storage outside the server and keep its password separately.', icon: 'success' });
        } catch (error) {
          Swal.fire({showCloseButton:true, closeButtonAriaLabel:"Close dialog", title: 'Backup failed', text: error.message, icon: 'error' });
        } finally {
          button.disabled = false;
        }
      }

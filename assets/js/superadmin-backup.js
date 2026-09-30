// Superadmin encrypted backup dialog and download.
// Classic script: load through superadmin.html; cross-feature functions share its page scope.
      async function backupDB() {
        const button = document.getElementById('backup-download-button');
        if (button.disabled) return;
        button.disabled = true;
        try {
          const result = await Swal.fire({
            title: 'Database Backup',
            html: '<p>Choose a password of 12-128 characters. Keep it to open the encrypted ZIP.</p>' +
              '<input id="backup-password" type="password" class="swal2-input" placeholder="Backup password" autocomplete="new-password">' +
              '<input id="backup-password-confirm" type="password" class="swal2-input" placeholder="Confirm password" autocomplete="new-password">',
            showCancelButton: true, confirmButtonText: 'Create backup',
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
          Swal.fire({ title: 'Download started', text: 'Keep your backup password to open the encrypted ZIP.', icon: 'success' });
        } catch (error) {
          Swal.fire({ title: 'Backup failed', text: error.message, icon: 'error' });
        } finally {
          button.disabled = false;
        }
      }

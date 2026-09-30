// Forgot-password requests and one-time-code password reset.
// Classic script: load through index.html; cross-feature functions share its page scope.
      // --- OTP PASSWORD RESET LOGIC ---
      if(document.getElementById("reset-screen")) {
          document.getElementById("reset-screen").addEventListener("submit", async function (e) {
              e.preventDefault();
              const otp_code = document.getElementById('reset_otp').value;
              const new_pass = document.getElementById('reset_new_password').value;
              const confirm_pass = document.getElementById('reset_confirm_password').value;
              const resetEmail = window.resetEmailCache;

              if(new_pass !== confirm_pass) {
                  return Swal.fire({icon: 'error', title: 'Error', text: 'Passwords do not match!'});
              }
              if(new_pass.length < 8 || new TextEncoder().encode(new_pass).length > 72) {
                  return Swal.fire({icon:'error',title:'Check password',text:'Use at least 8 characters and no more than 72 UTF-8 bytes.'});
              }

              Swal.fire({title: 'Verifying Code...', allowOutsideClick: false});
              Swal.showLoading();

              try {
                  const res = await fetch("http://localhost:3000/api/reset-password", {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ email: resetEmail, token: otp_code, new_password: new_pass })
                  });
                  const data = await res.json();
                  if(data.success) {
                      Swal.fire({icon: 'success', title: 'Success', text: 'Password reset successfully! You can now log in.'}).then(() => {
                          document.getElementById("reset-screen").reset();
                          toggleForms('login');
                      });
                  } else {
                      Swal.fire({icon: 'error', title: 'Error', text: data.error});
                  }
              } catch(err) {
                  Swal.fire({icon: 'error', title: 'Reset unavailable', text: err.message || 'Please try again later.'});
              }
          });
      }

      document.getElementById("forgot-pass-btn").addEventListener("click", async (e) => {
          e.preventDefault();
          const { value: email } = await Swal.fire({
              title: "Reset Password",
              input: "email",
              inputLabel: "Enter your registered email address",
              inputPlaceholder: "example@gmail.com",
              showCancelButton: true
          });
          if (email) {
              window.resetEmailCache = email; // store for later
              Swal.fire({title: 'Sending Code...', allowOutsideClick: false});
              Swal.showLoading();
              try {
                  const res = await fetch("http://localhost:3000/api/forgot-password", {
                      method: "POST", headers: {"Content-Type": "application/json"},
                      body: JSON.stringify({ email })
                  });
                  const data = await res.json();
                  if(data.success) {
                      Swal.close();
                      toggleForms("reset");
                      Swal.fire({icon:'info',title:'Check your inbox',text:data.message});
                  }
                  else Swal.fire("Error", data.error, "error");
              } catch(e) {
                  Swal.fire("Reset unavailable", e.message || "Please try again later.", "error");
              }
          }
      });

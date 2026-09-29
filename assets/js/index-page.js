
      lucide.createIcons();

      const firebaseConfig = {
        apiKey: "AIzaSyA0oMqNoeAhihnrC82_BCYitEyM7xecDIE",
        authDomain: "health-intel-2a0ed.firebaseapp.com",
        projectId: "health-intel-2a0ed",
        storageBucket: "health-intel-2a0ed.firebasestorage.app",
        messagingSenderId: "568295909990",
        appId: "1:568295909990:web:7852352967a13e5ac01ba7",
      };
      firebase.initializeApp(firebaseConfig);
      const auth = firebase.auth();

      
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
      // --- SHOW/HIDE PASSWORD ---
      function togglePasswordVisibility() {
        const pwdInput = document.getElementById('login_password');
        const eyeIcon = document.getElementById('togglePassword');
        
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
          eyeIcon.setAttribute('data-lucide', 'eye-off');
        } else {
          pwdInput.type = 'password';
          eyeIcon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons(); // Re-render the icon
      }

      // --- REMEMBER ME LOGIC (On Load) ---
      document.addEventListener('DOMContentLoaded', () => {
        const savedId = localStorage.getItem('remembered_system_id');
        if (savedId) {
          document.getElementById('login_id').value = savedId;
          document.getElementById('remember_me').checked = true;
        } else {
          document.getElementById('remember_me').checked = false;
        }
      });

      function toggleForms(target) {
        document.querySelector('.split-layout').classList.toggle('profile-layout', target === 'profile');
        document.getElementById("login-form").classList.add("hidden");
        document.getElementById("gateway-screen").classList.add("hidden");
        document.getElementById("profile-screen").classList.add("hidden");
        if(document.getElementById("reset-screen")) document.getElementById("reset-screen").classList.add("hidden");
        const subtitle = document.getElementById("form-subtitle");

        if (target === "gateway") {
          document.getElementById("gateway-screen").classList.remove("hidden");
          subtitle.innerText = "Step 1: Verification";
        } else if (target === "profile") {
          document.getElementById("profile-screen").classList.remove("hidden");
          subtitle.innerText = "Step 2: Profile";
        } else if (target === "reset") {
          if(document.getElementById("reset-screen")) document.getElementById("reset-screen").classList.remove("hidden");
          subtitle.innerText = "Secure Password Reset";
        } else {
          document.getElementById("login-form").classList.remove("hidden");
          subtitle.innerText = "Welcome back";
        }
      }

      const privacyCheckbox = document.getElementById("privacy-checkbox");
      const googleBtn = document.getElementById("btn-google-login");
      let userEmail = "";

      privacyCheckbox.addEventListener("change", function () {
        if (this.checked) {
          googleBtn.disabled = false;
          googleBtn.style.opacity = "1";
          googleBtn.style.cursor = "pointer";
        } else {
          googleBtn.disabled = true;
          googleBtn.style.opacity = "0.5";
          googleBtn.style.cursor = "not-allowed";
        }
      });

      googleBtn.addEventListener("click", function (e) {
        e.preventDefault();
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        auth.signInWithPopup(provider).then(async (result) => {
            const user = result.user;
            userEmail = user.email;

            // CHECK IF EMAIL IS ALREADY REGISTERED
            try {
              const checkRes = await fetch("http://localhost:3000/api/check-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: userEmail, firebase_id_token: await user.getIdToken() })
              });
              const checkData = await checkRes.json();
              if(!checkRes.ok) throw new Error(checkData.error || 'Google verification could not be completed.');
              if (checkData.exists) {
                Swal.fire({
                  icon: "warning",
                  title: "Email Already Registered",
                  text: 'This email is already registered. Sign in with your official System ID or contact the administrator.',
                  confirmButtonColor: "#0ea5e9"
                });
                toggleForms("login");
                return;
              }
            } catch (err) {
              userEmail='';
              Swal.fire({icon:'error',title:'Verification unavailable',text:err.message || 'Sign in with Google again and retry.'});
              return;
            }

            document.getElementById("verified-email-text").innerText = userEmail;
            if (user.displayName) {
              const names = user.displayName.split(" ");
              document.getElementById("reg_first").value = names[0];
              document.getElementById("reg_last").value = names[names.length - 1] || "";
            }
            toggleForms("profile");
          }).catch((error) => {
            Swal.fire({ icon: "error", title: "Authentication Failed", text: "Google Sign-In failed." });
          });
      });

      document.getElementById("reg_role").addEventListener("change", async function() {
          const selectedRole = this.value;
          const systemIdInput = document.getElementById("reg_system_id");
          const brgyGroup = document.getElementById("barangay-group");
          const brgySelect = document.getElementById("reg_barangay");
          
          if (selectedRole === 'bhw') {
              brgyGroup.style.display = 'block';
              brgySelect.setAttribute('required', 'true');
          } else {
              brgyGroup.style.display = 'none';
              brgySelect.removeAttribute('required');
              brgySelect.value = "";
          }
          
          systemIdInput.value = "Generating...";
          try {
              const response = await fetch("http://localhost:3000/api/get-next-id", {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: selectedRole })
              });
              const data = await response.json();
              if (data.success) systemIdInput.value = data.next_id; 
              else systemIdInput.value = "Error";
          } catch (error) { systemIdInput.value = "Server offline"; }
      });

      
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

      

      document.getElementById("login-form").addEventListener("submit", async function (e) {
          e.preventDefault();
          const systemId = document.getElementById("login_id").value.trim().toUpperCase();
          const password = document.getElementById("login_password").value;

          try {
            const response = await fetch("http://localhost:3000/api/login", {
              method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system_id: systemId, password: password }),
            });
            const result = await response.json();

            if (result.success) {
              localStorage.setItem("health_intel_token", result.token);
              localStorage.setItem("active_user_id", result.system_id);
              
              // REMEMBER ME LOGIC (On Login)
              if (document.getElementById('remember_me').checked) {
                  localStorage.setItem('remembered_system_id', systemId);
              } else {
                  localStorage.removeItem('remembered_system_id');
              }
              
              Swal.fire({ icon: "success", title: "Login Successful", text: "Routing to dashboard...", timer: 1500, showConfirmButton: false })
              .then(() => { window.location.href = result.redirect; });
            } else {
              Swal.fire({ icon: "error", title: "Login Failed", text: result.error });
            }
          } catch (error) {
            Swal.fire({ icon: "error", title: "Connection Error", text: "Could not connect to the server." });
          }
        });

      document.getElementById("profile-screen").addEventListener("submit", async function (e) {
          e.preventDefault();
          
          const generatedId = document.getElementById("reg_system_id").value;
          if (!generatedId || generatedId === "Generating..." || generatedId === "Error generating ID") {
            Swal.fire({
              icon: "warning",
              title: "Invalid ID",
              text: "Please select a valid role to generate your System ID.",
            });
            return;
          }

          const payload = {
            system_id: generatedId,
            first_name: document.getElementById("reg_first").value.trim(),
            last_name: document.getElementById("reg_last").value.trim(),
            employee_id: document.getElementById("reg_emp_id").value.trim(),
            role: document.getElementById("reg_role").value,
            password: document.getElementById("reg_password").value,
            email: userEmail,
            assigned_barangay: document.getElementById("reg_barangay").value
          };

          try {
            if(!auth.currentUser || auth.currentUser.email?.toLowerCase()!==userEmail.toLowerCase() || !userEmail) throw new Error('Sign in with Google again before registering.');
            payload.firebase_id_token=await auth.currentUser.getIdToken(true);
            const response = await fetch("http://localhost:3000/api/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (result.success) {
              Swal.fire({
                icon: "success",
                title: "Registration Received",
                text: `Your profile is under review. Your official ID is ${result.system_id}. An approval email will be sent when your account is approved.`,
                confirmButtonColor: "var(--teal)",
              }).then(() => {
                document.getElementById("profile-screen").reset();
                document.getElementById("verified-email-text").innerText = "Waiting...";
                userEmail = "";
                toggleForms("login");
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Registration Failed",
                text: result.error,
              });
            }
          } catch (error) {
            Swal.fire({
              icon: "error",
              title: "Connection Error",
              text: error.message || "Cannot connect to server.",
            });
          }
        });

      function showTerms(e) {
        e.preventDefault();
        Swal.fire({
          title: "Terms & Privacy",
          html: `
            <div class="access-terms-body">
              <h4 class="access-terms-heading">Academic prototype</h4>
              <p class="access-space-bottom-12">Health-Intel is a capstone project, not an official LGU privacy notice or proof of legal compliance.</p>
              <p class="access-space-bottom-12">Authorized health workers encode cases; the MHO reviews summaries and reports; the Admin oversees records and accounts; and the Superadmin maintains system backups. Use health information only for approved project work and through authorized procedures.</p>
              <p class="access-space-bottom-15">The responsible LGU and project team need to review how existing real records are handled and provide a complete privacy notice before operational use. It should identify who controls the data, contact details, purposes, lawful basis, recipients, retention, and how people can exercise their rights.</p>
              
              <h4 class="access-terms-heading">System Credits & Recognitions</h4>
              <p class="access-space-bottom-15">This system is built as a Capstone Project to digitalize and enhance community health monitoring. We recognize and extend our gratitude to our LGU partners, Capstone Advisers, and the local Barangay Health Centers for their cooperation.</p>
              <p class="access-space-bottom-0">Powered by open-source technologies: <strong>Tailwind CSS, Leaflet.js, Chart.js, and SweetAlert2</strong>.</p>
            </div>
          `,
          width: '600px',
          confirmButtonText: "I Understand",
          confirmButtonColor: "#0ea5e9",
          customClass: {
            popup: 'rounded-xl shadow-2xl',
            title: 'text-xl font-bold border-b pb-3 mb-3'
          }
        });
      }
    
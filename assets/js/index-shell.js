// Access-page screens, remembered ID, password visibility and terms dialog.
// Classic script: load through index.html; cross-feature functions share its page scope.
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

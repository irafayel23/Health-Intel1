// Google verification, role/ID choices and profile registration.
// Classic script: load through index.html; cross-feature functions share its page scope.
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

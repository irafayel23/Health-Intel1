// Account login, session storage and role redirect.
// Classic script: load through index.html; cross-feature functions share its page scope.
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

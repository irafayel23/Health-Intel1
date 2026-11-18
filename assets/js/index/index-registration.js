// Google verification, role/ID choices and profile registration.
// Classic script: load through index.html; cross-feature functions share its page scope.
      const privacyCheckbox = document.getElementById("privacy-checkbox");
      const googleBtn = document.getElementById("btn-google-login");
      let userEmail = "";
      let googleVerificationPending = false;

      privacyCheckbox.addEventListener("change", function () {
        if (this.checked && !googleVerificationPending) {
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
        if (googleVerificationPending || !privacyCheckbox.checked) return;
        googleVerificationPending = true;
        googleBtn.disabled = true;
        googleBtn.setAttribute('aria-busy', 'true');
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
                const notices = {
                  pending: ['Application awaiting approval', 'Your registration request has been submitted and is still being reviewed. You can sign in only after approval. If rejected, you can register again with this Google account.'],
                  approved: ['Account already approved', 'This Google account belongs to an approved account. Sign in with your official System ID.'],
                  suspended: ['Account access suspended', 'Contact the administrator to review your account access. Creating another registration will not restore access.']
                };
                const [title, text] = notices[checkData.registration_status] || ['Existing application or account', 'Contact the administrator to check your registration status.'];
                Swal.fire({icon: 'info', title, text, confirmButtonColor: '#007f84'});
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
            const messages = {
              'auth/popup-blocked': 'Your browser blocked the Google window. Allow popups for this site, then try again.',
              'auth/popup-closed-by-user': 'The Google window closed before verification finished. Try again and complete the sign-in.',
              'auth/cancelled-popup-request': 'Another Google sign-in is already open. Complete it, or close it and try again.',
              'auth/unauthorized-domain': 'This website address is not authorized in Firebase. Ask the project administrator to add this domain.',
              'auth/operation-not-allowed': 'Google sign-in is not enabled for this project. Contact the project administrator.',
              'auth/network-request-failed': 'Google could not be reached. Check your connection and try again.'
            };
            const code = /^auth\/[a-z-]+$/.test(error?.code || '') ? error.code : '';
            Swal.fire({ icon: 'error', title: 'Authentication Failed', text: messages[code] || `Google verification could not finish${code ? ` (${code})` : ''}. Try again or contact the project administrator.` });
          }).finally(() => {
            googleVerificationPending = false;
            googleBtn.disabled = !privacyCheckbox.checked;
            googleBtn.removeAttribute('aria-busy');
          });
      });

      document.getElementById("reg_role").addEventListener("change", function() {
          const selectedRole = this.value;
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
      });



      document.getElementById("profile-screen").addEventListener("submit", async function (e) {
          e.preventDefault();

          if(document.getElementById('reg_password').value!==document.getElementById('reg_confirm_password').value){Swal.fire({icon:'warning',title:'Passwords do not match',text:'Enter the same new password in both fields.'});return;}
          const payload = {
            confirm_password: document.getElementById('reg_confirm_password').value,
            review_consent: document.getElementById('reg_review_consent').checked,
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
            payload.employee_photo=await registrationPhotoData('employee');payload.selfie_photo=await registrationPhotoData('selfie');
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
                text: `Your profile is under review. Your official ID is ${result.system_id}. You will be notified of the review decision when email delivery is available.`,
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

function registrationPhotoData(kind){const file=document.getElementById('reg_'+kind+'_photo').files[0];if(!file||!['image/jpeg','image/png'].includes(file.type)||file.size>3*1024*1024)throw Error('Choose a JPG or PNG photo up to 3 MB for both ID and selfie.');return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Photo could not be read.'));reader.readAsDataURL(file);});}
const registrationPreviewUrls={};
function registrationPreview(kind){const input=document.getElementById('reg_'+kind+'_photo'),preview=document.getElementById('reg_'+kind+'_preview');if(registrationPreviewUrls[kind])URL.revokeObjectURL(registrationPreviewUrls[kind]);preview.hidden=true;if(input.files[0]){registrationPreviewUrls[kind]=URL.createObjectURL(input.files[0]);preview.src=registrationPreviewUrls[kind];preview.hidden=false;}}
for(const kind of ['employee','selfie'])document.getElementById('reg_'+kind+'_photo').addEventListener('change',()=>registrationPreview(kind));
document.getElementById('profile-screen').addEventListener('reset',()=>{for(const kind of ['employee','selfie']){if(registrationPreviewUrls[kind])URL.revokeObjectURL(registrationPreviewUrls[kind]);document.getElementById('reg_'+kind+'_preview').hidden=true;}});
document.querySelectorAll('[data-registration-password]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.registrationPassword),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',(show?'Hide ':'Show ')+(input.id==='reg_password'?'password':'confirm password'));}));
document.querySelectorAll('[data-registration-camera]').forEach(button=>button.addEventListener('click',async()=>{let stream;const kind=button.dataset.registrationCamera;try{await Swal.fire({titleText:kind==='employee'?'Photograph employee ID':'Take a selfie',html:'<video id="registration-camera" class="registration-camera-video" autoplay playsinline muted></video><p>Keep the image clear and well lit.</p>',showCancelButton:true,confirmButtonText:'Use photo',cancelButtonText:'Cancel',didOpen:async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:kind==='employee'?'environment':'user'},audio:false});const video=document.getElementById('registration-camera');if(!video){stream.getTracks().forEach(t=>t.stop());return;}video.srcObject=stream;}catch{Swal.showValidationMessage('Camera unavailable. Allow camera access or upload a photo instead.');}},preConfirm:async()=>{const video=document.getElementById('registration-camera');if(!video?.videoWidth){Swal.showValidationMessage('Wait for the camera, or cancel and upload a photo.');return false;}const canvas=document.createElement('canvas');const ratio=Math.min(1,1600/video.videoWidth,1600/video.videoHeight);canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(!blob)throw Error('Photo capture failed.');const files=new DataTransfer();files.items.add(new File([blob],kind+'.jpg',{type:'image/jpeg'}));document.getElementById('reg_'+kind+'_photo').files=files.files;registrationPreview(kind);return true;},willClose:()=>stream?.getTracks().forEach(t=>t.stop())});}catch{Swal.fire({icon:'error',title:'Photo unavailable',text:'Please use Upload photo instead.'});}finally{stream?.getTracks().forEach(t=>t.stop());}}));

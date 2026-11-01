# Original Azure VM size restored — 19 October 2026

The user postponed beta testing and explicitly approved returning HEALTH-INTEL to its original VM size to conserve Azure credit.

Azure Portal initially showed Standard_B2als_v2 (2 vCPUs, 4 GiB RAM). The Size blade offered Standard_B2ats_v2 (2 vCPUs, 1 GiB RAM). The resize was submitted through that blade and Azure reported: Successfully resized virtual machine health-intel-vm to Standard_B2ats_v2.

After refreshing the Overview blade, Azure showed Running and Standard B2ats v2 (2 vCPUs, 1 GiB memory). The public HTTPS /healthz endpoint returned status ok in both the browser and a separate PowerShell HTTPS request after the resize. SSH guest-memory/service inspection could not be completed; do not claim those guest checks passed.

This task changed the VM size only. No application release, database import, permissions, firewall or network configuration changes were performed. The resize restarted the VM as described by Azure. The previous temporary-upgrade reminder had already been delivered and deleted.

Private screenshot evidence: analysis/ram-downgrade-20261019/azure-1gb-confirmed.png. Return to 4 GiB for rescheduled beta testing only when authorized.

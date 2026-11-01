# Temporary Azure VM memory upgrade — 18 October 2026

The user requested the proposed temporary upgrade for beta testing and a reminder around 9–10 PM Philippine time. The existing HEALTH-INTEL VM was resized from Standard_B2ats_v2 (2 vCPUs, 1 GiB RAM) to Standard_B2als_v2 (2 vCPUs, 4 GiB RAM). The Azure subscription was not upgraded or replaced.

A fresh encrypted PC backup completed at 08:11 Philippine time before the resize; its saved archive and SHA-256 were verified. Azure's normal Size blade failed with `Content SpecPickerV3.ReactView` / `ReactView frame failed to load`. The resize was completed through the existing signed-in Azure account's ephemeral Bash Cloud Shell, using no storage account. The VM-specific resize-options command first confirmed 4096 MB and two vCPUs were available. The resize command returned provisioning state Succeeded.

Independent SSH checks at approximately 08:17 Philippine time confirmed that the running guest reports Standard_B2als_v2, a changed boot ID, approximately 3.77 GiB guest-visible memory and approximately 2.90 GiB available memory. HEALTH-INTEL, MySQL and Caddy were active; public HTTPS health was healthy. All 19 post-restart BHW/MHO asset, session, scope, follow-up and logout checks passed with no patient writes. No application code, patient data or firewall rules were changed by this resize task.

Microsoft's public East Asia Linux Virtual Machines Basv2 consumption rate at the time of lookup was USD 0.0526/hour for B2als_v2, or USD 1.2624 for 24 running hours of compute. This is a public rate estimate, not an account-specific invoice. Subscription benefits, available credit, storage and other existing services are separate. No reservation or long-term purchase was made.

A one-time reminder is active in this chat for **21:00 on 18 October 2026, Asia/Manila**, to review the temporary upgrade and decide whether to resize back after beta testing. The PC and Codex must be available. It does not automatically resize or restart the VM; higher-size billing continues until an actual resize back. The reminder is instructed to remove itself after delivery.

Private execution evidence is retained in `analysis/ram-upgrade-20261018/` and excluded from Git publication. Earlier beta-preparation measurements were made on the original 1 GiB VM; they are not benchmark results for this new size.

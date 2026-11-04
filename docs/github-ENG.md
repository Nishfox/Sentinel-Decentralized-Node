---
title: Publishing on GitHub
---
# Publishing the showcase on GitHub

[English](github-ENG.md) · [Italiano](github.md)

Prepare a repository containing distributable source files and review its contents. Exclude personal configurations, private sites, runtime data, backups, AI conversations, private keys, certificates and node identities. Choose a license and review third-party terms before distributing an installer.

The showcase is in `docs/index.html`. In repository Pages settings, choose the published branch and `/docs`. After publication, check the homepage, logo and guide links. Add the website URL to the repository description.

For the first release, attach the installer after clean-Windows testing and publish notes covering features, requirements and limitations. Update download links when a real release exists.

## Preparing a signed Windows release

Run `installer/Build-SignedRelease.ps1` on Windows with SignTool and a trusted code-signing certificate whose private key is available. Pass the thumbprint using `-CertificateThumbprint`. If SignTool is outside PATH, specify `-SignTool`. Use `-MachineStore` for a machine-store certificate.

The process verifies the signature and timestamp before creating the ZIP. Outputs are under `dist/signed-<version>`. Publish that ZIP and `SHA256SUMS.txt`. Keep a consistent signing identity and check download links after updating the websites.

## Documentation languages

GitHub displays the root `README.md` in English. Language links open static translated files, including `Leggimi.md` in Italian. A JavaScript dropdown works on the hosted HTML website rather than inside GitHub's README renderer. Browser translations depend on language support. Keep English documents available as static files.

**Created by Nishfox · 2026**

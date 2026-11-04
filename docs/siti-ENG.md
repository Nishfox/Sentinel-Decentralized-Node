---
title: Sites and publishing
---
# Sites, nodes and publishing

[English](siti-ENG.md) · [Italiano](siti.md)

Add a hosting project, open **Folder** and copy an existing website. Sentinel prepares a sample page for testing the server. Replace it with your own `index.html`. Community Edition provides hosting rather than a website editor. Select **Start** and **Preview**. File changes are served on subsequent requests.

Each project has a dedicated node. Use **Connect node**, complete **Authorize node** and grant Funnel capability in the Tailscale console if requested. Select **Publish** and copy the assigned URL from the card. Preserve the exact domain without adding `www.`. Public checks distinguish DNS, TLS and HTTP. Use mobile data for an independent network test.

**Remove from public** closes Funnel. **Stop** stops the project's server and node. Stop and unpublish before renaming the display title. The node identity stays associated with the project.

Export a backup before moving content. Restore creates a stopped project whose node needs fresh authorization. **Delete** requires the project name and creates a backup before removing the folder. Verify the archive before deleting important content.

## Tailscale from sign-in to publication

1. **PC setup.** The wizard finds or installs Tailscale. It reuses an existing connection or asks you to sign in through the official flow.
2. **Project node.** After checking the preview, select **Connect node**. If **Authorize node** appears, open the official link and authorize the dedicated node in the intended tailnet. The PC and the project node are separate devices. Repeat initial authorization for other projects when requested.
3. **Publication.** Select **Publish**. Complete HTTPS or Funnel approval in the tailnet console if needed, then retry. Contact the administrator if you lack permission.
4. **Verification.** Copy the actual HTTPS link without `www.`. Use **Verify HTTPS** and test on mobile data. Close Funnel with **Remove from public**.

For example, a portfolio and a documentation site can run on one PC with separate nodes. Publish one and keep the other local.

## Preparing a version

Place `index.html` at the project root and preserve image, CSS and script subfolders. If using a generator, complete the build first and copy its output. Test an internal page and an image in Preview.

Prepare updates separately from a live site. Copying files during publication may expose a mixture of versions. For significant updates, agree on a maintenance window and preserve the previous version.

## Three-person team example

Anna edits pages, Luca reviews the changes and Marta manages the hosting PC. Anna and Luca collaborate in a shared repository. Marta exports a backup, copies the approved build into the project folder, checks Preview and tests the public URL using mobile data.

The repository handles file collaboration. The Sentinel administrator account manages hosting. Reviewers can inspect the published version as visitors or run the same build locally before release.

## Locating publication failures

| Result | Next check |
| --- | --- |
| Preview unavailable | Project running state and expected files |
| Preview works, public DNS fails | Copied URL against the project card and Funnel status |
| DNS works, HTTPS fails | Verify HTTPS to distinguish TLS from HTTP |
| Page works, images missing | Paths, filenames and copied build content |

**Created by Nishfox · 2026**

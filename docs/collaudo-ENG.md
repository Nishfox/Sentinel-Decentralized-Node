---
title: Testing and limitations
---
# Testing and limitations

[English](collaudo-ENG.md) · [Italiano](collaudo.md)

The retained test log records 24 passes. A later run recorded 24 passes, 9 failures and 1 skip, including loopback access failures. The isolated stress test completed 30,000 HTTP 200 requests with 64 clients across six temporary sites in 53.23 seconds, with p95 latency of 132.37 ms. It verified 192 MiB using SHA-256, blocked 600 invalid requests, completed 40 stop/start cycles, observed 50 file updates and restored six sites.

Run `npm test` for the automated suite. Run `node scripts/stress-audit.js` for local-loopback load testing with temporary fixtures. Results depend on hardware and local load.

The user subsequently reported successful installation on a second PC after an initial error still awaiting review. Public HTTPS 200 responses were observed for two project nodes. Independent full installation, reboot and uninstall assessment remains outstanding. Volumetric DDoS protection was outside the test scope. Interface translations are partial. A saved Kuma audit reported 8 high-severity findings and needs review before distribution.

## Clean Windows laptop checklist

| Step | Expected result |
| --- | --- |
| Install base edition | Wizard completes and Start shortcut appears |
| Open launcher | Dashboard responds at the displayed address |
| Sign in | Wizard credentials work |
| Host a test page and image | Preview serves both |
| Authorize node and publish | Exact URL works from a phone on mobile data |
| Restart Windows | Record restarted services and confirm saved projects |
| Export and restore backup | Restored project contains expected files |
| Uninstall after saving data | Record the result and remaining data |

In a second test, select optional components. Verify a Qwen chat response, Glances metrics, a working Kuma monitor and CrowdSec status. Record each separately.

## Recording results

Record Sentinel version, Windows version, step, expected result, actual result and message. For example: “Local preview passed. Public HTTPS failed on mobile data with a DNS error. Dashboard verification still pending.” Mark unavailable tests as **not tested**.

Installer compilation checks that packaging succeeds. A laptop test checks installation, first launch and uninstall behavior. Loopback load results describe the local server. Public capacity also depends on connectivity and Funnel.

**Created by Nishfox · 2026**

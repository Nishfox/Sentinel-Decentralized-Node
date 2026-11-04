---
title: Security, monitoring and AI
---
# Security, monitoring and AI

[English](sicurezza-ai-ENG.md) · [Italiano](sicurezza-ai.md)

Configure the account through **Access and IAM** over HTTPS. It protects the dashboard, administrative APIs and backups. Visitors access published website content directly.

The HTTP filter limits request rate, concurrency, methods and body size and protects hidden files and paths outside the site root. Quarantines apply per site. CrowdSec can supply decisions to the HTTP filter. Windows Firewall and VPN information is diagnostic. Create an integrity baseline in **Security Center** to track file changes and review differences before updating it.

In **Resources and availability**, inspect Glances metrics and open Uptime Kuma. Select SQLite, create your Kuma account and add monitors. The saved Kuma dependency audit contains findings that require review before a release.

**AI Analysis** generates an exportable report. **AI Chat** answers questions about site state, URLs, ports and diagnosis using current data and relevant code excerpts. Check suggestions against the evidence.

Autopilot starts disabled. Once enabled, it checks every five minutes while Sentinel is running and can re-enable disabled HTTP filters on public sites after verifying current conditions. Review the log and use **Undo intervention** when available. Deterministic quarantines operate independently of AI.

## Choosing a check

| Question | Where to look |
| --- | --- |
| Who can administer Sentinel? | Access and IAM |
| Which requests are blocked? | Security Center, project logs, HTTP filters and quarantines |
| Does the site respond regularly? | Resources and availability and configured Kuma monitors |
| Does PC load coincide with slow responses? | Glances metrics and response times from the same interval |
| Why did publication fail? | Verify HTTPS, project logs, then AI Chat |

## Team monitoring example

Marta configures a Kuma monitor for the local preview and a second monitor for the public HTTPS URL. If both fail, check the project and server first. If only Preview works, check node, Funnel and DNS. Mobile data tests the visitor path separately from the hosting PC.

## Analysis example

After an increase in blocked requests, record the project, time and triggering rule. Ask AI Chat: “For the Studio project, what do blocked-request logs show and what checks can I run?” Compare the answer with the logs before acting. If Autopilot is enabled, review its recorded action. An increase in HTTP blocks alone does not establish a DDoS attack.

**Created by Nishfox · 2026**

---
---
# Sicurezza, monitoraggio e AI

[English](sicurezza-ai-ENG.md) · [Italiano](sicurezza-ai.md)

Attiva l’account da **Accessi e IAM** su HTTPS. Protegge il pannello, le API amministrative e i backup. I visitatori dei siti pubblici accedono ai contenuti pubblicati direttamente.

Il filtro HTTP limita frequenza, concorrenza, metodi e dimensioni delle richieste e protegge file nascosti e percorsi esterni. Le quarantene operano per sito. CrowdSec può fornire decisioni al filtro HTTP. Windows Firewall e VPN sono mostrati a fini diagnostici. Per monitorare le modifiche ai file crea un riferimento di integrità in **Centro sicurezza**. Valuta le variazioni prima di aggiornare il riferimento.

In **Risorse e disponibilità** puoi consultare le metriche di Glances e aprire Uptime Kuma. In Kuma scegli SQLite, crea il tuo account e aggiungi i monitor. L’audit salvato di Kuma contiene segnalazioni da valutare prima di una release.

In **Analisi AI** puoi generare ed esportare un report. In **AI Chat** puoi chiedere lo stato di un sito, l’URL, le porte o una diagnosi. Le risposte attingono a dati correnti ed estratti pertinenti del codice. Verifica i suggerimenti rispetto alle evidenze.

Autopilot parte spento. Una volta attivato controlla ogni cinque minuti mentre Sentinel è acceso e può riattivare filtri HTTP spenti su siti pubblici dopo verifica. Consulta il registro e usa **Annulla intervento** quando disponibile. Le quarantene deterministiche sono indipendenti dall’AI.

## Scegliere il controllo giusto

| Domanda | Dove guardare |
| --- | --- |
| Chi può amministrare Sentinel? | **Accessi e IAM** per l’account amministratore |
| Quali richieste vengono bloccate? | **Centro sicurezza** e log del progetto per filtro HTTP e quarantene |
| Il sito risponde regolarmente? | **Risorse e disponibilità** e i monitor configurati in Uptime Kuma |
| Il sito è lento quando il PC è sotto carico? | Metriche Glances e tempi di risposta registrati nello stesso intervallo |
| Perché una pubblicazione è fallita? | Verifica HTTPS e log del progetto, poi **AI Chat** per interpretare gli esiti |

## Esempio di monitoraggio per un team

Marta configura in Kuma un monitor per l’anteprima locale e, dopo la pubblicazione, un secondo monitor per l’URL HTTPS. Se entrambi falliscono, controlla prima lo stato del progetto e del server. Se risponde solo l’anteprima, controlla nodo, Funnel e DNS. Una prova da rete mobile verifica il percorso di un visitatore indipendente dal PC che ospita Sentinel.

## Esempio di analisi e risposta

Dopo un aumento delle richieste bloccate, annota il progetto, l’ora e la regola che ha generato il blocco. In **AI Chat** puoi chiedere «Per il progetto Studio, cosa mostrano i log delle richieste bloccate e quali controlli posso fare?». Confronta la risposta con i log prima di intervenire. Se Autopilot è attivo, verifica nel registro quale azione ha eseguito. Un aumento dei blocchi HTTP, da solo, non basta a identificare un attacco DDoS.

---

**Creato da Nishfox · 2026**


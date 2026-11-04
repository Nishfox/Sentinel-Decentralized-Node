[English](README.md) · [Italiano](Leggimi.md)

# Sentinel Decentralized Node — Community Edition

Sentinel è un centro di controllo per ospitare e pubblicare più siti statici dal proprio PC Windows. Ogni progetto ha una cartella, un server locale e un nodo Tailscale dedicato. I file vengono serviti dal PC e puoi scegliere quando rendere ciascun sito pubblico.

**Windows · Self-hosted · Dashboard locale · AI opzionale**

[Apri il manuale illustrato](docs/manuale.html) · [Leggi il manuale su GitHub](docs/manuale.md)

## Ospita un sito esistente

1. Se usi l’installer Windows, configura l’account amministratore nel wizard.
2. Apri Sentinel dal collegamento o da `Avvia-Sentinel.bat`.
3. Seleziona **Nuovo sito / nodo** per aggiungere un progetto di hosting. Copia nella cartella i file HTML, CSS, JavaScript e le immagini del sito già realizzato. Sostituisci la pagina di esempio con il tuo index.html.
4. Premi **Avvia** e apri **Anteprima**.
5. Per la pubblicazione, collega e autorizza il nodo dedicato su Tailscale, poi premi **Pubblica**.
6. Apri l’indirizzo HTTPS riportato sulla scheda. Per verificare l’accesso esterno prova anche da un telefono su rete mobile.

## Funzionalità

| Area | Cosa puoi fare |
|---|---|
| Siti | Gestire cartelle, server, anteprime, log e nodi dedicati |
| Pubblicazione | Attivare HTTPS tramite Tailscale Funnel e verificare DNS, TLS e risposta HTTP |
| Infrastruttura | Distinguere server locale, filtro HTTP, connessione del nodo e stato pubblico |
| Sicurezza | Limitare richieste e concorrenza, bloccare file nascosti, applicare quarantene HTTP e verificare l’integrità SHA-256 |
| Monitoraggio | Consultare risorse e disponibilità, con integrazioni opzionali CrowdSec, Glances e Uptime Kuma |
| Backup | Esportare ZIP e ripristinare in nuovi progetti spenti |
| Accessi | Proteggere dashboard, API e backup con un account amministratore |
| AI | Consultare dati ed estratti del codice con Qwen locale e ricevere opzioni di chiarimento |
| Autopilot | Eseguire verifiche periodiche e riattivare filtri HTTP secondo regole limitate e registrate |
| Interfaccia | Scegliere il tema chiaro o scuro e la lingua dei menu principali |

## Guida nella dashboard

Sotto **Installazione e diagnostica**, il tag **Istruzioni** apre il manuale HTML illustrato nella dashboard. Il selettore traduce il testo nelle lingue supportate dal browser. Gli screenshot conservano la lingua originale.

Con **Esegui controllo**, Sentinel verifica nuovamente i componenti locali. Le righe si aggiornano una alla volta. Verde indica un controllo superato, giallo una verifica in sospeso e rosso un errore. Gli esiti del report salvato sono indicati separatamente.

## Lingue

La vetrina offre un selettore con **11 lingue** (Italiano, inglese, russo, francese, tedesco, cinese, spagnolo, arabo, hindi, singalese e tamil). Puoi scegliere la lingua dal menu appena apri il sito.

Il wizard chiede la lingua all'avvio. Le schermate standard sono disponibili in italiano, inglese, russo, francese, tedesco, spagnolo, arabo e tamil. I campi personalizzati di configurazione sono in italiano o inglese.

## Offline e online

Con i componenti già installati puoi servire siti in locale, creare backup e usare Qwen offline. Il download iniziale dei componenti e del modello richiede Internet. Per pubblicare servono un PC acceso e connesso, un account Tailscale e le autorizzazioni della tailnet.

## Installazione su Windows

Puoi avviare il wizard di Windows con un doppio clic oppure da PowerShell, con un comando unico o passo per passo. [Guida di installazione](docs/installazione.md).

Il wizard collega il PC a Tailscale se serve. Dalla dashboard colleghi e autorizzi il nodo dedicato al sito, poi premi **Pubblica**. La tailnet può chiedere di abilitare Funnel nella console Tailscale. [Procedura completa](docs/siti.md#tailscale-dal-primo-accesso-alla-pubblicazione).

Il pacchetto Windows attuale contiene un installer senza firma digitale. Windows può mostrare un avviso di SmartScreen. Verifica di aver scaricato il pacchetto dalla fonte ufficiale del progetto.

## Documentazione

- [Gestione dei siti e pubblicazione](docs/siti.md)
- [Sicurezza, monitoraggio e AI](docs/sicurezza-ai.md)
- [Collaudo e limiti](docs/collaudo.md)
- [Preparazione della pubblicazione su GitHub](docs/github.md)
- [Vetrina HTML](docs/index.html)
- [Componenti di terze parti](THIRD-PARTY.md)

## Autore ed edizioni

La Community Edition è distribuita con licenza MIT. La futura Enterprise Edition sarà proprietaria e avrà condizioni separate.

[Privacy](docs/privacy.md) · [Attribuzione](docs/attribuzione.md)


### Enterprise Edition · In sviluppo

Edizione proprietaria per team e organizzazioni. La prima fase è dedicata ai progetti condivisi tra PC, con sincronizzazione, permessi revocabili per utente e progetto, approvazione o pubblicazione diretta degli aggiornamenti, storico e ripristino.

Le estensioni previste includono SSO e 2FA aziendali, accesso tramite token, backup centralizzati, gestione container, terminale remoto, Web Studio, integrazione con VS Code e federazione tra sedi. Le priorità saranno definite in base alle esigenze dei primi clienti. [Catalogo completo delle funzionalità previste](docs/enterprise.md).

## Stato del progetto

Lo stress test registrato ha completato 30.000 richieste locali su sei siti temporanei. Una successiva esecuzione della suite ha registrato 24 test passati, 9 falliti e 1 saltato, con errori di accesso a loopback tra i fallimenti. La prova di pubblicazione di un nuovo nodo ha raggiunto la richiesta di login Tailscale. Il collaudo su Windows pulito e la verifica di quel nodo da rete mobile restano aperti.

La Community Edition serve siti statici. Backend applicativi, PostgreSQL e autenticazione a due fattori sono possibili estensioni. Le traduzioni sono parziali. I filtri operano sul traffico HTTP applicativo. L’inferenza AI è consultiva e può produrre errori.

---

**Creato da Nishfox · 2026**






---
---
# Collaudo e limiti

[English](collaudo-ENG.md) · [Italiano](collaudo.md)

Il log di collaudo conservato registra 24 test superati. Una successiva esecuzione ha registrato 24 passati, 9 falliti e 1 saltato, con errori di accesso a loopback tra i fallimenti. Lo stress test isolato ha completato 30.000 richieste HTTP 200 con 64 client su sei siti temporanei in 53,23 secondi, con latenza p95 di 132,37 ms. Ha verificato 192 MiB via SHA-256, bloccato 600 richieste non valide, completato 40 cicli di arresto e avvio, mostrato 50 aggiornamenti dei file e ripristinato sei siti.

Esegui `npm test` per la suite automatica. Esegui `node scripts/stress-audit.js` per ripetere il carico su loopback con fixture temporanee. Le misure dipendono dall’hardware e dal carico locale.

La prova reale ha confermato HTTP locale e ha raggiunto il login richiesto dal nuovo nodo. Restano da verificare la pubblicazione di quel nodo da rete mobile, l’installazione su Windows pulito, il riavvio e la disinstallazione. La mitigazione DDoS volumetrica esula dalle prove. Le traduzioni coprono parte dell’interfaccia. L’audit Kuma salvato riportava 8 segnalazioni elevate e richiede riesame prima della distribuzione.

## Prova su un portatile Windows pulito

| Passaggio | Risultato atteso |
| --- | --- |
| Installa la versione base | Il wizard termina e compare Sentinel Suite nel menu Start |
| Apri il launcher | La dashboard risponde all’indirizzo indicato |
| Accedi come amministratore | Le credenziali create nel wizard consentono l’accesso |
| Ospita una pagina di prova con un’immagine | L’anteprima serve entrambi i file |
| Autorizza il nodo e pubblica | L’URL effettivo risponde da un telefono con Wi-Fi spento |
| Riavvia Windows | Verifica quali servizi ripartono e che il progetto sia ancora presente |
| Esporta un backup e prova il ripristino | Il progetto ripristinato contiene i file attesi |
| Disinstalla dopo aver salvato i dati | Verifica il risultato della procedura e registra quali dati restano |

Su una seconda prova seleziona anche i componenti opzionali. Verifica una risposta di Qwen in **AI Chat**, le metriche in Glances, un monitor funzionante in Kuma e lo stato di CrowdSec in Sentinel. Registra ogni componente separatamente.

## Come registrare un risultato

Annota versione di Sentinel, versione di Windows, passaggio, risultato atteso, risultato effettivo ed eventuale messaggio. Esempio: «Anteprima locale riuscita, HTTPS pubblico non riuscito. Da rete mobile il browser mostra un errore DNS. Verifica HTTPS dalla scheda in attesa». Segna come **non provato** ciò che richiede ancora un account o un ambiente disponibile.

La compilazione dell’installer verifica che il pacchetto si possa costruire. Il test sul portatile verifica ciò che accade davvero durante installazione, primo avvio e disinstallazione. I risultati del carico su loopback descrivono il server nella prova locale, mentre la capacità pubblica dipende anche dalla connessione e dal percorso Funnel.

---

**Creato da Nishfox · 2026**


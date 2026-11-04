---
---
# Siti, nodi e pubblicazione

[English](siti-ENG.md) · [Italiano](siti.md)

Aggiungi un progetto di hosting dalla dashboard, apri **Cartella** e copia i file del sito che hai già realizzato. Sentinel prepara una pagina di esempio per verificare il server. Sostituiscila con il tuo index.html. La Community Edition non include un editor di siti. Usa **Avvia** e **Anteprima** per il controllo locale. Gli aggiornamenti ai file sono serviti alle richieste successive.

Ogni progetto ha un nodo dedicato. Seleziona **Collega nodo**, completa **Autorizza nodo** e concedi la capacità Funnel dalla console Tailscale se richiesta. Premi **Pubblica** e copia l’URL effettivo dalla scheda. Usa il dominio assegnato, senza aggiungere www. La verifica pubblica distingue DNS, TLS e risposta HTTP. Per un controllo indipendente prova da rete mobile.

**Rimuovi dal pubblico** chiude Funnel. **Arresta** ferma il server e il nodo del progetto. Per rinominare il titolo, arresta il sito e rimuovi la pubblicazione. L’identità del nodo resta associata al progetto.

Esporta un backup prima di spostare i contenuti. Il ripristino crea un nuovo progetto spento e il nodo richiede una nuova autorizzazione. **Elimina** richiede il nome del progetto e crea un backup prima di rimuovere la cartella. Verifica l’archivio prima di cancellare contenuti importanti.

## Tailscale, dal primo accesso alla pubblicazione

1. **Installazione del PC.** Il wizard cerca il client Tailscale e lo installa se manca. Se il PC è già collegato, riusa la sessione. Altrimenti accedi dal flusso ufficiale Tailscale.
2. **Nodo del progetto.** Dopo aver provato il sito in anteprima, premi **Collega nodo** nella sua scheda. Sentinel avvia il nodo dedicato. Se compare **Autorizza nodo**, apri il collegamento ufficiale e autorizza il nodo nella tailnet desiderata. Il login del PC e questa autorizzazione riguardano due dispositivi distinti nella tailnet. Ripeti la prima autorizzazione per gli altri progetti quando richiesta.
3. **Pubblicazione.** Premi **Pubblica** per configurare Funnel. Se Tailscale richiede di abilitare HTTPS o Funnel, completa il passaggio nella console della tailnet e riprova da Sentinel. Se ti mancano i permessi, rivolgiti al suo amministratore.
4. **Verifica.** Copia il link HTTPS effettivo dalla scheda senza aggiungere www. Usa **Verifica HTTPS** e prova da un telefono su rete mobile. Per chiudere Funnel, usa **Rimuovi dal pubblico**.

Per esempio, puoi avere un portfolio e un sito di documentazione sullo stesso PC. Ognuno ha il proprio nodo. Puoi pubblicare il portfolio e tenere la documentazione in anteprima locale.

## Preparare e verificare una versione

Per un sito statico, metti `index.html` nella radice del progetto e conserva le sottocartelle di immagini, fogli di stile e script. Se il tuo team usa un generatore, completa la build e copia i file risultanti. Da **Anteprima**, verifica anche una pagina interna e un’immagine prima di pubblicare.

Se il sito è già pubblico, prepara la nuova versione in una cartella separata. Durante la copia dei file, richieste diverse potrebbero leggere versioni diverse. Per aggiornamenti importanti, concorda una finestra di manutenzione e conserva una copia della versione precedente.

## Esempio con tre persone sullo stesso progetto

Anna modifica le pagine, Luca verifica le modifiche e Marta gestisce Sentinel sul PC che ospita il sito. Anna e Luca usano un repository condiviso per rivedere le modifiche. Marta prende la versione approvata, esporta un backup e copia i file finali nella cartella del progetto. Controlla **Anteprima**, poi verifica l’URL pubblico da rete mobile.

Il repository gestisce la collaborazione sui file. L’account amministratore di Sentinel serve a gestire l’hosting. I revisori possono controllare la versione pubblicata come visitatori. Per una revisione prima della pubblicazione, il team può eseguire la stessa build in locale.

## Capire dove si interrompe la pubblicazione

| Esito | Controllo successivo |
| --- | --- |
| Anteprima non disponibile | Verifica che il progetto sia avviato e che la cartella contenga i file attesi |
| Anteprima riuscita, DNS pubblico in errore | Confronta l’URL copiato con quello mostrato nella scheda e verifica lo stato di Funnel |
| DNS riuscito, HTTPS in errore | Usa **Verifica HTTPS** per distinguere il problema TLS da una risposta HTTP |
| La pagina si apre, ma mancano immagini | Controlla percorsi, nomi dei file e contenuto della versione copiata |

---

**Creato da Nishfox · 2026**


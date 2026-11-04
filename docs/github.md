---
---
# Pubblicare la vetrina su GitHub

[English](github-ENG.md) · [Italiano](github.md)

Prepara un repository con i sorgenti distribuibili e controlla il contenuto da pubblicare. Escludi configurazioni personali, siti privati, runtime, backup, conversazioni AI, chiavi, certificati e identità dei nodi. Scegli una licenza e verifica le condizioni dei componenti di terze parti prima di distribuire l’installer.

La vetrina è in `docs/index.html`. Nelle impostazioni Pages del repository seleziona il ramo pubblicato e la cartella `/docs` come sorgente. Dopo la pubblicazione, verifica la home, il logo e i collegamenti alle guide. Aggiungi il collegamento alla vetrina nella descrizione del repository.

Per la prima release allega l’installer dopo il collaudo su Windows pulito e pubblica note di versione con funzionalità, requisiti e limiti. Aggiorna i collegamenti al download quando esiste una release effettiva.

---


## Preparare una release Windows firmata

Esegui `installer/Build-SignedRelease.ps1` su Windows con SignTool e un certificato attendibile di firma del codice con chiave privata. Passa l’impronta con `-CertificateThumbprint` e, se SignTool è fuori dal PATH, il percorso con `-SignTool`. Usa `-MachineStore` se il certificato è nello store del computer.

La procedura verifica firma e marca temporale prima di creare lo ZIP. I risultati sono in `dist/signed-<versione>`. Per la release usa lo ZIP di quella cartella e il relativo file `SHA256SUMS.txt`. Mantieni la stessa identità di firma tra le release e verifica i link di download dopo aver aggiornato le vetrine.

**Creato da Nishfox · 2026**

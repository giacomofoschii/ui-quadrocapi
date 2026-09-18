# ⚜️ UI Quadro Capi

[![Live Demo](https://img.shields.io/badge/Live-Demo-success.svg)](https://ui-quadrocapi-pied.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Una Graphical User Interface (GUI) pensata per le Comunità Capi (Co.Ca.) AGESCI. Questo strumento nasce per facilitare e ottimizzare il delicato momento della stesura del **Quadro Capi**, rendendo il processo decisionale più chiaro, collaborativo ed efficiente.

🌍 **[Prova subito l'applicazione!](https://ui-quadrocapi-pied.vercel.app/)**

## ⛺ Il Progetto

La decisione del Quadro Capi per il nuovo anno scout è uno degli snodi centrali per la vita di una Co.Ca. Spesso ci si affida a post-it su lavagne, fogli volanti o fogli di calcolo che diventano rapidamente confusionari quando si cerca di incastrare disponibilità, iter formativi e necessità delle singole unità.

**UI Quadro Capi** digitalizza questa lavagna, offrendo un ambiente interattivo e **multigiocatore** per comporre gli staff in modo flessibile ed esplorare diversi scenari con un colpo d'occhio immediato, esattamente come se foste tutti attorno allo stesso tavolo.

## ✨ Funzionalità

- 📡 **Collaborazione in Tempo Reale**: Lavora sulla stessa lavagna contemporaneamente agli altri capi (in stile Figma o Miro). I movimenti dei cartellini, i disegni a mano libera e i cursori del mouse sono sincronizzati all'istante per tutti gli utenti connessi.
- 👤 **Accesso Google & Ospiti**: Accedi con il tuo account Google per mostrare il tuo nome e la tua foto, oppure entra senza registrazione: il sistema ti assegnerà automaticamente un simpatico nome in incognito (es. _Lupo Misterioso_, _Falco Anonimo_).
- 🔒 **Quadri Privati**: Crea un quadro protetto da ID e PIN condivisi, oppure entra in uno già esistente inserendo le stesse credenziali. Un pulsante "Copia invito" nella sidebar permette di condividere rapidamente il link di accesso con il resto della Co.Ca.
- 🖱️ **Composizione Staff Visuale**: Interfaccia **drag & drop** intuitiva per assegnare rapidamente i capi alle branche L/C, E/G e R/S.
- 📛 **Anagrafica e Formazione**: Visualizzazione chiara dei capi della Co.Ca. con il rispettivo iter formativo (Tirocinio, CFM, CFA) evidenziato tramite **badge**.
- 📑 **Lavagne Multiple**: Gestione di più "board" contemporaneamente (in stile fogli di calcolo Excel), perfette per elaborare e confrontare diverse opzioni di Quadro Capi (es. "Ipotesi A", "Ipotesi B").
- 💾 **Salvataggio flessibile**:
  - Sincronizzazione automatica e continua sul cloud durante l'utilizzo.
  - Integrazione con **Google Drive** (tramite Google Login) per salvare o caricare lo storico del lavoro direttamente sul tuo account.
  - Esportazione e importazione dati in formato JSON per salvataggi locali.
- 🖼️ **Export Immagine**: Esportazione immediata della board in formato `.png` per condividere al volo la bozza con il resto della Co.Ca.

## 🛠️ Tecnologie

- **Framework:** Next.js (App Router) / React
- **Styling:** Tailwind CSS
- **Multiplayer & Stato condiviso:** Liveblocks
- **Autenticazione:** NextAuth.js (Google Provider)
- **Cloud Storage:** Google Drive API REST
- **Hosting:** Vercel

## 🔑 Variabili d'ambiente

Per lo sviluppo locale, crea un file `.env.local` nella root del progetto con le seguenti chiavi:

```text
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...
LIVEBLOCKS_SECRET_KEY=...
```

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: credenziali OAuth per il login Google e l'integrazione con Google Drive.
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET`: configurazione di NextAuth.js.
- `LIVEBLOCKS_SECRET_KEY`: chiave segreta del progetto [Liveblocks](https://liveblocks.io/dashboard/apikeys) (deve iniziare con `sk_`), usata per creare/validare le sessioni dei quadri privati.

## 🐳 Docker

Il progetto usa due percorsi distinti:

- **Vercel** esegue il deploy direttamente dal codice sorgente quando viene fatto push su `main`.
- **GitHub Actions** costruisce e pubblica l'immagine Docker di produzione su GitHub Container Registry (GHCR) quando viene fatto push su `main`.

L'immagine pubblicata è disponibile come:

```text
ghcr.io/<account-github>/ui-quadrocapi:latest
```

Non è necessario eseguire Docker sul computer per attivare questi processi. È sufficiente fare push su `main`:

```bash
git push origin main
```

Per lo sviluppo locale con hot reload:

```bash
docker compose up --build
```

La configurazione Compose usa lo stage Docker `development`. Il Dockerfile usa invece uno stage production ottimizzato con Next.js standalone, che include solo i file e le dipendenze necessarie all'avvio dell'applicazione.

Per avviare localmente l'immagine di produzione pubblicata:

```bash
docker run --rm -p 3000:3000 ghcr.io/<account-github>/ui-quadrocapi:latest
```

Il package GHCR può essere impostato come pubblico dalle impostazioni del package su GitHub. Vercel, invece, non utilizza automaticamente l'immagine GHCR: costruisce il progetto separatamente dal repository.

## 🚀 Sviluppi Futuri (Work in Progress)

Il progetto è in continua evoluzione per rispondere sempre meglio alle esigenze delle Comunità Capi:

- ⚖️ **Validazione Vincoli Scout**: Controllo automatico (tramite warning visivi) per la verifica della **diarchia** negli staff e per assicurarsi che i requisiti di **formazione** (presenza di capi brevettati) siano rispettati.

## 🤝 Contribuire

Ogni contributo è prezioso! Se hai idee per nuove funzionalità o vuoi segnalare un bug:

- Apri una Issue nella repository.
- Se vuoi scrivere del codice, fai un fork del progetto e proponi una Pull Request.

## 📝 Licenza

Questo progetto è distribuito sotto licenza MIT. Sentiti libero di utilizzarlo e adattarlo alle esigenze della tua Comunità Capi.
Buona Caccia e Buon Cammino! 🎒

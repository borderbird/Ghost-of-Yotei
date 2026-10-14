# KI-Dienst für die Screenshot-Analyse

Ein kleiner Cloudflare Worker, der zwischen dem Konfigurator und der Claude-API sitzt.
Er hält den API-Key geheim, prüft den Zugangscode und baut die Prompts selbst aus der
Datenbasis (`../data/*.json`). Die Seite schickt nur das Bild bzw. den berechneten Build.

| Endpunkt | Eingabe | Ergebnis |
|---|---|---|
| `POST /api/extract` | Screenshot (Base64) | ausgelesene Ausrüstung als JSON |
| `POST /api/tips` | Klasse + Build-Bericht | Zusammenfassung, Stärken, Tipps, Vorbehalte |

Jede Anfrage braucht den Header `X-Access-Code`. Erlaubt sind nur Aufrufe von den Seiten in
`ALLOWED_ORIGINS` (`wrangler.toml`). Modell: Claude Opus 5.5, mit serverseitigem Fallback
auf das von Anthropic empfohlene Modell, falls eine Anfrage abgelehnt wird.

## Einrichten (einmalig, etwa 10 Minuten)

1. **Cloudflare-Konto** anlegen (kostenlos): <https://dash.cloudflare.com/sign-up>

2. **Im Terminal in diesen Ordner wechseln und Abhängigkeiten installieren:**

   ```bash
   cd worker
   npm install
   ```

3. **Bei Cloudflare anmelden** (öffnet den Browser):

   ```bash
   npx wrangler login
   ```

4. **Geheimnisse hinterlegen.** Der Befehl fragt nach dem Wert – der landet nur bei Cloudflare,
   nie im Repository:

   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

   ```bash
   npx wrangler secret put ACCESS_CODE
   ```

   Als Zugangscode etwas wählen, das nur ihr kennt (z. B. vier zufällige Wörter).

5. **Veröffentlichen:**

   ```bash
   npx wrangler deploy
   ```

   Am Ende steht die Adresse, etwa `https://ghost-yotei-legends-ki.<dein-name>.workers.dev`.

6. **Adresse in die Seite eintragen:** in `index.html` die Zeile
   `const AI_ENDPOINT = "";` mit der Adresse füllen, committen, pushen.
   (Zum Ausprobieren geht es auch ohne Commit: im Fenster „Screenshot analysieren“ unter
   „Erweitert“ die Adresse eintragen – das gilt dann nur für den eigenen Browser.)

7. **Ausgabelimit setzen:** in der Anthropic-Konsole unter *Limits* ein Monatslimit für
   den API-Key eintragen. Dann kann auch im schlimmsten Fall nicht mehr verbraucht werden.

## Kosten

Grob 5 bis 10 Cent fürs Auslesen eines Screenshots und 10 bis 15 Cent für eine Tipp-Runde.
Wiederholte Anfragen innerhalb weniger Minuten sind durch Prompt-Caching günstiger.
Cloudflare Workers sind im kostenlosen Tarif enthalten (100.000 Anfragen pro Tag).

## Wenn sich die Datenbasis ändert

Die Prompts werden beim Deploy aus `../data/*.json` gebaut. Nach Änderungen an den Daten
(neue Beispiel-Builds, korrigierte Werte) einmal neu veröffentlichen:

```bash
npx wrangler deploy
```

## Lokal testen

```bash
printf 'ANTHROPIC_API_KEY=sk-ant-…\nACCESS_CODE=test\n' > .dev.vars
npx wrangler dev --port 8787
```

`.dev.vars` steht in `.gitignore` und wird nicht committet. Im Konfigurator dann unter
„Erweitert“ `http://127.0.0.1:8787` eintragen (die Seite muss von `http://localhost:8765`
kommen, siehe `ALLOWED_ORIGINS`).

```bash
npm run check
```

prüft die Typen.

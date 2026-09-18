# Návod: Zprovoznění IoT Webové Aplikace na GitHubu a v Telefonu

Tato aplikace je zkompilovaná jako moderní PWA (Progressive Web Application). 
Nepotřebuje žádný placený server – běží zdarma přímo přes **GitHub Pages** (nebo Vercel).

---

## 1. Jak aplikaci vyexportovat z AI Studia

V pravém horním rohu Google AI Studio klikněte na menu **Export** (tlačítko se třemi tečkami nebo ikona stahování):
*   **Možnost A (Nejrychlejší):** Zvolte **"Export to GitHub"** – AI Studio samo vytvoří nový repozitář na vašem GitHub účtu (např. `muj-iot-controller`).
*   **Možnost B:** Zvolte **"Download as ZIP"** – stáhnete archiv s projektem do počítače a nahrajete ho do nového repozitáře na GitHubu.

---

## 2. Nastavení GitHub Pages (Hostování zdarma na internetu)

Aby vám aplikace běžela online na adrese typu `https://vase-jmeno.github.io/muj-iot-controller/`:

### Postup:
1. Otevřete váš repozitář na **GitHub.com**.
2. V horním menu repozitáře klikněte na **Settings** (Nastavení).
3. V levém sloupci zvolte záložku **Pages**.
4. V sekci **Build and deployment**:
   *   Pod **Source** vyberte: **GitHub Actions**.
   *   GitHub vám nabídne šablony. Vyberte šablonu **"Static HTML"** nebo **"Node.js with Vite"**.
   *   Pokud zvolíte GitHub Actions pro Vite, GitHub sám při každém uložení kód přeloží a publikuje.
5. Po dokončení deploymentu (obvykle 1–2 minuty) se v horní části stránky Pages objeví vaše živá URL adresa:
   👉 **`https://<vase-jmeno>.github.io/<nazev-repozitare>/`**

*(Alternativně: Pokud používáte Vercel, stačí se na vercel.com přihlásit přes GitHub, kliknout na "Import" vašeho repozitáře a za 20 sekund máte bleskovou adresu např. `muj-iot.vercel.app` bez jakéhokoliv dalšího nastavování).*

---

## 3. Propojení s mobilním telefonem (Nativní zástupce na ploše)

Až budete mít vaši GitHub URL adresu:

1. **Otevřete ji v telefonu:**
   *   V prohlížeči (Chrome na Androidu nebo Safari na iPhone) zadejte vaši GitHub adresu.
2. **Přidejte si aplikaci na plochu:**
   *   **Android (Chrome):** Klikněte na tři tečky vpravo nahoře ➔ zvolte **"Přidat na plochu"** (nebo "Nainstalovat aplikaci").
   *   **iPhone (Safari):** Klikněte na tlačítko Sdílet (čtvereček se šipkou nahoru) ➔ zvolte **"Přidat na plochu"**.
3. **Výsledek:**
   *   Aplikace se na ploše mobilu objeví s vlastní ikonou jako plnohodnotná mobilní aplikace.
   *   Po klepnutí se otevře na celou obrazovku bez adresního řádku prohlížeče.
   *   Rovnou se spojí přes šifrovaný MQTT broker s vaším ESP32.

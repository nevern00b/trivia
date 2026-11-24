# Ho Ho Ho's In This House

Brooklyn Christmas party trivia. Guests join from their phones, you run the show from the host page.

| Page | Who | Address |
|---|---|---|
| Player | Guests | the Wi-Fi link shown on your host page, like `http://192.168.1.23:3000/` |
| Host | You (needs your PIN) | `http://localhost:3000/host` on your laptop |
| TV | Optional, cast or plug a TV into your laptop | `http://localhost:3000/tv` |

## How a game goes

1. Open the **host** page and type your PIN. Guests scan the QR code (or open the link) and type their name.
2. Press **Release first question**. Everyone's phone shows it with a 20-second countdown.
3. Answers come in on your screen and are checked automatically (small typos are forgiven). Tap ✓ or ✗ to overrule.
4. Press **Reveal answer to everyone**, then **Release next question**.
5. After the last question of a round you get **Show leaderboard**. After round 3, **Show final results**.

If a guest's phone locks or they refresh, they come back as themselves with their points.

## Editing questions

Open the host page, go to the **Questions** tab, edit, and press **Save questions**.
Put several accepted answers with a `|` between them, like `Macy's|Macys`. The first one is what guests see on the reveal.
You can also paste a whole list at once (one `Question | Answer` per line, `# Round name` above each round).

Your saved questions are also kept in your host browser. If the free server restarts, they're put back the next
time you open the host page on the same device. For extra safety, press **Download backup file** and replace
`questions.json` in this folder with it.

## Running it on your laptop (the simple way)

Guests' phones must be on the **same Wi-Fi** as your laptop.

**One time, a day or two before**
1. Install Node.js from https://nodejs.org (click the big **LTS** button and run the installer).
2. Download this project: on GitHub, click the green **Code** button, then **Download ZIP**, and unzip it somewhere easy like your Desktop.
3. Pick your host PIN: open `host-pin.txt`, replace `brooklyn` with your own PIN, and save.
4. Do a test run (steps below) so the first-time setup happens while you're still online and calm.

**At the party**
1. Plug in your laptop.
2. Double-click **Start Trivia (Mac).command** or **Start Trivia (Windows).bat**.
   - Mac, first time: if it says it "can't be opened", right-click the file, choose **Open**, then **Open** again.
   - If your computer asks whether to allow incoming network connections, click **Allow** (on Windows, tick *Private networks*).
3. A black window opens and your host page opens in the browser. Type your PIN.
4. Guests scan the QR code on the host page (or the TV page) or type the link shown under it, like `192.168.1.23:3000`.
5. Keep the black window open the whole game. Closing it ends the game.

**Keeping the laptop awake:** on a Mac the start file does it for you while the game is running. On Windows go to
Settings → System → Power and set "When plugged in, put my device to sleep after" to **Never** for the party.
Either way, don't close the lid.

**If guests can't connect:** make sure they're on your home Wi-Fi, not a "guest" network or mobile data, since many
routers keep guest networks from reaching other devices.

**No double-click?** Open Terminal (Mac) or Command Prompt (Windows), type `cd ` and drag the folder into the window,
press Enter, then run `npm install` once and `npm start` each time.

## Hosting it online instead (optional)

1. On https://render.com sign in with GitHub, then **New → Blueprint**, pick this repository, and press **Apply**.
2. When it asks for `HOST_PIN`, type the PIN you want for the host page.
3. Wait about 3 minutes. Your link is shown at the top of the service page.

The free plan goes to sleep after 15 minutes with nobody on it, and takes about a minute to wake up.
Open the host page 5 minutes before the game. While the game is running, the pages keep it awake.

## Settings (optional)

- Host PIN: first line of `host-pin.txt`, or the `HOST_PIN` setting online. Default is `brooklyn`.
- `QUESTION_SECONDS`: countdown length. Default `20`.

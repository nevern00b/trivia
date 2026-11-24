# Ho Ho Ho's In This House

Brooklyn Christmas party trivia. Guests join from their phones, you run the show from the host page.

| Page | Who | Address |
|---|---|---|
| Player | Guests | `https://YOUR-APP.onrender.com/` |
| Host | You (needs your PIN) | `https://YOUR-APP.onrender.com/host` |
| TV | Optional, put it on a TV or laptop everyone can see | `https://YOUR-APP.onrender.com/tv` |

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

## Hosting it for free on Render

1. Put this folder in a GitHub repository (see the step-by-step guide shared with you).
2. On https://render.com sign in with GitHub, then **New → Blueprint**, pick the repository, and press **Apply**.
3. When it asks for `HOST_PIN`, type the PIN you want for the host page.
4. Wait about 3 minutes. Your link is shown at the top of the service page.

The free plan goes to sleep after 15 minutes with nobody on it, and takes about a minute to wake up.
Open the host page 5 minutes before the game. While the game is running, the pages keep it awake.

## Settings (optional, in Render under Environment)

- `HOST_PIN`: the host page PIN. Default is `brooklyn` if you don't set one.
- `QUESTION_SECONDS`: countdown length. Default `20`.

## Run it on your own computer (optional)

Install Node.js 18 or newer, then in this folder run `npm install` and `npm start`, and open http://localhost:3000/host.

# team-2
Vibe Jam 2026 – lag 2
Martin är bäst

## Survival Hub

Play it at https://vibe-jam-2026.github.io/team-2/. It's a single self-contained file, `index.html`, with no build step and no dependencies.

The hub is the main menu: an arcade lobby of tiny one-button survival games. Every game uses the same control: <kbd>Space</kbd>, click or tap. Each game is scored by how long you survive, and 60 seconds gives a perfect 100. The overall score is the average of your best runs, and "Play all games" runs them back to back and shows a results screen.

| # | Game | How it works |
|---|---|---|
| 1 | ✈️ Jet Escape | Tap to boost your jet. Dodge the incoming missiles and stay away from the sea and the top edge. |
| 2 | 🏒 Ice Brawl | The fighting game: a 1v1 hockey fight against a bot. When a red **!** appears over your opponent, tap to duck the punch and counter. Tapping at the wrong time makes you wobble and lose balance. Watch out for fakes and combos later on. |
| 3 | 🐿️ Slapshot Squirrels | Two-player artillery on its own page (`slapshot-squirrels.html`). Not part of the survival score. |
| 4 | 🥊 Ice Brawl Pro | The harder, skill-based Ice Brawl. A duck only lasts a split second, so tap just before the punch lands; the last 0.08s is a **PERFECT** dodge. A yellow **!** is a fast jab, a red **!** is a haymaker, which can freeze mid-swing to bait you, or a fake where the arm stops short and a quick jab follows. After a dodge the bot is open: tap to counter. Counters drain its stamina bar; a knockdown heals you and starts a tougher round. Dodge streaks boost your counters, and pink pips warn of combo punches. |
| 5 | 🏃 Hop Hop Hill | A simple platformer on its own page (`platformer.html`). Run with ← → / A D, jump with Space / ↑ (hold to jump higher). Stomp slimes, hoppers and bats, jump over the spiky beetles, avoid spikes, and beat the boss at the end of each of the three levels (King Slime, Cave Beetle, Slime Queen) to open the gate to the flag. Not part of the survival score. |

### Adding a game

Write a class with the same shape as `JetEscape` / `IceBrawl`: `reset()`, `start()`, `action()`, `update(dt)` and `draw(ctx)`, plus `.time` and `.state` (`'idle'` → `'running'` → `'dying'` → `'done'`). Optionally add a `.meter` (0–1) for the HUD bar. Then replace the locked entry in the `GAMES` list near the bottom of `index.html`.

The instructions for the exercise are at https://vibe-jam-2026.github.io/team-2/instructions.html.

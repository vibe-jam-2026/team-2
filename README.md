# team-2
Vibe Jam 2026 – lag 2
Martin är bäst

## Survival Hub

Play it at https://vibe-jam-2026.github.io/team-2/. It's a single self-contained file, `index.html`, with no build step and no dependencies.

The hub is the main menu: an arcade lobby of tiny one-button survival games. Every game uses the same control: <kbd>Space</kbd>, click or tap. The exception is Ice Brawl: Face-Off, which uses two hands. Each game is scored by how long you survive, and 60 seconds gives a perfect 100. The overall score is the average of your best runs, and "Play all games" runs them back to back and shows a results screen.

| # | Game | How it works |
|---|---|---|
| 1 | ✈️ Jet Escape | Tap to boost your jet. Dodge the incoming missiles and stay away from the sea and the top edge. |
| 2 | 🏒 Ice Brawl | The fighting game: a 1v1 hockey fight against a bot. When a red **!** appears over your opponent, tap to duck the punch and counter. Tapping at the wrong time makes you wobble and lose balance. Watch out for fakes and combos later on. |
| 3 | 🐿️ Slapshot Squirrels | Two-player artillery on its own page (`slapshot-squirrels.html`). Not part of the survival score. |
| 4 | 🥊 Ice Brawl Pro | The harder, skill-based Ice Brawl. A duck only lasts a split second, so tap just before the punch lands; the last 0.08s is a **PERFECT** dodge. A yellow **!** is a fast jab, a red **!** is a haymaker, which can freeze mid-swing to bait you, or a fake where the arm stops short and a quick jab follows. After a dodge the bot is open: tap to counter. Counters drain its stamina bar; a knockdown heals you and starts a tougher round. Dodge streaks boost your counters, and pink pips warn of combo punches. |
| 5 | 👊 Ice Brawl: Face-Off | First-person hockey fight with two hands. <kbd>Q</kbd>/<kbd>E</kbd> punch left/right, hold <kbd>A</kbd>/<kbd>D</kbd> to block on that side of the screen (touch: top half punches, bottom half blocks). The rival's winding fist gets a shrinking ring and a badge for the block to use. Block just before it lands for a **PERFECT** that leaves the rival open for counters; a block held too long gets weaker and finally breaks. The rival guards one side, learns which hand you favour and parries spam. Punches cost stamina. Each knockout adds +10 seconds. You face one rival skater, then the **final boss** (Trump: old, slow, heavy hooks) and the **final final boss** (Kim Jong Un: fast jabs, long combos, more feints). Beating Kim wins the game for a perfect 100. Opponent stats live in the `ROSTER` list. |

### Adding a game

Write a class with the same shape as `JetEscape` / `IceBrawl`: `reset()`, `start()`, `action()`, `update(dt)` and `draw(ctx)`, plus `.time` and `.state` (`'idle'` → `'running'` → `'dying'` → `'done'`). Optionally add a `.meter` (0–1) for the HUD bar. A game that needs more than one button can also implement `keyDown(code, repeat)` (return `true` for keys it uses), `keyUp(code)`, `pointerDown(id, x, y, isTouch)`, `pointerUp(id)` and `releaseAll()`, and can add bonus seconds to its score with `.bonus`. Then replace the locked entry in the `GAMES` list near the bottom of `index.html`.

The instructions for the exercise are at https://vibe-jam-2026.github.io/team-2/instructions.html.

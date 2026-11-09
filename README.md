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
| 3 | 🔒 Game 3 | Locked placeholder, coming soon. |

### Adding a game

Write a class with the same shape as `JetEscape` / `IceBrawl`: `reset()`, `start()`, `action()`, `update(dt)` and `draw(ctx)`, plus `.time` and `.state` (`'idle'` → `'running'` → `'dying'` → `'done'`). Optionally add a `.meter` (0–1) for the HUD bar. Then replace the locked entry in the `GAMES` list near the bottom of `index.html`.

The instructions for the exercise are at https://vibe-jam-2026.github.io/team-2/instructions.html.

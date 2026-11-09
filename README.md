# team-2
Vibe Jam 2026 – lag 2
Martin är bäst

## Team 2 Brawl

A 2D platform fighter MVP. Knock your opponent off the stage: the more damage (%) they have, the further they fly. Three stocks each; the last player standing wins.

Play it at https://vibe-jam-2026.github.io/team-2/ or open `index.html` locally. It needs no build step and has no dependencies.

### Controls

| Action | Player 1 | Player 2 | Gamepad |
|---|---|---|---|
| Move | A / D | ← / → | Stick / D-pad |
| Jump (double jump in the air) | W | ↑ | A / Y / stick up |
| Drop through platform / fast fall | S | ↓ | Down |
| Light attack | F | , or Numpad 1 | X |
| Heavy attack | G | . or Numpad 2 | B |
| Shield | H | / or Numpad 3 | Shoulders / triggers |

Hold up or down while attacking for up or down moves. Up + heavy in the air gives a one-time boost upward for recovering. On the menu, `1` = vs CPU, `2` = two players, `0` = watch CPU vs CPU. `P` pauses, `Esc` goes to the menu, and `` ` `` shows hitboxes.

### Online play (two computers)

1. Both players open the game. Player 1 presses `3`, then `H`, and gets a 4-letter code.
2. Player 1 sends the code, or the invite link (`C` copies it), to Player 2.
3. Player 2 presses `3`, then `J`, types the code and presses Enter, or just opens the invite link.

The match starts as soon as the two players are connected. On your own computer you can use either keyboard layout or a gamepad. `Esc` leaves the match.

How it works:
- The browsers connect directly with WebRTC through [PeerJS](https://peerjs.com), vendored in `lib/`. PeerJS's free cloud server is only used to introduce the two browsers. If a network blocks direct connections, PeerJS falls back to its public TURN relay.
- **Netcode: delay-based lockstep.** Only button presses are sent. Your input is applied a few frames late (the "input delay", picked from the measured ping when the match starts). Each frame is simulated once both players' inputs for it have arrived, so both computers run exactly the same game. If inputs stop arriving, the game pauses and shows "Waiting for opponent…".
- Every packet repeats all inputs the other side hasn't confirmed yet, so lost packets don't matter.
- Both sides hash the game state every second and compare. A mismatch shows an "Out of sync" warning.
- For determinism, all gameplay happens in `simTick()`, and nothing in it may use `Math.random()`, `Math.sin`/`Math.cos`, the clock, or anything else that could differ between computers. Particles, screen shake and sound are visual only and may use randomness.

Testing without two computers: open `index.html?net=local` in two tabs of the same browser (served over http, e.g. `python3 -m http.server`). Add `&lag=150&loss=0.2` to simulate 150 ms ping and 20% packet loss.

### What is in the MVP

- One stage: a main platform plus three platforms you can drop through, with blast zones off every edge
- Movement: run, jump-squat, short hop (tap jump), double jump, fast fall, drop-through
- Seven moves: jab, up tilt, down tilt, down air (spike), forward / up / down smash
- Percent-based knockback, hitstun, hitstop, screen shake, particles, simple sound effects
- Shield that shrinks when held or hit and breaks into a dizzy state
- Stocks, respawn with invincibility, countdown, pause, win screen and rematch
- CPU opponent, local 2 players on one keyboard, online 2 players, gamepad support

### Code map (`game.js`)

- **Tuning**: physics constants, the `STAGE` layout and the `MOVES` frame data table are at the top. Adding or rebalancing an attack is a one-line change there.
- **Input**: `HumanCtrl` (keyboard + gamepad) and `CpuCtrl` (AI). Both return the same set of held buttons.
- **Fighter**: movement, the state machine (move / hitstun / shield / shield break) and collision.
- **tryHit**: hit detection and the knockback formula.
- **Drawing**: everything is drawn with canvas shapes, so there are no assets yet.

### Ideas for next steps

Rollback netcode for online play, character select with different stats, more stages, ledge grabbing, items, sprites and animation, music.

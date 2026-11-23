# goy theft auto

### Supply run

Every expedition starts a shared three-case delivery. The amber route on the map points to your next vehicle or stop. One hiker can handle every leg, or a driver and pilot can split the work.

1. Board the trail rover with **E**. Reverse toward **Pine Depot** (P on the map), then release the throttle inside the amber posts. Loading takes one second.
2. Drive the cases to the **trailhead helipad**. Stop alongside the grounded helicopter for one second to transfer the load. Bring the helicopter back to the H first if another pilot parked it elsewhere.
3. Exit the rover with **E** and board the helicopter. Climb with **Space**, steer toward **Ridge Outpost** (D on the map), and descend with **Shift**. Stay landed inside its amber ring for one second to complete the delivery.

Press **R** after completion to start another run. Fly the helicopter back to the H for the next handoff. Another player can take over a released vehicle. A recovered helicopter receives the expedition's cargo again.

### Helicopter bailout

Press **E** in flight to jump out. You start in free fall. Release the climb key if held, then press **Space** to open the parachute. Steer with **WASD** or the **arrow keys**. A deployed chute gives you a safe landing. A hard landing with the chute packed can cost health or trigger a respawn. The empty helicopter carries its momentum, banks and loses height until impact. The wreck stays in the world for six seconds before a replacement returns to the trailhead pad.

Hikers and trail rivals have 100 HP, forestry rovers have 250 HP, and helicopters have 500 HP. Blasters damage people, vehicles and roadside supply barricades. Trees stay intact. A wrecked rover releases its driver and respawns at the trailhead after six seconds.

## Zombie Survival

Select **Zombie Survival · Co-op** in the map menu or share `/?map=brickell&mode=zombies`. Gather at the Harbor Key cordon and choose **Start run**. All players share one score. Each infected is worth 100 points times the wave number. Clearing a wave brings fallen teammates back and sends a larger, stronger horde. When the last survivor falls, the final score stays up until someone selects **Play again**.

## Brickell team modes

Choose a mode in the map menu or share its URL with the whole group. Each mode runs its own match. Brickell Avenue and Lantern Point are the two home islands. Harbor Key is neutral. Teams fill automatically up to eight a side. For playtesting, Total Loss starts with one player per side and pauses if a team empties. While alone you can move, shoot and drive in a separate warm-up. Joining opponents return everyone to the competitive round with its property and scores intact. Repo Wars and Moving Day start at five per side and pause if either side falls below five. After a win, players get a fresh round after 15 seconds if both teams still have enough players.

| Mode | Shareable path | How to reach $5 million |
| --- | --- | --- |
| Total Loss | `/?map=brickell&mode=total-loss` | Destroy insured enemy property. Colored cases, glazing, street fixtures, mansion wall sections and insured vehicles contribute to the repair bill. |
| Repo Wars | `/?map=brickell&mode=repo-wars` | Destruction earns half value. Press G beside an enemy case to carry it, or commandeer an enemy pickup, GT or helicopter. Bring it to the gold auction ring on Harbor Key for full value. Stop vehicles inside the ring and land the helicopter. |
| Moving Day | `/?map=brickell&mode=moving-day` | Each team gets 60 seconds to hide its gold case on its home island. Press G to pick it up or put it down. The hidden case is worth $2 million. Other insured property also counts. |

An asset pays once per round, including vehicles that respawn. The roster, damage, possession, deliveries and payouts are verified by the server. The map shows team colors and the auction marker. Enemy gold cases are omitted from the minimap.

Mode definitions, team sizes and the dollar goal live in `public/island-rules.js`. The menu and room router read the same mode registry. The server owns the lifecycle and scoring handlers in `island-match.js`. Run `node test/island-match.mjs` for rule tests and `node test/island-lobby.mjs` for a self-contained multiplayer lobby test.

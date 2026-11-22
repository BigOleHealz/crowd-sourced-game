// Each deck figure has a stable seat bit. The boat and survivor snapshots
// transfer ownership of that same figure as it leaves the sinking hull.
export const partySeats=[
  [[-.8,1.32,-1.7,0]],
  [[-.75,1.33,3.48,2.84],[.51,3.18,-1.94,-2.9]],
  [[.30,1.33,3.72,-.99],[-.62,3.18,-1.53,1.9]],
  [[1.11,1.33,4.46,-.40],[-.91,1.33,6.18,-2.04]],
  [[-.65,1.33,4.62,1.65],[.92,1.33,6.28,2.50]],
];
export const partyDeck=partySeats.flat();
export const partySinkDepth=8.8;

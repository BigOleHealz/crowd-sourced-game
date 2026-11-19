// Decks meet edge to edge. Each height is measured from the same datum as
// the city streets. An overhead span leaves the original seabed beneath it.
export const deckThickness = .24;
const streetHeight = .70;
const highDeck = 3.95;

export function bayfrontCrossings(avenue, streets, coast, harbor) {
  const decks = [], rails = [], piers = [];
  function span(west, east, north, south, axis, start, end) {
    const slope = (end - start) / (axis === 'x' ? east - west : south - north);
    const deck = {west, east, north, south, axis, height(x,z) {
      return start + slope * (axis === 'x' ? x - west : z - north);
    }};
    decks.push(deck);
    return deck;
  }
  function rail(deck, x1, z1, x2, z2) {
    // Short panels follow the grade and use the same footprint for collision.
    const count = Math.ceil(Math.hypot(x2-x1,z2-z1) / 3);
    for (let i=0; i<count; i++) {
      const ax=x1+(x2-x1)*i/count, az=z1+(z2-z1)*i/count;
      const bx=x1+(x2-x1)*(i+1)/count, bz=z1+(z2-z1)*(i+1)/count;
      const x=(ax+bx)/2, z=(az+bz)/2;
      rails.push({x,z,w:Math.max(.16,Math.abs(bx-ax)),d:Math.max(.16,Math.abs(bz-az)),
        bottom:0,h:.86, a:[ax,deck.height(ax,az),az], b:[bx,deck.height(bx,bz),bz]});
    }
  }
  function pier(deck,x,z) {
    piers.push({x,z,w:.85,d:1.05,bottom:-2.8-deck.height(x,z),h:-.02});
  }

  // Continue the bayfront avenue across the channel to Harbor Key Beach.
  const west=avenue-5.7, east=avenue+5.7;
  const keyRoad={west,east,north:harbor.crossing+4.5,south:harbor.south};
  for(const [north,south,from,to] of [
    [harbor.south,harbor.south+22,streetHeight,highDeck],
    [harbor.south+22,coast.north-22,highDeck,highDeck],
    [coast.north-22,coast.north,highDeck,streetHeight],
  ]) {
    const deck=span(west,east,north,south,'z',from,to);
    for(const x of [west+.1,east-.1]) {
      rail(deck,x,north,x,south);
      pier(deck,x,(north+south)/2);
    }
  }

  // A two-lane quay joins the eastbound streets outside the marina. The
  // open spans between piers keep the existing RHIB berth connected to sea.
  const half=4.1, quayWest=coast.east+12, quayEast=quayWest+2*half;
  const quay=span(quayWest,quayEast,streets[0]-half,streets.at(-1)+half,'z',highDeck,highDeck);
  rail(quay,quayEast-.1,quay.north,quayEast-.1,quay.south);
  for(const [i,z] of streets.entries()) {
    const north=z-half, south=z+half;
    const approach=span(coast.east-5.3,quayWest-3.8,north,south,'x',streetHeight,highDeck);
    const landing=span(approach.east,quayWest,north,south,'x',highDeck,highDeck);
    for(const edge of [north+.1,south-.1]) {
      rail(approach,approach.west,edge,approach.east,edge);
      rail(landing,landing.west,edge,quayWest,edge);
      pier(landing,quayWest-2.5,edge);
      pier(quay,quayEast-.6,edge);
    }
    if(i) rail(quay,quayWest+.1,streets[i-1]+half,quayWest+.1,north);
  }
  for(const z of [quay.north+.1,quay.south-.1]) rail(quay,quayWest,z,quayEast,z);
  return {decks,rails,piers,keyRoad};
}

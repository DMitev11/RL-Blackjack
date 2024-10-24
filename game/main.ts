import {
  Deck,
  StatsTracker,
} from "./utils";
import { ModelTypes, Playthrough } from "./playthrough";
import { ModelRequest } from "./request";
import { cloneDeep } from "lodash";

async function main() {
  const deck = new Deck.PlayDeck(4);
  const multihandDeck = cloneDeep(deck);
  const averageDeck = cloneDeep(deck);
  const standDeck = cloneDeep(deck);
  const randomDeck = cloneDeep(deck);
  const multihandStats = new StatsTracker();
  const averageStats = new StatsTracker();
  const standStats = new StatsTracker();
  const randomStats = new StatsTracker();
  new ModelRequest('http://localhost', '8050')

  const rounds = 1000
  for(let i = 0.; i < rounds; i++) {
    console.clear()
    console.log(`MultiHand Progress: ${Math.floor(i / rounds * 100)}`)
    const playthrough = new Playthrough({ deck: multihandDeck }, false, ModelTypes.MultiHand);
    const res = await playthrough.play();
    res.forEach(res => multihandStats.addResult(res));
  }
  for(let i = 0.; i < rounds; i++) {
    console.clear()
    console.log(`Average Progress: ${Math.floor(i / rounds * 100)}`)
    const playthrough = new Playthrough({ deck: averageDeck }, false, ModelTypes.Average);
    const res = await playthrough.play();
    res.forEach(res => averageStats.addResult(res));
  }
  for(let i = 0.; i < rounds; i++) {
    console.clear()
    console.log(`Stand-Only Progress: ${Math.floor(i / rounds * 100)}`)
    const playthrough = new Playthrough({ deck: standDeck }, false, ModelTypes.StandOnly);
    const res = await playthrough.play();
    res.forEach(res => standStats.addResult(res));
  }
  for(let i = 0.; i < rounds; i++) {
    console.clear()
    console.log(`Random Progress: ${Math.floor(i / rounds * 100)}`)
    const playthrough = new Playthrough({ deck: randomDeck }, false, ModelTypes.Random);
    const res = await playthrough.play();
    res.forEach(res => randomStats.addResult(res));
  }

  console.log(`\n Multihand`)
  multihandStats.log()
  console.log(`\n Average`)
  averageStats.log()
  console.log(`\n Stand Only`)
  standStats.log()
  console.log(`\n Random`)
  randomStats.log()
  return;
}

main();

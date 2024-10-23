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
  const multihandStats = new StatsTracker();
  const averageStats = new StatsTracker();
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

  console.log(`\n Multihand`)
  multihandStats.log()
  console.log(`\n Average`)
  averageStats.log()
  return;
}

main();

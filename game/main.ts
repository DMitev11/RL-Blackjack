import {
  Deck,
  StatsTracker,
} from "./utils";
import { Playthrough } from "./playthrough";
import { ModelRequest } from "./request";

async function main() {
  const deck = new Deck.PlayDeck(1000);
  const stats = new StatsTracker();
  new ModelRequest('http://localhost', '8050')

  while (true) {
    const playthrough = new Playthrough({ deck }, true);
    const res = await playthrough.play();
    res.forEach(res => stats.addResult(res));
  }
}

main();

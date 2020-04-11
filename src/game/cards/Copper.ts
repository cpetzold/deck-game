import Card, { CardType } from "../Card";

import GainCoins from "../actions/GainCoins";
import State from "../State";

export default class Copper extends Card {
  constructor() {
    super({
      id: "copper",
      isKingdom: false,
      name: "Copper",
      description: "<b>+1 Coin</b>",
      types: [CardType.Treasure],
      cost: 0,
    });
  }

  canPlay(state: State): boolean {
    return true;
  }

  async play(state: State) {
    state.enqueueAction(new GainCoins(1));
  }
}

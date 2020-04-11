import Action from "../Action";
import State from "../State";

export default class GainCoins extends Action {
  amount: number;
  constructor(amount: number) {
    super();
    this.amount = amount;
  }

  async resolve(state: State) {
    // Give the current player coins
  }
}

import { ArraySchema, Schema, type } from "@colyseus/schema";

import Card from "./Card";

export default class CardPile extends Schema {
  @type([Card])
  public cards: ArraySchema<Card>;

  constructor(cards: Card[]) {
    super();
    this.cards = new ArraySchema<Card>(...cards);
  }
}

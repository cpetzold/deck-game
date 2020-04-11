import { ArraySchema, Schema, type } from "@colyseus/schema";

import State from "./State";

export const enum CardType {
  Action = "action",
  Treasure = "treasure",
  Attack = "attack",
  Duration = "duration",
}

export default abstract class Card extends Schema {
  @type("string")
  public id: string;

  @type("boolean")
  public isKingdom: boolean;

  @type("string")
  public name: string;

  @type(["string"])
  public types: ArraySchema<CardType>;

  @type("string")
  public description: string;

  @type("uint16")
  public cost: number;

  constructor({ id, isKingdom, name, types, description, cost }) {
    super();
    this.id = id;
    this.isKingdom = isKingdom;
    this.name = name;
    this.types = new ArraySchema(...types);
    this.description = description;
    this.cost = cost;
  }

  abstract canPlay(state: State): boolean;
  abstract async play(state: State): Promise<void>;
}

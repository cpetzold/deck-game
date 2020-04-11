import { ArraySchema, Schema, type } from "@colyseus/schema";

import Card from "./Card";
import CardPile from "./CardPile";
import State from "./State";
import _ from "lodash";

export type PlayerID = string;

export enum RequiredActionType {
  TrashFromHand = "trash-from-hand",
}

export interface RequiredAction {
  type: RequiredActionType;
  description: string;
  args: any;
}

interface RequiredActionPayload extends RequiredAction {
  id: number;
  onResponse(args: any): void;
}

export default class Player extends Schema {
  @type("string")
  public id: PlayerID;

  @type("uint16")
  public health: number = 30;

  @type("uint16")
  public armor: number = 0;

  @type("uint16")
  public actions: number = 0;

  @type("uint16")
  public buys: number = 0;

  @type("uint16")
  public coins: number = 0;

  @type([Card])
  public deck = new ArraySchema<Card>();

  @type([Card])
  public hand = new ArraySchema<Card>();

  @type([Card])
  public discard = new ArraySchema<Card>();

  @type([Card])
  public inPlay = new ArraySchema<Card>();

  public requiredActions: RequiredActionPayload[] = [];
  currentRequiredActionsId: number = 0;

  constructor(id: PlayerID) {
    super();
    this.id = id;
  }

  public startTurn(): void {
    this.armor = 0;
  }

  public endTurn(): void {
    this.cleanup();
  }

  public cleanup(): void {
    this.discard.unshift(...[..._.clone(this.inPlay).reverse(), ...this.hand]);
    this.hand = new ArraySchema();
    this.inPlay = new ArraySchema();

    this.actions = 1;
    this.buys = 1;
    this.coins = 0;
    this.drawCards(5);
  }

  public gainCard(pile: CardPile, toDeck: boolean = false): boolean {
    if (pile.cards.length === 0) {
      return false;
    }

    (toDeck ? this.deck : this.discard).unshift(pile.cards.shift());
    return true;
  }

  public gainCards(
    pile: CardPile,
    amount: number,
    toDeck: boolean = false
  ): boolean {
    for (let i: number = 0; i < amount; i += 1) {
      if (!this.gainCard(pile, toDeck)) {
        return false;
      }
    }
    return true;
  }

  public shuffle(): void {
    this.deck = new ArraySchema(
      ..._([...this.deck, ...this.discard])
        .shuffle()
        .value()
    );
    this.discard = new ArraySchema();
  }

  public drawCard(): boolean {
    if (this.deck.length === 0) {
      if (this.discard.length > 0) {
        this.shuffle();
        return this.drawCard();
      } else {
        return false;
      }
    } else {
      this.hand.push(this.deck.shift());
      return true;
    }
  }

  public drawCards(amount: number): boolean {
    for (let i: number = 0; i < amount; i += 1) {
      if (!this.drawCard()) {
        return false;
      }
    }
    return true;
  }

  public async playCard(state: State, index: number): Promise<boolean> {
    const card = this.hand[index];

    if (!card.canPlay(state)) {
      return false;
    }

    console.log("!!!", card.id);

    this.inPlay.push(card);

    console.log(this.inPlay[0].id);

    _.pullAt(this.hand, index);

    await card.play(state);

    return true;
  }

  public buyCard(state: State, pileId: string): boolean {
    const pile: CardPile = state.cardPiles[pileId];
    const card = _.first(pile.cards);
    const { cost } = card;

    if (!this.buys || this.coins < cost) {
      return false;
    }

    this.coins -= cost;
    this.buys--;
    this.gainCard(pile);
  }

  public trashCards(indices: number[], fromDiscard: boolean = false): Card[] {
    return _.remove(fromDiscard ? this.discard : this.hand, (val, i) =>
      _.includes(indices, i)
    );
  }

  public takeDamage(amount: number = 1): void {
    const damageToArmor = Math.min(amount, this.armor);
    const damageToHealth = Math.max(0, amount - this.armor);
    this.armor -= damageToArmor;
    this.health -= damageToHealth;
  }

  public isAlive(): boolean {
    return this.health > 0;
  }

  public onRequiredActionResponse(id: number, args: any): void {
    const requiredAction = _.find(this.requiredActions, { id });
    if (requiredAction) {
      _.remove(this.requiredActions, { id });
      requiredAction.onResponse(args);
    }
  }

  public async waitForRequiredAction(
    requiredAction: RequiredAction
  ): Promise<any> {
    return new Promise((resolve) => {
      const payload: RequiredActionPayload = {
        id: this.currentRequiredActionsId++,
        onResponse: resolve,
        ...requiredAction,
      };
      this.requiredActions.push(payload);
    });
  }
}

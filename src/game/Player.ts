import Card, { CardID } from "./Card";

import State from "./State";
import _ from "lodash";
import { nosync } from "colyseus";

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

export default class Player {
  public id: PlayerID;
  public requiredActions: RequiredActionPayload[] = [];
  public health: number = 30;
  public armor: number = 0;
  public actions: number = 0;
  public buys: number = 0;
  public coins: number = 0;
  public deck: CardID[] = [];
  public hand: CardID[] = [];
  public discard: CardID[] = [];
  public inPlay: CardID[] = [];

  @nosync
  currentRequiredActionsId: number = 0;

  constructor(id: PlayerID) {
    this.id = id;
  }

  public startTurn(): void {
    this.armor = 0;
  }

  public endTurn(): void {
    this.cleanup();
  }

  public cleanup(): void {
    this.discard = [
      ..._.clone(this.inPlay).reverse(),
      ...this.hand,
      ...this.discard,
    ];
    this.hand = [];
    this.inPlay = [];

    this.actions = 1;
    this.buys = 1;
    this.coins = 0;
    this.drawCards(5);
  }

  public gainCard(pile: CardID[], toDeck: boolean = false): boolean {
    if (pile.length === 0) {
      return false;
    }

    (toDeck ? this.deck : this.discard).unshift(pile.shift());
    return true;
  }

  public gainCards(
    pile: CardID[],
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
    this.deck = _([...this.deck, ...this.discard])
      .shuffle()
      .value();
    this.discard = [];
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

  getCardInHand(state: State, index: number): Card {
    return state.cards[this.hand[index]];
  }

  canPlayCard(card: Card): boolean {
    return (card && !card.action) || this.actions > 0;
  }

  public async playCard(state: State, index: number): Promise<boolean> {
    const card = this.getCardInHand(state, index);

    if (!this.canPlayCard(card)) return false;

    this.inPlay.push(card.id);
    _.pullAt(this.hand, index);

    if (card.action) {
      this.actions--;
      await card.action(this, state);
    }

    if (card.coin) {
      this.coins += card.coin(this, state);
    }

    return true;
  }

  public buyCard(state: State, cardId: CardID): boolean {
    const pile = state.cardPiles[cardId];
    const card = state.cards[cardId];
    const { cost } = card;

    if (!this.buys || this.coins < cost) {
      return false;
    }

    this.coins -= cost;
    this.buys--;
    this.gainCard(pile);
  }

  public trashCards(indices: number[], fromDiscard: boolean = false): CardID[] {
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

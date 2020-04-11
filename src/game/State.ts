import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import Player, { PlayerID } from "./Player";

import Action from "./Action";
import Card from "./Card";
import CardPile from "./CardPile";
import { Client } from "colyseus";
import { Logger } from "pino";
import _ from "lodash";
import cards from "./cards";

export enum GameState {
  Waiting = "waiting",
  Playing = "playing",
  Ended = "ended",
}

export default class State extends Schema {
  log: Logger;

  @type("string")
  public gameState: GameState = GameState.Waiting;

  @type("string")
  public currentPlayerId: PlayerID;

  @type({ map: Player })
  public players = new MapSchema<Player>();

  @type({ map: CardPile })
  public cardPiles = new MapSchema<CardPile>();

  @type([Card])
  public trash = new ArraySchema<Card>();

  actionQueue: Action[] = [];

  constructor(log: Logger) {
    super();

    this.log = log.child({});

    this.addPile("copper", 40);
    // this.addPile("silver", 40);
    // this.addPile("gold", 40);

    // this.addPile("lightAttack", 10);
    // this.addPile("mediumAttack", 10);
    // this.addPile("heavyAttack", 10);

    // _(cards)
    //   .filter((CardConstructor: typeof Card) => CardConstructor.isKingdom)
    //   .shuffle()
    //   .take(10)
    //   .forEach((CardConstructor: typeof Card) => {
    //     this.addPile(CardConstructor);
    //   });
  }

  public addPlayer(client: Client): void {
    if (this.players[client.id]) {
      this.log.warn({ client }, "Attempting to add pre-existing player");
      return;
    }

    const player: Player = new Player(client.id);
    player.gainCards(this.cardPiles.copper, 7);
    // player.gainCards(this.cardPiles.lightAttack, 3);
    player.cleanup();
    this.players[client.id] = player;

    this.log.info({ player }, "Added player");

    if (_(this.players).size() === 2) {
      this.startGame();
    }
  }

  public removePlayer(client: Client): void {
    delete this.players[client.id];
  }

  public getCurrentPlayer(): Player {
    return this.players[this.currentPlayerId];
  }

  public isCurrentPlayer(player: Player): boolean {
    return player.id === this.currentPlayerId;
  }

  public getOpponent(id: PlayerID): Player {
    const opponentId = _(this.players).keys().without(id).first();
    return this.players[opponentId];
  }

  public endTurn(client: Client): void {
    const player = this.players[client.id];
    player.endTurn();
    this.currentPlayerId = _(this.players)
      .keys()
      .without(this.currentPlayerId)
      .first();
    this.getCurrentPlayer().startTurn();
  }

  public startGame(): void {
    this.log.info("Game started");
    this.currentPlayerId = _(this.players).keys().shuffle().first();
    this.getCurrentPlayer().startTurn();
    this.gameState = GameState.Playing;
  }

  public endGame(): void {
    this.log.info("Game ended");
    this.gameState = GameState.Ended;
  }

  public addPile(cardId: string, amount: number = 10): void {
    this.cardPiles[cardId] = new CardPile(
      _.times(amount, () => new cards[cardId]())
    );
  }

  public async playCard(client: Client, index: number): Promise<void> {
    const player = this.players[client.id];
    if (!this.isCurrentPlayer(player)) return;

    await player.playCard(this, index);

    if (_.some(this.players, (player) => !player.isAlive())) {
      this.endGame();
    }
  }

  public buyCard(client: Client, cardId: string): void {
    const player = this.players[client.id];
    if (!this.isCurrentPlayer(player)) return;

    player.buyCard(this, cardId);
  }

  public trashCards(
    player: Player,
    indices: number[],
    fromDiscard: boolean = false
  ): void {
    const trashedCardIds = player.trashCards(indices, fromDiscard);
    this.trash.concat(trashedCardIds);
  }

  public onRequiredActionResponse(client: Client, id: number, args: any): void {
    const player = this.players[client.id];
    player.onRequiredActionResponse(id, args);
  }

  public enqueueAction(action: Action): void {
    this.actionQueue.push(action);
  }
}

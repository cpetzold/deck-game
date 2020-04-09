import * as cards from "./cards";

import Card, { CardID } from "./Card";
import { Client, nosync } from "colyseus";
import Player, { PlayerID } from "./Player";

import { Logger } from "pino";
import _ from "lodash";

export enum GameState {
  Waiting = "waiting",
  Playing = "playing",
  Ended = "ended",
}

export default class State {
  @nosync
  log: Logger;

  public gameState: GameState = GameState.Waiting;
  public currentPlayerId: PlayerID;
  public players: { [id: string]: Player } = {};
  public cardPiles: { [id: string]: CardID[] } = {};
  public trash: CardID[] = [];
  public cards: { [id: string]: Card } = cards;

  constructor(log: Logger) {
    this.log = log.child({});

    this.addPile(cards.copper.id, 40);
    this.addPile(cards.silver.id, 40);
    this.addPile(cards.gold.id, 40);

    this.addPile(cards.lightAttack.id, 10);
    this.addPile(cards.mediumAttack.id, 10);
    this.addPile(cards.heavyAttack.id, 10);

    _(cards)
      .filter((card) => card.isKingdom)
      .shuffle()
      .take(10)
      .forEach(({ id }) => this.addPile(id));
  }

  public addPlayer(client: Client): void {
    if (this.players[client.id]) {
      this.log.warn({ client }, "Attempting to add pre-existing player");
      return;
    }

    const player: Player = new Player(client.id);
    player.gainCards(this.cardPiles[cards.copper.id], 7);
    player.gainCards(this.cardPiles[cards.lightAttack.id], 3);
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

  public addPile(cardId: CardID, amount: number = 10): void {
    this.cardPiles[cardId] = _.fill(Array(amount), cardId);
  }

  public async playCard(client: Client, index: number): Promise<void> {
    const player = this.players[client.id];
    if (!this.isCurrentPlayer(player)) return;

    await player.playCard(this, index);

    if (_.some(this.players, (player) => !player.isAlive())) {
      this.endGame();
    }
  }

  public buyCard(client: Client, cardId: CardID): void {
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
}

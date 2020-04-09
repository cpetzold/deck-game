import { Client, Room } from "colyseus";
import State, { GameState } from "../game/State";

import { Logger } from "pino";
import log from "../log";

export default class GameRoom extends Room<State> {
  log: Logger;

  onCreate(options: any) {
    const { roomId, roomName } = this;
    this.maxClients = 2;

    this.log = log.child({ roomId, roomName });
    this.log.info("Room Initialized");
    this.setState(new State(this.log));
  }

  onAuth(client: Client) {
    if (this.state.gameState !== GameState.Waiting) {
      throw new Error("Game already started");
    }

    return true;
  }

  onJoin(client: Client) {
    this.log.info({ client }, "Client joined");
    this.state.addPlayer(client);

    if (this.state.gameState !== GameState.Waiting) {
      this.lock();
    }
  }

  onLeave(client: Client) {
    this.log.info({ client }, "Client left");
    // this.state.removePlayer(client)
  }

  onMessage(client: Client, data: any) {
    this.log.info({ client, data }, "Client sent message");

    const { command, args } = data;

    switch (command) {
      case "playCard":
        this.state.playCard(client, args.index);
        break;
      case "buyCard":
        this.state.buyCard(client, args.cardId);
        break;
      case "endTurn":
        this.state.endTurn(client);
        break;
      case "completeRequiredAction":
        this.state.onRequiredActionResponse(client, args.id, args);
        break;
    }
  }

  onDispose() {
    this.log.info("Room disposed");
  }
}

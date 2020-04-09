import * as http from "http";

import GameRoom from "./gameRoom";
import { Server } from "colyseus";
import log from "../log";
import next from "next";

const port = +process.env.PORT || 3001;
const dev = process.env.NODE_ENV !== "production";

async function start() {
  const app = next({ dev });
  const handle = app.getRequestHandler();
  const server = http.createServer(handle);

  await app.prepare();

  const gameServer = new Server({ server });
  gameServer.define("game", GameRoom).filterBy(["maxClients"]);

  await gameServer.listen(port);

  log.info(`Running at http://localhost:${port}`);
}

start();

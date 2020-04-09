import * as React from "react";

import { Client, Room } from "colyseus.js";

import JSONTree from "react-json-tree";
import _ from "lodash";

function Badge({ size = 20, color, textColor = "white", children }) {
  return (
    <div className="badge">
      {children}
      <style jsx>{`
        .badge {
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${color};
          color: ${textColor};
          border-radius: 50%;
          font-size: ${size - 8}px;
          font-weight: bold;
          width: ${size}px;
          height: ${size}px;
        }
      `}</style>
    </div>
  );
}

function Card({ card }) {
  const { name, description, cost } = card;
  return (
    <div className="card">
      <strong>{name}</strong>
      <pre dangerouslySetInnerHTML={{ __html: description }} />
      <div className="cost">
        <Badge color="#7394e6">{cost}</Badge>
      </div>

      <style jsx>{`
        .card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 3px;
          text-align: center;
        }

        .cost {
          position: absolute;
          top: -4px;
          left: -4px;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

function PlayableCard({ card, index, onClick }) {
  return (
    <div className="playable-card" onClick={() => onClick(index)}>
      <Card card={card} />

      <style jsx>{`
        .playable-card {
          cursor: pointer;
          transition: all 0.3s;
          width: 120px;
          height: 160px;
          border-radius: 3px;
          margin: 3px;
          font-size: 0.9rem;
        }

        .playable-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </div>
  );
}

function CardPile({ card, count, onClick }) {
  return (
    <div className="card-pile" onClick={() => onClick(card.id)}>
      <div className="count">
        <Badge color="red">{count}</Badge>
      </div>
      <Card card={card} />

      <style jsx>{`
        .card-pile {
          position: relative;
          width: 100px;
          height: 100px;
          cursor: pointer;
          transition: all 0.3s;
          border-radius: 3px;
          margin: 6px;
          opacity: ${!count ? 0.4 : 1};
          font-size: 0.7rem;
        }

        .card-pile:hover {
          transform: translateY(-2px);
        }

        .count {
          position: absolute;
          bottom: -4px;
          right: -4px;
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

const ColyseusClientContext = React.createContext(
  new Client("ws://localhost:3001")
);

function useColyseusClient() {
  return React.useContext(ColyseusClientContext);
}

function useRoom(name: string) {
  const client = useColyseusClient();
  const [loading, setLoading] = React.useState(true);
  const [sessionId, setSessionId] = React.useState(null);
  const [state, setState] = React.useState(null);

  const room = React.useRef<Room>();

  React.useEffect(() => {
    (async () => {
      const r = await client.joinOrCreate(name);

      r.onStateChange(setState);
      room.current = r;

      setSessionId(r.sessionId);
      setLoading(false);
    })();
  }, [name]);

  return {
    loading,
    sessionId,
    state,
    send(data) {
      if (room.current) {
        room.current.send(data);
      }
    },
  };
}

export default function Game({ roomName, debug = false }) {
  const { loading, state, sessionId, send } = useRoom(roomName);

  if (loading || !state || state.gameState === "waiting") return null;

  const { playing, players, cardPiles, cards, currentPlayerId } = state;
  const opponentId = _(players).keys().without(sessionId).first();
  const me = players[sessionId];
  const opponent = players[opponentId];
  const myTurn = currentPlayerId === sessionId;

  const onClickHandCard = (index) => {
    send({ command: "playCard", args: { index } });
  };

  const onClickPile = (cardId) => {
    send({ command: "buyCard", args: { cardId } });
  };

  const onClickEndTurn = () => {
    send({ command: "endTurn" });
  };

  const renderHand = ({ hand }, showCards) => {
    const { cards } = state;
    return (
      <div className="hand">
        {hand.map((cardId, index) =>
          showCards ? (
            <PlayableCard
              key={index}
              index={index}
              card={cards[cardId]}
              onClick={onClickHandCard}
            />
          ) : (
            <div key={index} className="card-back" />
          )
        )}

        <style jsx>{`
          .hand {
            display: flex;
            flex-direction: row;
            justify-content: center;
            min-height: 160px;
          }

          .card-back {
            width: 120px;
            height: 160px;
            border-radius: 3px;
            margin: 0 3px;
            background-color: gray;
          }
        `}</style>
      </div>
    );
  };

  const renderInPlay = ({ inPlay }) => {
    return (
      <div className="in-play">
        {inPlay.map((cardId, index) => (
          <div className="card-in-play" key={`${cardId}-${index}`}>
            <Card card={cards[cardId]} />
          </div>
        ))}

        <style jsx>{`
          .in-play {
            height: 100%;
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
          }

          .card-in-play {
            font-size: 0.7rem;
            width: 80px;
            height: 100px;
            margin: 3px;
          }
        `}</style>
      </div>
    );
  };

  const renderSummary = ({ health, buys, actions, coins }) => {
    return (
      <div className="summary">
        <div>
          <strong>Health:</strong> {health}
        </div>
        <div>
          <strong>Buys:</strong> {buys}
        </div>
        <div>
          <strong>Actions:</strong> {actions}
        </div>
        <div>
          <strong>Coins:</strong> {coins}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="game">
        <div className="piles">
          {_.map(cardPiles, (pile, cardId) => (
            <CardPile
              key={cardId}
              card={cards[cardId]}
              count={pile.length}
              onClick={onClickPile}
            />
          ))}
        </div>

        <div className="play-area">
          <div className="opponents-hand">{renderHand(opponent, false)}</div>

          <div className="player-info">{renderSummary(opponent)}</div>

          <div className="in-play">{renderInPlay(opponent)}</div>

          <div className="in-play">{renderInPlay(me)}</div>

          <div className="player-info">
            {renderSummary(me)}
            <div className="actions">
              <button onClick={onClickEndTurn} disabled={!myTurn}>
                {myTurn ? "End turn" : `Opponent's turn`}
              </button>
            </div>
          </div>

          <div className="my-hand">{renderHand(me, true)}</div>
        </div>
      </div>

      {debug && <JSONTree data={state} />}

      <style jsx>{`
        .game {
          display: flex;
          flex-direction: row;
          width: 100vw;
          height: 100vh;
        }

        .piles {
          display: flex;
          flex-direction: column;
          flex-flow: column wrap;
          background-color: #ddd;
          padding: 12px;
          width: 250px;
        }

        .play-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .in-play {
          flex: 1;
        }

        .player-info {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-end;
          padding: 0 64px;
        }
      `}</style>
    </div>
  );
}

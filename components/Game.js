import _ from 'lodash'
import { Component } from 'react'
import JSONTree from 'react-json-tree'

const Badge = ({ size = 20, color, textColor = 'white', children }) => (
  <div className='badge'>
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
)

class Card extends Component {
  render() {
    const { card: { name, description, cost }} = this.props

    return (
      <div className='card'>
        <strong>{name}</strong>
        <pre>{description}</pre>
        <div className='cost'>
          <Badge color='#7394e6'>{cost}</Badge>
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
    )
  }
}

class PlayableCard extends Component {
  onClick = (e) => {
    const { index, onClick } = this.props
    onClick(index)
  }

  render() {
    const { card } = this.props

    return (
      <div className='playable-card' onClick={this.onClick}>
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
    )
  }
}

class CardPile extends Component {
  onClick = (e) => {
    const { card, onClick } = this.props
    onClick(card.id)
  }

  render() {
    const { card, count } = this.props

    return (
      <div className='card-pile' onClick={this.onClick}>
        <div className='count'>
        <Badge color='red'>{count}</Badge>
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
    )
  }
}

export default class Game extends Component {
  state = {
    roomState: null
  }

  componentDidMount() {
    const { roomName } = this.props
    const { Client } = require('colyseus.js')
    this.client = new Client(process.env.GAME_SERVER)
    this.room = this.client.join(roomName)
    
    this.onRoomUpdate = this.onRoomUpdate.bind(this)
    this.room.onUpdate.add(this.onRoomUpdate)
  }

  onRoomUpdate(state) {
    this.setState({ roomState: state })
  }

  onClickHandCard = (index) => {
    this.room.send({ command: 'playCard', args: { index }})
  }

  onClickPile = (cardId) => {
    this.room.send({ command: 'buyCard', args: { cardId }})
  }

  onClickEndTurn = () => {
    this.room.send({ command: 'endTurn' })
  }

  renderHand({ hand }, showCards) {
    const { cards } = this.state.roomState
    return (
      <div className='hand'>
        {hand.map((cardId, index) => (
          showCards ?
            <PlayableCard index={index} card={cards[cardId]} onClick={this.onClickHandCard} />
            :
            <div className='card-back' />
        ))}

        <style jsx>{`
          .hand {
            display: flex;
            flex-direction: row;
            justify-content: center;
            min-height: 160px
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
    )
  }

  renderInPlay({ inPlay }) {
    const { cards } = this.state.roomState

    return (
      <div className='in-play'>
        {inPlay.map((cardId, index) =>
          <div className='card-in-play' key={`${cardId}-${index}`}>
            <Card card={cards[cardId]} />
          </div>
        )}

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
    )
  }

  renderSummary({ health, buys, actions, coins }) {
    return (
      <div className='summary'>
        <div><strong>Health:</strong> {health}</div>
        <div><strong>Buys:</strong> {buys}</div>
        <div><strong>Actions:</strong> {actions}</div>
        <div><strong>Coins:</strong> {coins}</div>
      </div>
    )
  }

  render() {
    const { debug } = this.props
    const { roomState } = this.state
    if (!this.client || !roomState || !roomState.playing) return null

    const {
      playing,
      players,
      cardPiles,
      cards,
      currentPlayerId,
    } = roomState
    
    const opponentId = _(players).keys().without(this.client.id).first()
    const me = players[this.client.id]
    const opponent = players[opponentId]
    const myTurn = currentPlayerId === this.client.id
    
    return (
      <div>
        <div className='game'>
          <div className='piles'>
            {_.map(cardPiles, (pile, cardId) => 
              <CardPile
                key={cardId}
                card={cards[cardId]}
                count={pile.length}
                onClick={this.onClickPile}
              />
            )}
          </div>

          <div className='play-area'>
            <div className='opponents-hand'>
              {this.renderHand(opponent, false)}
            </div>

            <div className='player-info'>
              {this.renderSummary(opponent)}
            </div>

            <div className='in-play'>
              {this.renderInPlay(opponent)}
            </div>

            <div className='in-play'>
              {this.renderInPlay(me)}
            </div>

            <div className='player-info'>
              {this.renderSummary(me)}
              <div className='actions'>
                <button onClick={this.onClickEndTurn} disabled={!myTurn}>
                  {myTurn ? 'End turn' : `Opponent's turn`}
                </button>
              </div>
            </div>
            
            <div className='my-hand'>
              {this.renderHand(me, true)}
            </div>
          </div>
        </div>

        {debug && <JSONTree data={roomState} />}

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
    )
  }
}

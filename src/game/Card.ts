import State from './State'
import Player from './Player'

export type CardID = string

export const enum CardType {
  Action = 'action',
  Treasure = 'treasure',
  Attack = 'attack',
  Duration = 'duration',
}

export default interface Card {
  id: CardID
  name: string
  types: CardType[]
  description: string
  cost: number
  isKingdom?: boolean
  coin?(player: Player, state: State): number
  action?(player: Player, state: State): Promise<void>
}

export const attackAction = (amount: number) => async (player: Player, state: State) => {
  const opponent = state.getOpponent(player.id)
  opponent.takeDamage(amount)
}
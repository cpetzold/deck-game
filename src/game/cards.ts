import { map } from 'lodash'
import Card, { CardType, attackAction } from './Card'
import State from './State'
import Player, { RequiredActionType } from './Player'

export const copper: Card = {
  id: 'copper',
  name: 'Copper',
  description: '<b>+1 Coin</b>',
  types: [CardType.Treasure],
  cost: 0,
  coin: () => 1
}

export const silver: Card = {
  id: 'silver',
  name: 'Silver',
  description: '<b>+2 Coins</b>',
  types: [CardType.Treasure],
  cost: 3,
  coin: () => 2
}

export const gold: Card = {
  id: 'gold',
  name: 'Gold',
  description: '<b>+3 Coins</b>',
  types: [CardType.Treasure],
  cost: 6,
  coin: () => 3
}

export const lightAttack: Card = {
  id: 'lightAttack',
  name: 'Light Attack',
  description: 'Deal <b>1</b> Damage',
  types: [CardType.Action, CardType.Attack],
  cost: 2,
  action: attackAction(1)
}

export const mediumAttack: Card = {
  id: 'mediumAttack',
  name: 'Medium Attack',
  description: 'Deal <b>3</b> Damage',
  types: [CardType.Action, CardType.Attack],
  cost: 5,
  action: attackAction(3)
}

export const heavyAttack: Card = {
  id: 'heavyAttack',
  name: 'Heavy Attack',
  description: 'Deal <b>6</b> Damage',
  types: [CardType.Action, CardType.Attack],
  cost: 8,
  action: attackAction(6)
}

export const village: Card = {
  id: 'village',
  name: 'Village',
  description: '<b>+1 Card<br />+2 Actions</b>',
  types: [CardType.Action],
  cost: 3,
  isKingdom: true,
  action: async (player: Player, state: State) => {
    player.drawCard()
    player.actions += 2
  }
}

export const draw: Card = {
  id: 'draw',
  name: 'Draw',
  description: '<b>+3 Cards</b>',
  types: [CardType.Action],
  cost: 4,
  isKingdom: true,
  action: async (player: Player, state: State) => {
    player.drawCards(3)
  }
}

export const shield: Card = {
  id: 'shield',
  name: 'Shield',
  description: '<b>+5 Armor</b>',
  types: [CardType.Action],
  cost: 3,
  isKingdom: true,
  action: async (player: Player, state: State) => {
    player.armor += 5
  }
}

export const trash: Card = {
  id: 'trash',
  name: 'Trash',
  description: 'Trash up to <b>3</b> cards from your <i>hand</i>',
  types: [CardType.Action],
  cost: 4,
  isKingdom: true,
  action: async (player: Player, state: State) => {
    const { indices } = await player.waitForRequiredAction({
      description: 'Choose cards to trash',
      type: RequiredActionType.TrashFromHand,
      args: {
        min: 0,
        max: 3,
        possibleIndices: map(player.hand, (val, i) => i)
      }
    })

    state.trashCards(player, indices)
  }
}
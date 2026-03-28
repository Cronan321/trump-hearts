// Shared TypeScript types mirroring the backend Pydantic models

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export interface RuleConfig {
  passing_direction: 'left' | 'right' | 'across' | 'keep'
  jack_of_diamonds: boolean
  shoot_the_moon: 'add_to_others' | 'subtract_from_self'
  breaking_hearts: boolean
  first_trick_points: boolean
}

export interface PlayerState {
  player_id: string
  username: string
  seat_index: number
  hand: Card[]          // only populated for the local player
  hand_size: number
  cumulative_score: number
  round_score: number
  avatar_url: string | null
}

export interface TrickState {
  trick_number: number
  led_suit: string | null
  cards_played: Record<string, Card>  // player_id -> Card
  current_player_id: string | null
}

export type GamePhase = 'waiting' | 'passing' | 'playing' | 'round_end' | 'game_end'

export interface GameState {
  game_id: string
  table_id: string
  round_number: number
  passing_direction: string
  phase: GamePhase
  players: PlayerState[]
  current_trick: TrickState | null
  hearts_broken: boolean
  winners: string[] | null
}

export interface TableResponse {
  table_id: string
  name: string
  player_count: number
  max_players: number
  rule_config: RuleConfig
  status: 'waiting' | 'in_progress' | 'finished'
}

/** @deprecated Use TableResponse */
export type TableInfo = TableResponse

export interface User {
  user_id: string
  username: string
  email: string
  coin_balance: number
}

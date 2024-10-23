import * as fs from 'fs';
export namespace Deck {
    export enum CARD {
        ACE = 11,
        KING = 10,
        QUEEN = 10,
        JACK = 10,
        TEN = 10,

        NINE = 9,
        EIGHT = 8,
        SEVEN = 7,
        SIX = 6,
        FIVE = 5,
        FOUR = 4,
        THREE = 3,
        TWO = 2,
    };

    export function getCardValue([_, value]: [CARD, number]): number {
      return value;
    }

    export type Hand = {
        cards: [Deck.CARD, number][]
        cardNames: Deck.CARD[]
        soft: number,
        hard: number,
        pairs: [Deck.CARD, number][]
    };

    export function fisherYatesShuffle(deck: any[]): any[] {
        for(let i = deck.length -1; i > 0; i--) {
            const j = Math.floor(Math.random() * i);
            const cache = deck[i];
            deck[i] = deck[j];
            deck[j] = cache;
        }

        return deck;
    }

    export class PlayDeck {
        public readonly deckCount: number;
        private _set: [Deck.CARD, number][];

        private constructDeck(deckCount: number): [Deck.CARD, number][] {
            const keys = Object.entries(CARD).filter(([_, value]) => typeof value === "number");
            const set = Array(deckCount).fill(
                keys.map(card => Array(4).fill(card)).flat()
            ).flat();

            return fisherYatesShuffle(set);
        }

        constructor(deckCount: number) {
            this.deckCount = deckCount;
            this._set = this.constructDeck(deckCount);
        }

        drawCard(): [Deck.CARD, number] {
            if(!this._set.length) this._set = this.constructDeck(this.deckCount);
            
            return this._set.shift() as [Deck.CARD, number];
        }
    }
}

export enum ACTION {
    STAND = 'stand',
    HIT = 'hit',
    DOUBLE_DOWN = 'double_down',
    SPLIT = 'split'
}

export enum PLAY_STRATEGY {
    DEALERS_UPCARD = "dealer's_upcard",
    SOFT_HARD_HANDS = "soft_hard_hands",
    SPLITTING_PAIRS = "splitting_pairs"
}

export const TARGET_VALUE = 21;
export const DEALER_MIN = 17;

export function getValue(card: Deck.CARD): number {
    switch (card) {
        case Deck.CARD.TWO:
        case Deck.CARD.THREE:
        case Deck.CARD.FOUR:
        case Deck.CARD.FIVE:
        case Deck.CARD.SIX:
            return 1;
        case Deck.CARD.SEVEN:
        case Deck.CARD.EIGHT:
        case Deck.CARD.NINE:
            return 0;
        case Deck.CARD.TEN:
        case Deck.CARD.JACK:
        case Deck.CARD.QUEEN:
        case Deck.CARD.KING:
        case Deck.CARD.ACE:
            return -1;
    }
}

export function getHandValue(...cards: [Deck.CARD, number][]): Deck.Hand {
    const soft = (() => {
        let val = 0;
        cards.forEach((card, index) => val += card[1] === Deck.CARD.ACE ?
            cards.findIndex(([_, value]) => value === card[1]) === index ? Deck.getCardValue(card) : 1
            : Deck.getCardValue(card)
        );
        return val;
    })()
    const hard = (() => {
        return cards.reduce((prev, current) => { return prev + current[1]; }, 0)
    })();
    const pairs = cards.length > 2 ? [] :
        (() => cards.filter((card, i) => cards.findIndex(el => card === el) !== i))();
    const cardNames = cards.map(([card, _]) => card);

    return { cards, cardNames, soft, hard, pairs }
}

//@todo place enumuerators
export function dealersUpcard(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]): ACTION {
    const hand = getHandValue(...cards);
    const handValue = hand.hard > TARGET_VALUE ? hand.hard : hand.soft;
    const stiff = () => {
        if(handValue <= 8) return ACTION.HIT;
        if(handValue === 9) return 3 <= dealerCard[1] && dealerCard[1] <= 6 ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard[1] ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(12 <= handValue  && handValue <= 16) return 4 <= dealerCard[1] && dealerCard[1] <= 6 ? ACTION.STAND : ACTION.HIT;
        else return ACTION.STAND;
    }
    const nonStiff = () => {
        if(handValue <= 8) return ACTION.HIT;
        if(handValue === 9) return ACTION.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard[1] ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(12 <= handValue  && handValue <= 16) return ACTION.HIT;
        else return ACTION.STAND;
    }

    return dealerCard[1] >= 7 ? nonStiff() : stiff();
}

// //@todo place enumuerators
export function softHardHands(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]) {
    const hand = getHandValue(...cards);
    const soft = () => {
        if(hand.soft < 13) return ACTION.STAND;
        if(hand.soft <= 14) return dealerCard[1] === 5 || dealerCard[1] === 6 ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(hand.soft <= 16) return 4 <= dealerCard[1] && dealerCard[1] <= 6 ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(hand.soft === 17) return 3 <= dealerCard[1] && dealerCard[1] <= 6 ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(hand.soft === 18) {
            if(3 <= dealerCard[1] && dealerCard[1] <= 6) return ACTION.DOUBLE_DOWN;
            if(dealerCard[1] === 2 || dealerCard[1] === 7 || dealerCard[1] === 8) return ACTION.STAND;
            else return ACTION.HIT;
        }
        else return ACTION.STAND;
    }
    const hard = () => {
        if(hand.hard <= 8) return ACTION.HIT;
        if(hand.hard === 9) return dealerCard[1] >= 3 && dealerCard[1] <= 6 ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(hand.hard <= 11) return hand.hard > dealerCard[1] ? ACTION.DOUBLE_DOWN : ACTION.HIT;
        if(hand.hard === 12) return dealerCard[1] >= 4 && dealerCard[1] <= 6 ? ACTION.STAND : ACTION.HIT;
        if(hand.hard <= 16) return dealerCard[1] <= 6 ? ACTION.STAND : ACTION.HIT;
        else return ACTION.STAND;
    }

    return {
        hard: hard(),
        soft: soft()
    };
}

//@todo place enumuerators
export function splittingPairs(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]): {action: ACTION, card?: [Deck.CARD, number]}  {
    const hand = getHandValue(...cards);
    let pair;
    if(pair = hand.pairs.find(([_, value]) => value === 2)) return {action: dealerCard[1] <= 7 ? ACTION.SPLIT: ACTION.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 3)) return {action: dealerCard[1] <= 7 ? ACTION.SPLIT: ACTION.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 4)) return {action: dealerCard[1] >= 5 && dealerCard[1] <= 6 ? ACTION.SPLIT: ACTION.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 5)) return {action: dealerCard[1] <= 9 ? ACTION.DOUBLE_DOWN: ACTION.HIT};
    if(pair = hand.pairs.find(([_, value]) => value === 6)) return {action: dealerCard[1] <= 6 ? ACTION.SPLIT: ACTION.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 7)) return {action: dealerCard[1] <= 7  ? ACTION.SPLIT: ACTION.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 8)) return {action: ACTION.SPLIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 9)) return {
        action: dealerCard[1] === 7 || dealerCard[1] === 10 || dealerCard[1] === 11?
            ACTION.STAND : ACTION.SPLIT,
        card: pair
    }
    if(pair = hand.pairs.find(([_, value]) => value === 10)) return {action: ACTION.STAND}
    if(pair = hand.pairs.find(([_, value]) => value === 11)) return {action: ACTION.SPLIT, card: pair}
    return {action: ACTION.STAND}
}


export class CardCounter {
    private _count: number = 0;

    public get count() { return this._count };
    public add(...cards: [Deck.CARD, number][]): number {
        return this._count += cards.reduce(
            (prev, current) => { return prev += Deck.getCardValue(current)}, 0);
    }
}

export class CardPlayer {
    private _counter: CardCounter = new CardCounter();
    private _bankRoll: number = 1000;
    private _bet = 1;

    constructor (bankRoll: number, bet: number) {
        this._bankRoll = bankRoll;
        this._bet = bet;
    }

    public playHand(dealerCard: [Deck.CARD, number], playerCards: [Deck.CARD, number][]) {
        this._counter.add(dealerCard, ...playerCards);
        if(this._counter.count > 0) this._bet = Math.min(this._bankRoll, this._bet * 2);
        else this._bet = 1;
    }
}

export class StatsTracker { 
    private wins: number = 0;
    private losses: number = 0;
    private draw: number = 0;
    private round: number = 0;

    addResult(value: number) { 
        if(value === -1) { this.losses++; }
        if(value === 0) { this.draw++; }
        if(value === 1) { this.wins++; }
    }
    addRound() { this.round++; }

    log() { 
        console.log(`Wins: ${this.wins}`)
        console.log(`Losses: ${this.losses}`)
        console.log(`Draws: ${this.draw}`)
    }
}

export class Logger { 
    private static _logs: string[] = [];

    static log(msg: string, verbose: boolean = true) {
        if(verbose) console.log(msg);
        this._logs.push(msg);
    }

    static exportToFile() { 
        fs.writeFileSync("./export.txt", this._logs.join('\n'));
    }
}
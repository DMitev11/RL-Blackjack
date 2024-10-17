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

        drawCard(): [Deck.CARD, number] | undefined{
            let card = this._set.shift();
            if(!card) this._set = this.constructDeck(this.deckCount);
            else return card; 

            return this._set.shift();
        }
    }
}

export enum PLAY_STRATEGY { 
    DEALERS_UPCARD = "dealer's_upcard",
    SOFT_HARD_HANDS = "soft_hard_hands",
    SPLITTING_PAIRS = "splitting_pairs"
}
 
export const TARGET_VALUE = 21;
export const DEALER_MIN = 17;

export enum PLAY { 
    STAND = 'stand',
    HIT = 'hit',
    DOUBLE_DOWN = 'double_down',
    SPLIT = 'split'
}

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
    const soft: () => number = () => {
        let val = 0;
        cards.forEach((card, index) => val += card[1] === Deck.CARD.ACE ?
            cards.findIndex(([_, value]) => value === card[1]) === index ? Deck.getCardValue(card) : 1
            : Deck.getCardValue(card)
        );
        return val;
    }
    const hard = () => {
        return cards.reduce((prev, current) => { return prev + current[1]; }, 0)
    };
    const pairs = () => cards.filter((card, i) => cards.findIndex(el => card === el) !== i);

    return {
        cards,
        soft: soft(),
        hard: hard(),
        pairs: pairs()
    }
}

//@todo place enumuerators
export function dealersUpcard(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]): PLAY { 
    const hand = getHandValue(...cards);
    const handValue = hand.hard > TARGET_VALUE ? hand.hard : hand.soft;
    const stiff = () => { 
        if(handValue <= 8) return PLAY.HIT;
        if(handValue === 9) return 3 <= dealerCard[1] && dealerCard[1] <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard[1] ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(12 <= handValue  && handValue <= 16) return 4 <= dealerCard[1] && dealerCard[1] <= 6 ? PLAY.STAND : PLAY.HIT;
        else return PLAY.STAND;
    }
    const nonStiff = () => { 
        if(handValue <= 8) return PLAY.HIT;
        if(handValue === 9) return PLAY.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard[1] ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(12 <= handValue  && handValue <= 16) return PLAY.HIT;
        else return PLAY.STAND;
    }
    
    return dealerCard[1] >= 7 ? nonStiff() : stiff();
}

// //@todo place enumuerators
export function softHardHands(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]) { 
    const hand = getHandValue(...cards);
    const soft = () => {
        if(hand.soft < 13) return PLAY.STAND;
        if(hand.soft <= 14) return dealerCard[1] === 5 || dealerCard[1] === 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft <= 16) return 4 <= dealerCard[1] && dealerCard[1] <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft === 17) return 3 <= dealerCard[1] && dealerCard[1] <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft === 18) {        
            if(3 <= dealerCard[1] && dealerCard[1] <= 6) return PLAY.DOUBLE_DOWN;
            if(dealerCard[1] === 2 || dealerCard[1] === 7 || dealerCard[1] === 8) return PLAY.STAND;
            else return PLAY.HIT;
        }
        else return PLAY.STAND;
    }
    const hard = () => { 
        if(hand.hard <= 8) return PLAY.HIT;
        if(hand.hard === 9) return dealerCard[1] >= 3 && dealerCard[1] <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.hard <= 11) return hand.hard > dealerCard[1] ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.hard === 12) return dealerCard[1] >= 4 && dealerCard[1] <= 6 ? PLAY.STAND : PLAY.HIT;
        if(hand.hard <= 16) return dealerCard[1] <= 6 ? PLAY.STAND : PLAY.HIT;
        else return PLAY.STAND;
    }
    
    return {
        hard: hard(),
        soft: soft()
    };
}

//@todo place enumuerators
export function splittingPairs(dealerCard: [Deck.CARD, number], ...cards: [Deck.CARD, number][]): {action: PLAY, card?: [Deck.CARD, number]}  { 
    const hand = getHandValue(...cards);
    let pair;
    if(pair = hand.pairs.find(([_, value]) => value === 2)) return {action: dealerCard[1] <= 7 ? PLAY.SPLIT: PLAY.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 3)) return {action: dealerCard[1] <= 7 ? PLAY.SPLIT: PLAY.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 4)) return {action: dealerCard[1] >= 5 && dealerCard[1] <= 6 ? PLAY.SPLIT: PLAY.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 5)) return {action: dealerCard[1] <= 9 ? PLAY.DOUBLE_DOWN: PLAY.HIT};
    if(pair = hand.pairs.find(([_, value]) => value === 6)) return {action: dealerCard[1] <= 6 ? PLAY.SPLIT: PLAY.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 7)) return {action: dealerCard[1] <= 7  ? PLAY.SPLIT: PLAY.HIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 8)) return {action: PLAY.SPLIT, card: pair};
    if(pair = hand.pairs.find(([_, value]) => value === 9)) return {
        action: dealerCard[1] === 7 || dealerCard[1] === 10 || dealerCard[1] === 11? 
            PLAY.STAND : PLAY.SPLIT,
        card: pair
    }
    if(pair = hand.pairs.find(([_, value]) => value === 10)) return {action: PLAY.STAND}
    if(pair = hand.pairs.find(([_, value]) => value === 11)) return {action: PLAY.SPLIT, card: pair}
    return {action: PLAY.STAND}
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
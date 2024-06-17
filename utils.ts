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

export enum PLAY_STRATEGY { 
    DEALERS_UPCARD = "dealer's_upcard",
    SOFT_HARD_HANDS = "soft_hard_hands"
}

export const TARGET_VALUE = 21;

export enum PLAY { 
    HIT = 'hit',
    DOUBLE_DOWN = 'double_down',
    STAND = 'stand'
}

export function getCardValue(card: CARD): number { 
    switch (card) {  
        case CARD.TWO:
        case CARD.THREE:
        case CARD.FOUR:
        case CARD.FIVE:
        case CARD.SIX:
            return 1;
        case CARD.SEVEN:
        case CARD.EIGHT:
        case CARD.NINE:
            return 0;
        case CARD.TEN:
        case CARD.JACK:
        case CARD.QUEEN:
        case CARD.KING:
        case CARD.ACE:
            return -1;
    }
}

export function getHandValue(...cards: CARD[]): {soft: number, hard: number} {
    const soft = () => cards.reduce((prev, current) => prev += current === CARD.ACE ? 1 : current);
    const hard = () => {
        let hasAce = false;
        return cards.reduce((prev, current) => { 
            prev += current === CARD.ACE && hasAce ? 1 : current;
            if(current === CARD.ACE) hasAce = true;
            return prev;
        })
    };

    return {
        soft: soft(),
        hard: hard()
    }
}

function dealersUpcard(dealerCard: CARD, ...cards: CARD[]): PLAY { 
    const hand = getHandValue(...cards);
    const handValue = hand.hard > TARGET_VALUE ? hand.hard : hand.soft;
    const stiff = () => { 
        if(handValue <= 8) return PLAY.HIT;
        if(handValue === 9) return 3 <= dealerCard && dealerCard <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(12 <= handValue  && handValue <= 16) return 4 <= dealerCard && dealerCard <= 6 ? PLAY.STAND : PLAY.HIT;
        else return PLAY.STAND;
    }
    const nonStiff = () => { 
        if(handValue <= 8) return PLAY.HIT;
        if(handValue === 9) return PLAY.HIT;
        if(handValue === 10 || handValue === 11) return handValue > dealerCard ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(12 <= handValue  && handValue <= 16) return PLAY.HIT;
        else return PLAY.STAND;
    }

    return dealerCard >= 7 ? nonStiff() : stiff();
}

function softHardHands(dealerCard: CARD, ...cards: CARD[]) { 
    const hand = getHandValue(...cards);
    const soft = () => {
        if(hand.soft === 13 || hand.soft === 14) return dealerCard === 5 || dealerCard === 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft === 15 || hand.soft === 16) return 4 <= dealerCard && dealerCard <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft === 17) return 3 <= dealerCard && dealerCard <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
        if(hand.soft === 18) return 3 <= dealerCard && dealerCard <= 6 ? PLAY.DOUBLE_DOWN : PLAY.HIT;
    }
}

export function BasicStrategyAction (
    strategy: PLAY_STRATEGY, 
    dealerCard: CARD, 
    ...cards: CARD[]
) { 

}


export class CardCounter {  
    private _count: number = 0;

    public get count() { return this._count };
    public add(...cards: CARD[]): number { 
        return this._count += cards.reduce(
            (prev, current) => { return prev += getCardValue(current) }
        );
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

    public playHand(dealerCard: CARD, playerCards: CARD[]) { 
        this._counter.add(dealerCard, ...playerCards);
        if(this._counter.count > 0) this._bet = Math.min(this._bankRoll, this._bet * 2);
        else this._bet = 1;
    }
}
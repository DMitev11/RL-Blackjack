import { DealerHand, PlayHand } from "./hand";
import { ModelRequest } from './request';
import { Deck, ACTION, Logger, dealersUpcard, softHardHands, splittingPairs, TARGET_VALUE } from './utils';

export class Playthrough { 
    private _hands: PlayHand[];
    private _dealer: DealerHand;
    constructor(private _params:{deck: Deck.PlayDeck}, manualPlay: boolean = true) {
        this._hands = [new PlayHand([this._params.deck.drawCard(), this._params.deck.drawCard()], manualPlay)];
        this._dealer = new DealerHand([this._params.deck.drawCard()]);
    }
    
    async play(): Promise<number[]> {
        let dealerTurn = false;
        
        console.log('\n');
        await ModelRequest.startGame(this._hands[0].handValue.cardNames.map(card => card.toString()), this._dealer.handValue.cardNames[0].toString());
        while(!dealerTurn) { 
            dealerTurn = true;
            for(let i = this._hands.length -1; i >=0; i--) { 
                const hand = this._hands[i];
                if(hand.done) continue;
                dealerTurn = false;
                
                console.log(`Hand ${i}`);
                this.logDealerCards(hand.manualPlay);
                this.logHand(i, hand.manualPlay);
                
                const dealersUpcard = this.dealersUpcard(i, hand.manualPlay);
                const softHardHands = this.softHardHands(i, hand.manualPlay);
                const splittingPairs = this.splittingPairs(i, hand.manualPlay);
                const modelPrediction = await this.modelPrediction(i, hand.manualPlay);
                
                const action: ACTION = hand.manualPlay? 
                await hand.play() : 
                this.autoPlay([dealersUpcard, softHardHands.soft, softHardHands.hard, splittingPairs.action]);
                
                this.handActionEvaluate(i, action);  
                this._hands[i].done = this.handBust(i);

                await ModelRequest.step(i, Object.values(ACTION).indexOf(action))
            }
        }
        
        while(!this._dealer.done) { 
            const action = await this._dealer.play(); 
            this.dealerActionEvaluate(action);
        }
        let dealerHand = this._dealer.handValue;
        Logger.log(`\n`);
        Logger.log(`Dealer's hand is ${dealerHand.cardNames}`);
        
        const score: number[] = [];
        for(let i = 0; i < this._hands.length; i++) { 
            const {soft, hard, cardNames} = this._hands[i].handValue;
            if(soft > TARGET_VALUE) { 
                Logger.log(`Hand ${i} is bust`)
                score.push(-1);
                continue;
            }
            
            let handScore:number = 0;
            if(dealerHand.hard > TARGET_VALUE) {
                handScore = 1;
                Logger.log(`Dealer is bust with ${dealerHand.cardNames}`);
                Logger.log(`Hand ${i} win with ${cardNames}`);
            }
            else if(dealerHand.hard == soft || dealerHand.hard === hard ) {
                handScore = 0; 
                Logger.log(`Hand ${i} drew with ${cardNames}`);
            }
            else {
                handScore = (soft <= TARGET_VALUE && soft > dealerHand.hard) || (hard <= TARGET_VALUE && hard > dealerHand.hard) ? 
                    1 : -1;
                Logger.log(`Hand ${i} ${ handScore === 1 ? 'won' : 'lost'} with ${cardNames}`);
            }
            score.push(handScore);
        }

        return score;
    }
    
    private handBust(index: number): boolean { 
        const {soft} = this._hands[index].handValue;
        return soft > TARGET_VALUE
    }

    private handActionEvaluate(index: number, action: ACTION) {
        switch(action) { 
            case ACTION.HIT: {
                const card = this._params.deck.drawCard() as [Deck.CARD, number];
                this._hands[index].addCard(card);
                ModelRequest.add_player_cards([card[0].toString()], index);
                break;
            }
            case ACTION.DOUBLE_DOWN: {
                const cards = [this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
                this._hands[index].addCard(...cards);
                ModelRequest.add_player_cards(cards.map(([card, _]) => card.toString()), index);
                break;
            }
            case ACTION.SPLIT: { 
                const card = this._hands[index].handValue.pairs[0];
                this._hands[index].removeCard(card);
                ModelRequest.remove_player_card(card[0].toString(), index);
                
                const newHandCards = [card, this._params.deck.drawCard()];
                this._hands.push(new PlayHand(newHandCards, this._hands[index].manualPlay));
                ModelRequest.add_player_hand(newHandCards.map(([card, _]) => card.toString()));

                this._hands[index].addCard(this._params.deck.drawCard());
                break;
            }
            case ACTION.STAND: { 
                break;
            }
        }     
    }

    private dealerActionEvaluate(action: ACTION) {
        if(action === ACTION.HIT) this._dealer.addCard(this._params.deck.drawCard()); 
    }

    private autoPlay(suggestions: ACTION[]) { 
        const total = suggestions.reduce((prev, curr) => {
            prev[curr] = (prev[curr] || 0) + 1; 
            return prev
        },{} as Record<ACTION, number>);

        const entries: [string, number][] = Object.entries(total).sort((a, b) => b[1] - a[1]);
        if(entries.find(([name, _]) => name === ACTION.SPLIT)) return ACTION.SPLIT;
        else return entries[0][0] as ACTION;
    }

    private logDealerCards(manualPlay = true) { 
        const cards = this._dealer.cards.map(([card, _]) => card);
        Logger.log(`Dealer's cards are ${cards}`, manualPlay);
    }

    private logHand(index: number, manualPlay = true) { 
        const {cardNames, soft, hard, pairs} = this._hands[index].handValue;
        Logger.log(`You have: ${cardNames} 
            soft: ${soft} 
            hard: ${hard} 
            pairs: ${pairs}`,
        manualPlay);
    }

    private async modelPrediction(index: number, manualPlay = true): Promise<{prediction: number, action: number}> { 
        const {prediction, action, result} = await ModelRequest.predict(index);
        Logger.log(`Model suggests ${Object.keys(ACTION)[parseInt(action)]}`, manualPlay);

        return {prediction, action};
    }

    private dealersUpcard(index: number, manualPlay = true) { 
        const {cards} = this._hands[index].handValue;
        const dealerCard = this._dealer.cards[0];

        const suggestion = dealersUpcard(dealerCard, ...cards);
        Logger.log(`Dealer's Upcard suggests '${suggestion.toUpperCase()}'`, manualPlay)

        return suggestion
    }

    private softHardHands(index: number, manualPlay = true) { 
        const {cards} = this._hands[index].handValue;
        const dealerCard = this._dealer.cards[0];

        const suggestion = softHardHands(dealerCard, ...cards);
        Logger.log(`Soft Hands suggests '${suggestion.soft.toUpperCase()}'`, manualPlay)
        Logger.log(`Hard Hands suggests '${suggestion.hard.toUpperCase()}'`, manualPlay)

        return suggestion;
    }

    private splittingPairs(index: number, manualPlay = true) { 
        const {cards} = this._hands[index].handValue;
        const dealerCard = this._dealer.cards[0];

        const suggestion = splittingPairs(dealerCard, ...cards);
        Logger.log(`Split Pairs suggests '${suggestion.action.toUpperCase()}'`, manualPlay)

        return suggestion;
    }
}

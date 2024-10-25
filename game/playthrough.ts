import { DealerHand, PlayHand } from "./hand";
import { ModelRequest } from './request';
import { Deck, ACTION, Logger, dealersUpcard, softHardHands, splittingPairs, TARGET_VALUE } from './utils';

export enum ModelTypes {
    Average,
    StandOnly,
    MultiHand,
    Random,
}
export class Playthrough { 
    private _hands: PlayHand[];
    private _dealer: DealerHand;
    
    private handBust(index: number): boolean { 
        const {soft} = this._hands[index].handValue;
        return soft > TARGET_VALUE
    }

    private async handActionEvaluate(index: number, action: ACTION) {
        const handValue: Deck.Hand = this._hands[index].handValue;
        switch(action) { 
            case ACTION.STAND: { 
                this._hands[index].done = true
                break;
            }
            case ACTION.HIT: {
                const card = this._params.deck.drawCard() as [Deck.CARD, number];
                this._hands[index].addCard(card);

                if(this.manualPlay || this._model == ModelTypes.MultiHand) await ModelRequest.add_player_cards([card[0].toString()], index, "multihand");
                break;
            }
            case ACTION.DOUBLE_DOWN: {
                if(handValue.cards.length > 2) break;

                const cards = [this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
                this._hands[index].addCard(...cards);
                if(this.manualPlay || this._model === ModelTypes.MultiHand) ModelRequest.add_player_cards(cards.map(([card, _]) => card.toString()), index, "multihand");
                this._hands[index].done = true
                break;
            }
            case ACTION.SPLIT: { 
                if(handValue.pairs.length <= 0) break;

                const card = this._hands[index].handValue.pairs[0];
                this._hands[index].removeCard(card);
                if(this.manualPlay || this._model === ModelTypes.MultiHand) ModelRequest.remove_player_card(card[0].toString(), index, "multihand");
                
                const newHandCards = [card, this._params.deck.drawCard()];
                this._hands.push(new PlayHand(newHandCards, this._hands[index].manualPlay));
                if(this.manualPlay || this._model === ModelTypes.MultiHand) ModelRequest.add_player_hand(newHandCards.map(([card, _]) => card.toString()), "multihand");

                this._hands[index].addCard(this._params.deck.drawCard());
                break;
            }
        }    
        
        this._hands[index].action = action
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

    private async modelPrediction(index: number, manualPlay = true, prefix = ""): Promise<{prediction: number, action: number}> { 
        const {prediction, action, result} = await ModelRequest.predict(index, prefix);
        Logger.log(`${prefix.toUpperCase()} Model suggests ${Object.keys(ACTION)[parseInt(action)]}`, manualPlay);

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

    constructor(private _params:{deck: Deck.PlayDeck}, private manualPlay: boolean = true, private _model: ModelTypes = ModelTypes.Average) {
        this._hands = [new PlayHand([this._params.deck.drawCard(), this._params.deck.drawCard()], this.manualPlay)];
        this._dealer = new DealerHand([this._params.deck.drawCard()]);
    }
    
    async play(): Promise<number[]> {
        let dealerTurn = false;
        
        const playerCards = this._hands[0].handValue.cardNames.map(card => card.toString())
        const dealerCards = this._dealer.handValue.cardNames[0].toString()
        if(this.manualPlay || this._model === ModelTypes.MultiHand) {
            await ModelRequest.resetGame("multihand");
            await ModelRequest.startGame(playerCards, dealerCards, "multihand");
        }
        
        let action: ACTION = ACTION.STAND;
        while(!dealerTurn) { 
            dealerTurn = true;
            const handsLeft = this._hands.length -1
            if(handsLeft > 0) await ModelRequest.step(Object.values(ACTION).indexOf(action), "multihand")
            for(let i = handsLeft; i >= 0; i--) { 
                const hand = this._hands[i];
                if(hand.done) continue;
                dealerTurn = false;
                
                if(hand.manualPlay) {
                    console.log(`\nHand ${i}`);
                    this.logDealerCards(hand.manualPlay);
                    this.logHand(i, hand.manualPlay);
                    
                    this.dealersUpcard(i, hand.manualPlay);
                    this.softHardHands(i, hand.manualPlay);
                    this.splittingPairs(i, hand.manualPlay);
                    await this.modelPrediction(i, hand.manualPlay, "multihand");

                    action = await hand.play();
                }
                else { 
                    if(this._model === ModelTypes.MultiHand) {
                        const multihandModelPrediction = await this.modelPrediction(i, hand.manualPlay, "multihand");
                        action = Object.values(ACTION)[multihandModelPrediction.action];
                    }  
                    if(this._model === ModelTypes.Average) {
                        const dealersUpcard = this.dealersUpcard(i, hand.manualPlay);
                        const softHardHands = this.softHardHands(i, hand.manualPlay);
                        const splittingPairs = this.splittingPairs(i, hand.manualPlay);
                        action = this.autoPlay([dealersUpcard, softHardHands.soft, softHardHands.hard, splittingPairs.action]);
                    }
                    if(this._model === ModelTypes.StandOnly) {
                        action = ACTION.STAND;
                    }
                    if(this._model === ModelTypes.Random) {
                        const actions = Object.values(ACTION);
                        action = actions[Math.round(Math.random() * (actions.length - 1))];
                    }
                }
                
                await this.handActionEvaluate(i, action);  
                this._hands[i].done = this.handBust(i);
            }
        }
        
        while(!this._dealer.done) { 
            const action = await this._dealer.play(); 
            this.dealerActionEvaluate(action);
        }
        let dealerHand = this._dealer.handValue;
        
        const score: number[] = [];
        for(let i = 0; i < this._hands.length; i++) { 
            
            if(this._hands[i].manualPlay){
                Logger.log(`\n`);
                Logger.log(`Dealer's hand is ${dealerHand.cardNames}`);
            }
            const {soft, hard, cardNames} = this._hands[i].handValue;
            if(soft > TARGET_VALUE) { 
                Logger.log(`Hand ${i} is bust`, this._hands[i].manualPlay)
                score.push(-1);
                continue;
            }
            
            let handScore:number = 0;
            if(dealerHand.hard > TARGET_VALUE) {
                handScore = 1;
                Logger.log(`Dealer is bust with ${dealerHand.cardNames}`, this._hands[i].manualPlay);
                Logger.log(`Hand ${i} win with ${cardNames}`, this._hands[i].manualPlay);
            }
            else if(dealerHand.hard == soft || dealerHand.hard === hard ) {
                handScore = 0; 
                Logger.log(`Hand ${i} drew with ${cardNames}`, this._hands[i].manualPlay);
            }
            else {
                handScore = (soft <= TARGET_VALUE && soft > dealerHand.hard) || (hard <= TARGET_VALUE && hard > dealerHand.hard) ? 
                    1 : -1;
                Logger.log(`Hand ${i} ${ handScore === 1 ? 'won' : 'lost'} with ${cardNames}`, this._hands[i].manualPlay);
            }
            score.push(handScore);
        }

        if(this.manualPlay || this._model === ModelTypes.MultiHand) {
            await ModelRequest.setReward(score.reduce((acc, val) => acc + val, 0), "multihand")
            await ModelRequest.step(Object.values(ACTION).indexOf(action), "multihand")
        }
        return score;
    }
}

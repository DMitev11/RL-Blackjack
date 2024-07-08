import * as fs from "fs";
import AsyncAction from "./AsyncAction";
import { DEALER_MIN, dealersUpcard, Deck, getHandValue, PLAY, softHardHands, splittingPairs, TARGET_VALUE } from "./utils";
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class Logger { 
    private static _logs: string[] = [];

    static log(msg: string, verbose: boolean = true) {
        if(verbose) console.log(msg);
        this._logs.push(msg);
    }

    static exportToFile() { 
        fs.writeFileSync("./export.txt", this._logs.join('\n'));
    }
}

class PlayHand { 
    private _cards: [Deck.CARD, number][];
    private _playerWait?: AsyncAction;
    private _playAction?: PLAY;
    private _verbose = false;
    
    constructor(params: {deck: Deck.PlayDeck}, card?: [Deck.CARD, number])
    {
        this._cards = [card? card : params.deck.drawCard() as [Deck.CARD, number], params.deck.drawCard() as [Deck.CARD, number]];
        this._playerWait = undefined;
        this._playAction = undefined;
    }

    get handValue() { 
        return getHandValue(...this._cards);
    }

    get skipped() { 
        return this._playAction === PLAY.STAND || this._playAction === PLAY.DOUBLE_DOWN;
    }

    addCard(...cards: [Deck.CARD, number][]) { 
        this._cards.push(...cards);
    }

    removeCard(card: [Deck.CARD, number]) { 
        this._cards.splice(this._cards.findIndex((el) => el === card), 1);
    }

    async playAction(dealerCard: [Deck.CARD, number], manualPlay: boolean): Promise<{play: PLAY, card?: [Deck.CARD, number]}> { 
        let playerHand = this.handValue;
        this._playerWait = new AsyncAction();
        
        Logger.log(`You have: soft ${playerHand.soft} and hard ${playerHand.hard} with pairs ${playerHand.pairs}. Dealer's card is ${dealerCard[0]}`, this._verbose);
        const dealersCard = dealersUpcard(dealerCard, ...playerHand.cards);
        const softHard = softHardHands(dealerCard, ...playerHand.cards);
        const splitPairs = splittingPairs(dealerCard, ...playerHand.cards);
        Logger.log(`Dealer's Upcard suggests '${dealersCard.toUpperCase()}'`, this._verbose)
        Logger.log(`Soft Hands suggests '${softHard.soft.toUpperCase()}'`, this._verbose)
        Logger.log(`Hard Hands suggests '${softHard.hard.toUpperCase()}'`, this._verbose)
        Logger.log(`Split Pairs suggests '${splitPairs.action.toUpperCase()}'`, this._verbose)
        Logger.log(`Valid actions are: ${Object.keys(PLAY).map((action, i) => ` key ${i} for action ${action}`)}`, this._verbose)
        
        if(manualPlay) {
            rl.question(`What is your action? `, this._manualPlay.bind(this));
            await this._playerWait.wait();
        }
        else this._averagePlay([dealersCard, softHard.soft, softHard.hard, splitPairs.action]);

        Logger.log(`It chose ${this._playAction?.toUpperCase()}`, this._verbose)

        if(this._playAction === PLAY.SPLIT) return {play: splitPairs.action, card: splitPairs.card}
        return {play: this._playAction as PLAY}
    }

    private async _manualPlay(input: string) { 
        const i = parseInt(input);
        const values = Object.values(PLAY);
        this._playAction = values[i];
        this._playerWait?.complete();
    }

    private async _averagePlay(suggestions: PLAY[]) { 
        const total = suggestions.reduce((prev, curr) => {
            prev[curr] = (prev[curr] || 0) + 1; 
            return prev
        },{} as Record<PLAY, number>);

        const entries: [string, number][] = Object.entries(total).sort((a, b) => b[1] - a[1]);
        if(entries.find(([name, _]) => name === PLAY.SPLIT)) return this._playAction = PLAY.SPLIT;
        // if(entries[0][0] === PLAY.STAND && entries[1]) return this._playAction = entries[1][0] as PLAY;  
        else return this._playAction = entries[0][0] as PLAY;
    }
}
class Playthrough { 
    private _params: {deck: Deck.PlayDeck};
    private _dealer: [Deck.CARD, number][];
    private _player: PlayHand[];
    private _verbose: boolean = false;
    
    constructor(params: {deck: Deck.PlayDeck}) {
        this._params = params; 
        this._dealer = [this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
        this._player = [new PlayHand(params)];
    }

    async play(manualPlay: boolean = true): Promise<boolean[]> { 
        let dealerTurn = false;
        const score: boolean[] = [];
        const doneHands: number[] = [];
        while(!dealerTurn) { 
            dealerTurn = true;
            for(let i = this._player.length -1; i >=0; i--) { 
                if(this._player[i].skipped || doneHands.includes(i)) continue;
                dealerTurn = false;

                const deckHand = this._player[i].handValue;
                const evaluation = this._evaluateScore(deckHand);
                if(evaluation.end) {
                    score.push(evaluation.score as boolean);
                    doneHands.push(i);
                    Logger.log(`Hand ${i} ${evaluation.score ? 'won' : 'lost'} with soft ${deckHand.soft} and hard ${deckHand.hard}!`, this._verbose);
                    continue;
                }

                Logger.log(`\nHand ${i}`, this._verbose);
                this._actionEvaluate({playerHand: this._player[i]}, await this._player[i].playAction(this._dealer[0], manualPlay));
            }
        }

        Logger.log('\n', this._verbose);
        this._dealerTurn();
        let dealerHand = getHandValue(...this._dealer);
        for(let i = 0; i < this._player.length; i++) { 
            if(doneHands.includes(i)) continue;

            const deckHand = this._player[i].handValue;
            if(dealerHand.hard > TARGET_VALUE) {
                Logger.log(`Dealer's hand is ${dealerHand.hard}. Hand ${i} won with soft ${deckHand.soft} and hard ${deckHand.hard}!`, this._verbose);
                score.push(true);
            } else {
                const handScore = (deckHand.soft < TARGET_VALUE && deckHand.soft >= dealerHand.hard) || (deckHand.hard < TARGET_VALUE && deckHand.hard >= dealerHand.hard);
                score.push(handScore);
                Logger.log(`Dealer's hand is ${dealerHand.hard}. Hand ${i} ${handScore ? 'won' : 'lost'} with soft ${deckHand.soft} and hard ${deckHand.hard}!`, this._verbose);
            }
        }

        return score;
    }
    
    private _evaluateScore(hand: Deck.Hand): {end: boolean, score?: boolean} { 
        if(hand.soft > TARGET_VALUE) return {end: true, score: false};
        if(hand.soft === TARGET_VALUE || hand.hard === TARGET_VALUE) return {end: true, score: true};
        return {end: false};
    }

    private _actionEvaluate(params: {playerHand: PlayHand}, action: {play: PLAY, card?: [Deck.CARD, number]}) {
        switch(action.play) { 
            case PLAY.HIT: {
                params.playerHand.addCard(this._params.deck.drawCard() as [Deck.CARD, number]);
                break;
            }
            case PLAY.DOUBLE_DOWN: {
                params.playerHand.addCard(this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]);
                break;
            }
            case PLAY.SPLIT: { 
                this._player.push(new PlayHand(this._params, action.card as [Deck.CARD, number]));
                params.playerHand.removeCard(action.card as [Deck.CARD, number]);
                params.playerHand.addCard(this._params.deck.drawCard() as [Deck.CARD, number]);
                break;
            }
            case PLAY.STAND: { 
                break;
            }
        }     
    }

    private _dealerTurn() { 
        let dealerHand = getHandValue(...this._dealer);
        while(dealerHand.hard < DEALER_MIN) {
            this._dealer = [...this._dealer, this._params.deck.drawCard() as [Deck.CARD, number]];
            dealerHand = getHandValue(...this._dealer);

            if(dealerHand.hard >= DEALER_MIN) break;
        }
    }
}

async function main() { 
    const deck = new Deck.PlayDeck(100);

    let wins = 0;
    let losses = 0;
    let round = 0;
    for(let i = 0; i < 5200; i++) {
        round++;
        Logger.log(`\n Round: ${round}`, false);

        const playthrough = new Playthrough({deck});
        const res = await playthrough.play(false);
        res.forEach((res) => res ? wins++ : losses++);
        Logger.log(`Wins: ${wins}, Losses: ${losses}`, false);
    }
    Logger.log(`Wins: ${wins}, Losses: ${losses}`);
    Logger.exportToFile();
    console.log("done exporting")
}

main();
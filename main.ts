import AsyncAction from "./AsyncAction";
import { DEALER_MIN, dealersUpcard, Deck, getHandValue, PLAY, softHardHands, TARGET_VALUE } from "./utils";
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class Playthrough { 
    private _params: {deck: Deck.PlayDeck};
    private _dealer: [Deck.CARD, number][];
    private _player: [Deck.CARD, number][];
    private _playerWait?: AsyncAction;
    private _playerAction?: PLAY;
    
    constructor(params: {deck: Deck.PlayDeck}) {
        this._params = params; 
        this._dealer = [this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
        this._player = [this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
        this._playerWait = undefined;
        this._playerAction = undefined;
    }

    // win/loss
    async play(manualPlay: boolean = true): Promise<boolean> { 
        let playerHand = getHandValue(...this._player);

        if(playerHand.soft > TARGET_VALUE) return false;
        while(true) {
-           await this.playerAction(playerHand, this._dealer[0], manualPlay);
            if(!this._playerAction) continue;
            
            let end = false; 
            switch(this._playerAction) { 
                case PLAY.HIT: {
                    this._player = [...this._player, this._params.deck.drawCard() as [Deck.CARD, number]];
                    break;
                }
                case PLAY.DOUBLE_DOWN: {
                    this._player = [...this._player, this._params.deck.drawCard() as [Deck.CARD, number], this._params.deck.drawCard() as [Deck.CARD, number]];
                    end = true
                    break;
                }
                case PLAY.STAND: { 
                    end = true;
                    break;
                }
            }     

            playerHand = getHandValue(...this._player);
            if(playerHand.soft > TARGET_VALUE) {
                console.error(`Your hand is ${playerHand.soft}. Bust!`);
                return false;
            }
            if(playerHand.soft === TARGET_VALUE || playerHand.hard === TARGET_VALUE) {
                console.error(`${TARGET_VALUE}!. Congratulations!`);
                return true;
            }
            if(end) break;
        }

        let dealerHand = getHandValue(...this._dealer);
        while(dealerHand.hard < DEALER_MIN) {
            this._dealer = [...this._dealer, this._params.deck.drawCard() as [Deck.CARD, number]];
            dealerHand = getHandValue(...this._dealer);

            if(dealerHand.hard > TARGET_VALUE) {
                console.error(`Dealer's hand is ${dealerHand.hard} - it's a bust!. Congratulations!`);
                return true;
            }
            if(dealerHand.hard >= DEALER_MIN) break;
        }

        if((playerHand.hard < TARGET_VALUE && playerHand.hard >= dealerHand.hard) || playerHand.soft >= dealerHand.hard) {
            console.error(`Your soft hand is ${playerHand.soft} and hard ${playerHand.hard}, while the dealer has ${dealerHand.hard}. Congratulations!`);
            return true;
        } else {
            console.error(`Your soft hand is ${playerHand.soft} and hard ${playerHand.hard}, but the dealer has ${dealerHand.hard}. Try again!`);
            return false;
        }
    }
    
    async playerAction(playerHand: Deck.Hand, dealerCard: [Deck.CARD, number], manualPlay: boolean) { 
        this._playerWait = new AsyncAction();
        console.log(`You have: soft ${playerHand.soft} and hard ${playerHand.hard} with pairs ${playerHand.pairs}. Dealer's card is ${dealerCard[0]}`);
        const dealersCard = dealersUpcard(dealerCard, ...playerHand.cards);
        const softHard = softHardHands(dealerCard, ...playerHand.cards);
        console.log(`Dealer's Upcard suggests '${dealersCard.toUpperCase()}'`)
        console.log(`Soft Hands suggests '${softHard.soft.toUpperCase()}'`)
        console.log(`Hard Hands suggests '${softHard.hard.toUpperCase()}'`)
        console.log(`Valid actions are: ${Object.keys(PLAY).map((action, i) => ` key ${i} for action ${action}`)}`)
        
        if(manualPlay) rl.question(`What is your action?`, this.manualPlay.bind(this));
        else this.averagePlay([dealersCard, softHard.soft, softHard.hard]);

        return this._playerWait.wait();
    }

    async manualPlay(input: string) { 
        const i = parseInt(input);
        const values = Object.values(PLAY);
        return this.answer(values[i]);
    }

    async averagePlay(suggestions: PLAY[]) { 
        const total = suggestions.reduce((prev, curr) => {
            prev[curr] = (prev[curr] || 0) + 1; 
            return prev
        },{} as Record<PLAY, number>);

        const entries: [string, number][] = Object.entries(total).sort((a, b) => a[1] - b[1]);
        let action = entries[0][0];
        if(action === PLAY.STAND && entries[1]) return this.answer(entries[1][0] as PLAY);
        else return this.answer(entries[0][0] as PLAY);
    }

    async answer(play: PLAY) {
        console.log(`Player took action ${play.toUpperCase()}`);
        this._playerAction = play;
        this._playerWait?.complete();
    }
}

async function main() { 
    const deck = new Deck.PlayDeck(4);

    let wins = 0;
    let losses = 0;
    let round = 0;
    for(let i = 0; i < 10000; i++) {
        round++;
        console.warn(`\n Round: ${round}`);

        const playthrough = new Playthrough({deck});
        const res = await playthrough.play(false);
        res? wins++ : losses++;
    }

    console.log(`Wins: ${wins}, Losses: ${losses}`);
}

main();
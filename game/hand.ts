import * as readline from 'readline';
import { ACTION, DEALER_MIN, Deck, getHandValue, Logger } from './utils';
import AsyncAction from './action';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

abstract class Hand { 
    protected _action?: ACTION = undefined;
    constructor(protected _cards: [Deck.CARD, number][]) {}

    get cards() { 
        return this._cards;
    }

    get handValue(): Deck.Hand { 
        return getHandValue(...this._cards);
    }

    addCard(...cards: [Deck.CARD, number][]) { 
        this._cards.push(...cards);
    }

    removeCard(card: [Deck.CARD, number]) { 
        this._cards.splice(this._cards.findIndex((el) => el === card), 1);
    }

    abstract play(): Promise<ACTION>;
}

class DealerHand extends Hand { 
    constructor(_cards: [Deck.CARD, number][]) {
        super(_cards);
    }

    get done() { return this._action === ACTION.STAND; }
    
    play(): Promise<ACTION> { 
        this._action =  this.handValue.hard < DEALER_MIN ? ACTION.HIT : ACTION.STAND;

        return Promise.resolve(this._action);
    }
}

class PlayHand extends Hand{ 
    private _done = false;
    private _wait?: AsyncAction;
    
    constructor(_cards: [Deck.CARD, number][], private _manualPlay = true) {
        super(_cards);
    }

    get done() { 
        return this._done || 
            this._action === ACTION.STAND || 
            this._action === ACTION.DOUBLE_DOWN;
    }
    set done(value) { this._done = value; }
    
    get action() { return this._action }
    set action(value) { this._action = value}

    get manualPlay() { 
        return this._manualPlay;
    }

    async play(): Promise<ACTION> { 
        this._wait = new AsyncAction();
        
        Logger.log(`\nActions are: ${Object.keys(ACTION).map((action, i) => ` key ${i} for action ${action}`)}`)
        rl.question(`What is your action? `, this.input.bind(this));
        await this._wait.wait();

        Logger.log(`You chose ${this._action?.toUpperCase()}`);
        return this._action as ACTION;
    }

    private async input(input: string) { 
        const i = parseInt(input);
        const values = Object.values(ACTION);
        this._action = values[i];
        this._wait?.complete();
    }
}

export {
    DealerHand,
    PlayHand
}

class ModelRequest {
    private _endpoint: string

    constructor(url:string, port:string) {
        this._endpoint = `${url}:${port}`
    }

    private async get(uri: string, data: {[key:string]: any}): Promise<any> {
        const searchParams = new URLSearchParams(data).toString();
        const res = await fetch(`${this._endpoint}/${uri}?${searchParams}`, {
            method: 'GET',
            headers: {
                Accept: "application/json"
            }
        })

        const json: any = await res.json();
        return json;
    }

    private async post(uri: string, data: {[key:string]: any}): Promise<any> {
        const res = await fetch(`${this._endpoint}/${uri}`, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        })

        const json: any = await res.json();
        return json;
    }

    getHandValue(index: number): Promise<any> {
        return this.getHandValue(index);
    }

    getHandCards(index: number): Promise<any> {
        return this.getHandCards(index);
    }

    startGame(): Promise<any> {
        return this.post('start_game', {})
    }

    resetGame(): Promise<any> {
        return this.post('reset_game', {})
    }

    add_player_hand(player_cards: string[]): Promise<any> {
        return this.post('add_player_hand', {player_cards})
    }

    remove_player_hand(index: number): Promise<any> {
        return this.post('remove_player_hand', {index})
    }

    add_player_cards(player_cards: string[], index: number): Promise<any> {
        return this.post('remove_player_hand', {player_cards, index})
    }

    remove_player_card(player_card: string, index: number): Promise<any> {
        return this.post('remove_player_hand', {player_card, index})
    }

    add_dealer_card(dealer_card: string, index: number): Promise<any> {
        return this.post('add_dealer_card', {dealer_card, index})
    }

    predict(hand_index: number): Promise<any> {
        return this.get('predict', {hand_index})
    }
}
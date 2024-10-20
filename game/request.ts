export class ModelRequest {
  private _endpoint: string;
  private static instance: ModelRequest;

  constructor(url: string, port: string) {
    this._endpoint = `${url}:${port}`;

    if(!ModelRequest.instance) {
      ModelRequest.instance = this;
    }
  }

  private async get(uri: string, data: { [key: string]: any }): Promise<any> {
    const searchParams = new URLSearchParams(data).toString();
    const url = `${this._endpoint}/${uri}?${searchParams}`
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const json: any = await res.json();
    return json;
  }

  private async post(uri: string, data: { [key: string]: any }): Promise<any> {
    const url = `${this._endpoint}/${uri}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json: any = await res.json();
    return json;
  }

  static getHandValue(hand_index: number): Promise<any> {
    return ModelRequest.instance.get("hand_value", {hand_index});
  }

  static getHandCards(hand_index: number): Promise<any> {
    return ModelRequest.instance.get("hand_cards", {hand_index});
  }

  static startGame(player_cards: string[], dealer_card: string): Promise<any> {
    return ModelRequest.instance.post("start_game", {player_cards, dealer_card});
  }

  static resetGame(): Promise<any> {
    return ModelRequest.instance.post("reset_game", {});
  }

  static add_player_hand(player_cards: string[]): Promise<any> {
    return ModelRequest.instance.post("add_player_hand", { player_cards });
  }

  static remove_player_hand(index: number): Promise<any> {
    return ModelRequest.instance.post("remove_player_hand", { index });
  }

  static add_player_cards(player_cards: string[], index: number): Promise<any> {
    return ModelRequest.instance.post("add_player_cards", { player_cards, index });
  }

  static remove_player_card(player_card: string, index: number): Promise<any> {
    return ModelRequest.instance.post("remove_player_card", { player_card, index });
  }

  static add_dealer_card(dealer_card: string, index: number): Promise<any> {
    return ModelRequest.instance.post("add_dealer_card", { dealer_card, index });
  }

  static predict(hand_index: number): Promise<any> {
    return ModelRequest.instance.get("predict", { hand_index });
  }

  static step(hand_index: number, action: number): Promise<any> {
    return ModelRequest.instance.post("step", { action });
  }
}



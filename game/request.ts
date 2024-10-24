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

  static getHandValue(hand_index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.get(`${prefix}\\hand_value`, {hand_index});
  }

  static getHandCards(hand_index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.get(`${prefix}\\hand_cards`, {hand_index});
  }

  static startGame(player_cards: string[], dealer_card: string, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\start_game`, {player_cards, dealer_card});
  }

  static resetGame(prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\reset_game`, {});
  }

  static add_player_hand(player_cards: string[], prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\add_player_hand`, { player_cards });
  }

  static remove_player_hand(index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\remove_player_hand`, { index });
  }

  static add_player_cards(player_cards: string[], index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\add_player_cards`, { player_cards, index });
  }

  static remove_player_card(player_card: string, index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\remove_player_card`, { player_card, index });
  }

  static add_dealer_card(dealer_card: string, index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\add_dealer_card`, { dealer_card, index });
  }

  static predict(hand_index: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.get(`${prefix}\\predict`, { hand_index });
  }

  static step(action: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\step`, { action });
  }

  static setReward(action: number, prefix = ""): Promise<any> {
    return ModelRequest.instance.post(`${prefix}\\set_reward`, { action });
  }
}



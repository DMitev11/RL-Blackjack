from flask import jsonify, request
from routes.utils import parseCards

def register_routes(bp, env, model):
    @bp.route('/hand_value', methods=['GET'])
    def hand_value():
        idx = request.args.get('hand_index', 0)
        idx = int(idx)
        soft, hard, pairs, highValue = env.handValue(idx)
        return jsonify({"soft": float(soft), "hard": float(hard), "pairs": [float(pair) for pair in pairs], "highValue": float(highValue)})

    @bp.route('/hand_cards', methods=['GET'])
    def hand_cards():
        idx = request.args.get('hand_index', 0)
        idx = int(idx)
        return jsonify({"cards": [float(card) for card in env.playerHand(idx)]})

    @bp.route('/add_player_hand', methods=['POST'])
    def add_player_hand():
        data = request.get_json()
        player_cards = parseCards(data.get('player_cards'))

        env.addPlayerHand(player_cards)
        return jsonify({"result": True}), 200

    @bp.route('/remove_player_hand', methods=['POST'])
    def remove_player_hand():
        data = request.get_json()
        idx = parseCards(data.get('index'))
        idx = int(idx)

        env.removePlayerHand(idx)
        return jsonify({"result": True}), 200

    @bp.route('/add_player_cards', methods=['POST'])
    def add_player_cards():
        data = request.get_json()
        cards = parseCards(data.get('player_cards'))
        idx = data.get('index')
        idx = int(idx)

        env.addPlayerCards(cards, idx)
        return jsonify({"result": True}), 200

    @bp.route('/remove_player_card', methods=['POST'])
    def remove_player_card():
        data = request.get_json()
        card = parseCards([data.get('player_card')])[0]
        idx = data.get('index')
        idx = int(idx)

        env.removePlayerCard(card, idx)
        return jsonify({"result": True}), 200

    @bp.route('/add_dealer_card', methods=['POST'])
    def add_dealer_card():
        data = request.get_json()
        card = parseCards(data.get('dealer_card'))[0]

        env.addDealerCard(card)
        return jsonify({"result": True}), 200

    @bp.route('/reset_game', methods=['POST'])
    def reset_game():
        env.reset()
        return jsonify({"result": True}), 200

    @bp.route('/start_game', methods=['POST'])
    def start_game():
        data = request.get_json()
        player_cards = parseCards(data.get('player_cards'))
        dealer_card = parseCards([data.get('dealer_card')])[0]

        env.addPlayerHand(player_cards)
        env.addDealerCard(dealer_card)
        return jsonify({"result": True}), 200

    @bp.route('/step', methods=['POST'])
    def step():
        data = request.get_json()
        action = int(data.get('action'))

        env.step(action)
        return jsonify({"result": True}), 200

    @bp.route('/predict', methods=['GET'])
    def predict():
        idx = request.args.get('hand_index', 0)
        idx = int(idx)

        action, _ = model.predict(env.state)
        return jsonify({
            'prediction': int(action),
            'action' : env.evaluateAction(action, idx).value,
            "result": True
        }), 200

    @bp.route('/set_reward', methods=['POST'])
    def set_reward():
        reward = request.args.get('reward', 0)
        reward = int(reward)
 
        env.setReward(reward)
        return jsonify({"result": True}), 200

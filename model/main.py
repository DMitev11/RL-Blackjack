# #region debugger
# import debugpy
# # Start the debugger on port 5678
# debugpy.listen(5678)
# print("Waiting for debugger attach...")
# debugpy.wait_for_client()
# debugpy.breakpoint()
# #endregion

from stable_baselines3 import PPO, DQN
from stable_baselines3.common.evaluation import evaluate_policy
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.env_util import make_vec_env
from blackjack_env import BlackJackPlayEnv

env=BlackJackPlayEnv()
# check_env(env, warn=True)

model = PPO.load("Cards_PPO", env)
obs = env.reset()


def parseCards(cards):
    arr = []
    for card in cards:
        if(card == 'TWO'): arr.append(2.)
        elif(card == 'THREE'): arr.append(3.)
        elif(card == 'FOUR'): arr.append(4.)
        elif(card == 'FIVE'): arr.append(5.)
        elif(card == 'SIX'): arr.append(6.)
        elif(card == 'SEVEN'): arr.append(7.)
        elif(card == 'EIGHT'): arr.append(8.)
        elif(card == 'NINE'): arr.append(9.)
        elif(card == 'TEN'): arr.append(10.)
        elif(card == 'JACK'): arr.append(10.1)
        elif(card == 'QUEEN'): arr.append(10.2)
        elif(card == 'KING'): arr.append(10.3)
        elif(card == 'ACE'): arr.append(11.)

    return arr

from flask import Flask, jsonify, request
app = Flask(__name__)

@app.route('/hand_value', methods=['GET'])
def hand_value():
    idx = request.args.get('hand_index', 0)
    idx = int(idx)
    return jsonify(env.handValue(idx))

@app.route('/hand_cards', methods=['GET'])
def hand_Cards():
    idx = request.args.get('hand_index', 0)
    idx = int(idx)
    return jsonify(env.playerHand(idx))

@app.route('/add_player_hand', methods=['POST'])
def add_player_hand():
    data = request.get_json()
    player_cards = parseCards(data.get('player_cards'))

    env.addPlayerHand(player_cards)
    return jsonify({"result": True}), 200

@app.route('/remove_player_hand', methods=['POST'])
def remove_player_hand():
    data = request.get_json()
    idx = parseCards(data.get('index'))
    idx = int(idx)

    env.removePlayerHand(idx)
    return jsonify({"result": True}), 200

@app.route('/add_player_cards', methods=['POST'])
def add_player_cards():
    data = request.get_json()
    cards = parseCards(data.get('player_cards'))

    env.addPlayerCards(cards)
    return jsonify({"result": True}), 200

@app.route('/remove_player_card', methods=['POST'])
def remove_player_card():
    data = request.get_json()
    card = parseCards([data.get('player_card')])[0]

    env.removePlayerCard(card)
    return jsonify({"result": True}), 200

@app.route('/add_dealer_card', methods=['POST'])
def add_dealer_card():
    data = request.get_json()
    card = parseCards(data.get('dealer_card'))[0]

    env.addDealerCard(card)
    return jsonify({"result": True}), 200

@app.route('/reset_game', methods=['POST'])
def reset_game():
    env.reset()
    return jsonify({"result": True}), 200

@app.route('/start_game', methods=['POST'])
def start_game():
    data = request.get_json()
    player_cards = parseCards(data.get('player_cards'))
    dealer_card = parseCards([data.get('dealer_card')])[0]

    env.addPlayerHand(player_cards)
    env.addDealerCard(dealer_card)
    return jsonify({"result": True}), 200

@app.route('/predict', methods=['GET'])
def predict():
    idx = request.args.get('hand_index', 0)
    idx = int(idx)

    action, _ = model.predict(env.state)
    return jsonify({
        'action' : env.evaluateAction(action, idx).value,
        "result": True
    }), 200

app.run(port=8050)
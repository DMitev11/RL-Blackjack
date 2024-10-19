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


from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/reset_game', methods=['POST'])
def reset_game():
    env.reset()
    return jsonify({"result": True}), 200

@app.route('/start_game', methods=['POST'])
def start_game(): 
    data = request.get_json()
    player_cards = data.get('player_cards'), dealer_card = data.get('dealer_card')
    

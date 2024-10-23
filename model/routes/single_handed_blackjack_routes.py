from stable_baselines3 import PPO
from environments.blackjack_singlehand_env import BlackJackPlaySingleEnv 

env_single_handed_blackjack=BlackJackPlaySingleEnv()
env_single_handed_blackjack.reset()
model_single_handed_blackjack = PPO.load("CARDS_PPO_SINGLEHAND", env_single_handed_blackjack)

from flask import Blueprint
bp_blackjack_singlehanded = Blueprint('single_handed_model_routes', __name__)

from routes.bp_routes import register_routes
register_routes(bp_blackjack_singlehanded,env_single_handed_blackjack, model_single_handed_blackjack)
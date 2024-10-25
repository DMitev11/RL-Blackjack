from stable_baselines3 import PPO
from environments.blackjack_multihand_env import BlackJackPlayNewEnv 

env_multi_handed_blackjack=BlackJackPlayNewEnv()
env_multi_handed_blackjack.reset()
model_multi_handed_blackjack = PPO.load("CARDS_PPO_MULTIHAND", env_multi_handed_blackjack)

from flask import Blueprint
bp_multi_handed_blackjack = Blueprint('multihand_model_routes', __name__)

from routes.bp_routes import register_routes
register_routes(bp_multi_handed_blackjack, env_multi_handed_blackjack, model_multi_handed_blackjack)

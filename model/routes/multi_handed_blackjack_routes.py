from stable_baselines3 import PPO
from environments.blackjack_multihand_env import BlackJackPlayNewEnv 

env_blackjack_new=BlackJackPlayNewEnv()
env_blackjack_new.reset()
model_blackjack_new = PPO.load("CARDS_PPO_MULTIHAND", env_blackjack_new)

from flask import Blueprint
bp_blackjack_new = Blueprint('multihand_model_routes', __name__)

from routes.bp_routes import register_routes
register_routes(bp_blackjack_new, env_blackjack_new, model_blackjack_new)

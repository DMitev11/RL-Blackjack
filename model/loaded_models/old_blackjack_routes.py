from stable_baselines3 import PPO
from blackjack_old_env import BlackJackPlayOldEnv 

env_old_blackjack=BlackJackPlayOldEnv()
env_old_blackjack.reset()
model_old_blackjack = PPO.load("Cards_PPO", env_old_blackjack)

from flask import Blueprint
bp_blackjack_old = Blueprint('old_model_routes', __name__)

from loaded_models.bp_routes import register_routes
register_routes(bp_blackjack_old,env_old_blackjack, model_old_blackjack)
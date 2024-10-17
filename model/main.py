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
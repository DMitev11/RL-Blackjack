from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from blackjack_env import BlackjackEnv

# Create the environment
env = make_vec_env(BlackjackEnv, n_envs=1)

# Load your trained model
model = PPO.load("path_to_save_your_model")

# Run the simulation with the new environment
obs = env.reset()
done = False
total_reward = 0

while not done:
    # Use the model to predict the action
    action, _ = model.predict(obs, deterministic=True)
    
    # Take the step in the environment
    obs, _, done, info = env.step([action])
    
    # Calculate reward outside the environment
    if done:
        game_data = env.envs[0].get_game_data()
        dealer_value = env.envs[0]._calculate_hand_value(game_data['dealer_cards'])
        reward = 0
        for hand in game_data['player_hands']:
            player_value = env.envs[0]._calculate_hand_value(hand)
            if player_value == 21 and len(hand) == 2:  # Natural blackjack
                if dealer_value == 21 and len(game_data['dealer_cards']) == 2:
                    reward += 0  # Push
                else:
                    reward += 1.5  # Blackjack pays 3:2
            elif player_value > 21:  # Bust
                reward -= 1
            elif dealer_value > 21 or player_value > dealer_value:
                reward += 1
            elif player_value < dealer_value:
                reward -= 1
        total_reward += reward

print(f"Total Reward: {total_reward}")

import numpy as np
from blackjack_env import BlackJackPlayEnv
from gymnasium.spaces import Discrete, Box, Dict

class BlackJackPlayOldEnv(BlackJackPlayEnv):
    def setHandIndex(self, index):
        return True
    
    def __init__(self):
        # Actions we can take - stand, hit, double_down, split,
        self.action_space = Discrete(4)
        # Observation space: (player_sum, dealer_up_card, usable_ace)
        self.observation_space = Dict({
            'player_hands': Box(low = -1, high = 11, shape = (6, 21), dtype= np.float32),
            'usable_ace': Box(low = -1, high = 1, shape = (6,), dtype= np.int32),
            'player_total': Box(low = -1, high = 41, shape = (6,), dtype = np.int32),
            'player_hands_indices': Discrete(6),
            'done_hands': Box(low = -1, high = 1, shape = (6,), dtype = np.int32),
            'dealer_hand': Box(low = -1, high = 11, shape = (21,), dtype= np.float32),
            'dealer_total': Discrete(27),
        })
        self.reset()

    def reset(self, seed=0):
        self.state = {
            'player_hands': np.array(6 * [21 * [-1]], dtype = np.float32),
            'usable_ace': np.array(6 * [-1], dtype = np.int32),
            'player_total': np.array(6 * [-1], dtype= np.int32),
            'player_hands_indices': 0,
            'done_hands': np.array(6 * [-1], dtype = np.int32),
            'dealer_hand': np.array(21 * [-1], dtype = np.float32),
            'dealer_total': int(0)
        }
        
        self.done = False
        info = {}
        return self.state, info

    def step(self, action):
        # Set placeholder for info
        info = {}
        truncated = False

        done = len([i for i in self.state['done_hands'] if i == -1 or i == -1]) < 0
        return self.state, 0, done, truncated, info

    def render(self):
        # Implement viz
        pass

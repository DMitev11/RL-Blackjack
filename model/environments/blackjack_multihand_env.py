import numpy as np
from environments.blackjack_env import BlackJackPlayEnv
from gymnasium.spaces import Discrete, Box, Dict

from utils import ACTION_SPACE, DEALER_HAND_CARDS, MAX_HANDS, MAX_PLAYER_HAND_CARDS, MULTI_HAND_OBS, Card

class BlackJackPlayNewEnv(BlackJackPlayEnv):
    def setHandIndex(self, index):
        if(self.__isValidHand__(index) == False): return False
        self.state['player_index'] = index

        return True
    
    def __init__(self):
        self.action_space = ACTION_SPACE
        self.observation_space = MULTI_HAND_OBS
        self.reset()

    def reset(self, seed=0):
        self.state = {
            'player_hands': np.array(MAX_HANDS * [MAX_PLAYER_HAND_CARDS * [-1]], dtype = np.float32),
            'usable_ace': np.array(MAX_HANDS * [-1], dtype = np.int32),
            'player_total': np.array(MAX_HANDS * [-1], dtype= np.int32),
            'player_hands_indices': 0,
            'player_index': 0,
            'done_hands': np.array(MAX_HANDS * [-1], dtype = np.int32),
            'dealer_hand': np.array(DEALER_HAND_CARDS * [-1], dtype = np.float32),
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

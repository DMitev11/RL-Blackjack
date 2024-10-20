import numpy as np
from gymnasium import Env
from gymnasium.spaces import Discrete, Box, Dict

from utils import Card, Action, calculateHand, shiftEndNegative1D, shiftEndNegative2D

class BlackJackPlayEnv(Env):
    def evaluateAction(self, action, index):
        iter = 0
        hand = self.state['player_hands'][index]
        soft, _, pairs, _ = calculateHand(hand)
        len_hand = len([v for v in hand if v != -1])
        while True:
            if(action - iter <= Action.STAY.value):
                self.state['done_hands'][index] = 1
                return Action.STAY

            if(action - iter == Action.HIT.value):
                return Action.HIT

            if(action - iter == Action.DOUBLE_DOWN.value and (len_hand == 2 or soft < 11)):
                return Action.DOUBLE_DOWN

            if(action - iter == Action.SPLIT.value and len(pairs) > 0 and len_hand == 2):
                return Action.SPLIT

            if((len_hand <= Card.TWO.value or soft < Card.ACE.value) and len(pairs) > 0):
                iter += 4
                continue
            #action masking
            if((len_hand <= Card.TWO.value or soft < Card.ACE.value) and len(pairs) > 0):
                iter += 3
                continue
            #action masking
            iter +=2

    def __sortHands__(self):     
        self.state['player_hands'] = shiftEndNegative2D(self.state['player_hands'], 0)
        self.state['done_hands'] = shiftEndNegative1D(self.state['done_hands'])
        self.state['player_total'] = shiftEndNegative1D(self.state['player_total'])

    def __sortHand__(self, index):      
        self.state['player_hands'][index] = shiftEndNegative1D(self.state['player_hands'][index])

        _, _, _, highValue = calculateHand(self.state['player_hands'][index])
        self.state['player_total'][index] = highValue
        
        a_idxs = np.where(self.state['player_hands'][index] == Card.ACE)[0]
        self.state['usable_ace'][index] = len(a_idxs) > 0


    def __isValidHand__(self, index):
        hand = self.state['player_hands'][index]
        return hand[0] > -1
    
    def handValue(self, index):
        return calculateHand(self.state['player_hands'][index])
    
    def playerHand(self, index):
        return self.state['player_hands'][index]

    def addPlayerHand(self, cards):
        first_el = self.state['player_hands'][:, 0]
        ids = np.where(first_el == -1)[0]
        if(len(ids) <= 0): return False

        idx = ids[0]
        self.state['player_hands'][idx][:len(cards)] = cards
        self.state['player_hands_indices'] += 1
        self.state['done_hands'][idx] = 0

        self.__sortHand__(self.state['player_hands_indices'] -1)
        self.__sortHands__()
        return True

    def removePlayerHand(self, index):
        if(self.__isValidHand__(index) == False): return False

        self.state['player_hands'][index] = 21 * [-1]
        self.state['done_hands'][index] = -1
        self.state['player_total'][index] = -1
        self.state['player_hands_indices'] -= 1

        self.__sortHands__()
        return True

    def addPlayerCards(self, cards, index):
        if(self.__isValidHand__(index) == False): return False

        idxs = np.where(self.state['player_hands'][index] == -1)[0]
        if(len(idxs) < len(cards)): return False

        for i in range(len(cards)):
            self.state['player_hands'][index][idxs[i]] = cards[i]

        self.__sortHand__(index)
        return True

    def removePlayerCard(self, card, index):
        if(self.__isValidHand__(index) == False): return False

        idx = np.where(self.state['player_hands'][index] == card)[0]
        if(len(idx) <= 0): return False
        self.state['player_hands'][index][idx[0]] = -1

        self.__sortHand__()
        return True

    def addDealerCard(self, card):
        idxs = np.where(self.state['dealer_hand'] == -1)[0]
        if(len(idxs) < 0): return False
        
        self.state['dealer_hand'][idxs[0]] = card
        _, _, _, highValue = calculateHand(self.state['dealer_hand'])
        self.state['dealer_total'] = highValue

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

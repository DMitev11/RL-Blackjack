import math
import numpy as np
import os

from gymnasium import Env
from stable_baselines3 import DQN, PPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.env_util import make_vec_env

from utils import ACTION_SPACE, BLACKJACK_VALUE, DEALER_STOP_VALUE, MIN_HAND_LENGTH, MULTI_HAND_OBS, Action, Card, Deck, calculateHand, shiftEndNegative1D, shiftEndNegative2D, MAX_PLAYER_HAND_CARDS, DEALER_HAND_CARDS, MAX_HANDS

class BlackJackPlayEnv(Env):
    def __sortHand__(self, index):      
        self.state['player_hands'][index] = shiftEndNegative1D(self.state['player_hands'][index])

        _, _, _, highValue = calculateHand(self.state['player_hands'][index])
        self.state['player_total'][index] = highValue
        
        a_idxs = np.where(self.state['player_hands'][index] == Card.ACE)[0]
        self.state['usable_ace'][index] = len(a_idxs) > 0

    def __sortHands__(self):     
        self.state['player_hands'] = shiftEndNegative2D(self.state['player_hands'], 0)
        self.state['done_hands'] =  shiftEndNegative1D(self.state['done_hands'], np.int32)
        self.state['player_total'] = shiftEndNegative1D(self.state['player_total'], np.int32)
        
    def __evaluateAction__(self, action):
        iter = 0
        hand = self.state['player_hands'][self.state['player_index']]
        soft, _, pairs, _ = calculateHand(hand)
        len_hand = len([v for v in hand if v != -1])
        while True:
            if(action - iter <= Action.STAND.value):
                self.state['done_hands'][self.state['player_index']] = 1
                return Action.STAND

            if(action - iter == Action.HIT.value):
                idx = np.where(hand == -1)[0][0]
                hand[idx] = self.deck.drawCard()

                self.__sortHand__(self.state['player_index'])
                return Action.HIT

            if(action - iter == Action.DOUBLE_DOWN.value and (len_hand == MIN_HAND_LENGTH and soft < 11)):
                indices = np.where(hand == -1)[0]
                hand[indices[0]] = self.deck.drawCard()
                hand[indices[1]] = self.deck.drawCard()
                self.state['done_hands'][self.state['player_index']] = 1

                self.__sortHand__(self.state['player_index'])
                return Action.DOUBLE_DOWN

            if(action - iter == Action.SPLIT.value and len(pairs) > 0):
                card = pairs[0]
                indices = np.where(np.floor(hand) == card)
                idx = np.max(indices)

                first_el = self.state['player_hands'][:, 0]
                h_idx = np.where(first_el == -1)[0][0]

                self.state['player_hands'][h_idx][0] = card
                hand[idx] = self.deck.drawCard()
                self.state['player_hands'][h_idx][1] = self.deck.drawCard()

                self.state['player_hands_indices'] += 1
                self.state['done_hands'][h_idx] = 0

                self.__sortHands__()
                return Action.SPLIT

            if((len_hand <= MIN_HAND_LENGTH or soft < Card.ACE.value) and len(pairs) > 0):
                iter += 4
                continue
            #action masking
            if((len_hand <= MIN_HAND_LENGTH or soft < Card.ACE.value) and len(pairs) > 0):
                iter += 3
                continue
            #action masking
            iter +=2
    
    def __set_game__(self):
        player_hands = np.array([[self.deck.drawCard(), self.deck.drawCard()] + (MAX_PLAYER_HAND_CARDS - 2) * [-1]] + (MAX_HANDS - 1) * [MAX_PLAYER_HAND_CARDS * [-1]], dtype = np.float32)
        dealer_hand = np.array([self.deck.drawCard()] + (DEALER_HAND_CARDS - 1) * [-1], dtype = np.float32)
        _, _, _, highValue = calculateHand(player_hands[0])
        self.state = {
            'player_hands': player_hands,
            'usable_ace': np.array([1 if Card.ACE.value in player_hands else 0] + (MAX_HANDS - 1) * [-1], dtype = np.int32),
            'player_total': np.array([highValue] + (MAX_HANDS - 1) * [-1], dtype= np.int32),
            'player_hands_indices': 1,
            'player_index': 0,
            'done_hands': np.array([0] + (MAX_HANDS - 1) * [-1], dtype = np.int32),
            'dealer_hand': dealer_hand,
            'dealer_total': int(math.floor(dealer_hand[0]))
        }

    def __init__(self):
        self.action_space = ACTION_SPACE
        self.observation_space = MULTI_HAND_OBS
        self.reset()

    def reset(self, seed=0):
        self.deck = Deck(4)
        self.__set_game__()
        info = {}
        return self.state, info

    def step(self, action):
        # Set placeholder for info
        info = {}
        truncated = False
        done = False
        reward = 0

        _ = self.__evaluateAction__(action)
        soft, hard, _, highValue = calculateHand(self.state['player_hands'][self.state['player_index']])
        self.state['player_total'][self.state['player_index']] = highValue

        done_hand = self.state['done_hands'][self.state['player_index']]
        if(done_hand < 1):
            if(soft > BLACKJACK_VALUE):
                self.state['player_hands'][self.state['player_index']] = MAX_PLAYER_HAND_CARDS * [-1]
                self.state['done_hands'][self.state['player_index']] = -1
                self.state['player_hands_indices'] -= 1
                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)

                self.__sortHands__()
                reward = -1
            elif(hard == BLACKJACK_VALUE and len(self.state['player_hands'][self.state['player_index']]) == MIN_HAND_LENGTH):
                self.state['player_hands'][self.state['player_index']] = MAX_PLAYER_HAND_CARDS * [-1]
                self.state['done_hands'][self.state['player_index']] = -1
                self.state['player_hands_indices'] -= 1
                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)

                self.__sortHands__()
                reward = 1

        self.state['player_index'] = self.state['player_index']+1 if self.state['player_index'] + 1 < self.state['player_hands_indices'] else 0
        #still hand to decide an action
        if(np.any(self.state['done_hands'] == 0)):
            return self.state, reward, done, truncated, info

        #all hands decided upon an action
        if(np.any(self.state['done_hands'] == 1)):
            _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])
            while(dealerHard < DEALER_STOP_VALUE):
                idx = np.where(self.state['dealer_hand'] == -1)[0][0]
                self.state['dealer_hand'][idx] = self.deck.drawCard()
                _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])

            if(dealerHard > BLACKJACK_VALUE):
                reward += len([v for v in self.state['player_hands'] if v[0] != -1])
            else:
                for idx in range(self.state['player_hands_indices']):
                    hand = self.state['player_hands'][idx]
                    _, _, _, handHighValue = calculateHand(hand)
                    if(handHighValue > dealerHard): reward += 1
                    elif(handHighValue == dealerHard): pass
                    else: reward -= 1


        done = True
        return self.state, reward, done, truncated, info

    def render(self):
        # Implement viz
        pass

def main():
    # env = BlackJackPlayEnv()
    # check_env(env, warn=True)

    env = make_vec_env(BlackJackPlayEnv, n_envs=16, vec_env_cls=SubprocVecEnv)
    log_path = os.path.join('Training', 'Logs')
    model_path = os.path.join('./CARDS_DQN_MULTIHAND')

    model = DQN("MultiInputPolicy", env, verbose=1, tensorboard_log=log_path)
    # model = PPO.load(model_path, env, verbose=1, tensorboard_log=log_path, ent_coef=0.1)
    model.learn(total_timesteps=3000000, log_interval=1)
    model.save(model_path)

if __name__ == '__main__':
    # This is necessary for Windows to avoid the "freeze_support" error
    main()
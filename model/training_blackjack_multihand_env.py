import numpy as np
import os

from gymnasium import Env
from gymnasium.spaces import Discrete, Box, Dict

from stable_baselines3 import PPO, DQN
from stable_baselines3.common.evaluation import evaluate_policy
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.env_util import make_vec_env

from enum import Enum
import math
import random

class Card(Enum):
    ACE = 11
    KING = 10.3
    QUEEN = 10.2
    JACK = 10.1
    TEN = 10.0
    NINE = 9
    EIGHT = 8
    SEVEN = 7
    SIX = 6
    FIVE = 5
    FOUR = 4
    THREE = 3
    TWO = 2

class Action(Enum):
    STAY = 0
    HIT = 1
    DOUBLE_DOWN = 2
    SPLIT = 3

class Deck():
    def __fisherYatesShuffle__(self, values):
        for idx, x in enumerate(values):
            j = math.floor(random.random() * idx)
            cache = x
            values[idx] = values[j]
            values[j] = cache
        return values

    def __constructDeck__(self, count):
        values = [member.value for member in Card for _ in range(4)] * count
        return self.__fisherYatesShuffle__(values)

    def __init__(self, count):
        self.count = count
        self.set = self.__constructDeck__(count)

    def drawCard(self):
        try:
            card = self.set.pop(0)
        except IndexError:
            self.set = self.__constructDeck__(self.count)
            card = self.set.pop(0)

        return card

# which is the correct condition
def calculateSoftHand(values):
    cards = [value for value in values if value != -1]
    try: idx = cards.index(Card.ACE)
    except: idx = -1
    mask = (cards != Card.ACE) or (np.arange(len(cards)) == idx)
    val = np.sum(np.where(mask, np.floor(cards), 1))
    return val

def calculateHardHand(values):
    cards = [value for value in values if value != -1]
    val = np.sum(np.floor(cards))
    return val

def calculatePairs(values):
    cards = np.floor([value for value in values if value != -1])
    val = []
    for idx, value in enumerate(cards):
        if (np.where(cards == value)[0][0] != idx and value not in val):
            val = np.append(val, value)

    return val

def calculateHand(values):
    soft = calculateSoftHand(values)
    hard = calculateHardHand(values)
    pairs = calculatePairs(values)
    highValue = soft if hard > 21 else hard

    return soft, hard, pairs, highValue

class BlackJackPlayEnv(Env):
    def __evaluateAction__(self, action):
        iter = 0
        hand = self.state['player_hands'][self.state['player_index']]
        soft, _, pairs, _ = calculateHand(hand)
        len_hand = len([v for v in hand if v != -1])
        while True:
            if(action - iter <= Action.STAY.value):
                self.state['done_hands'][self.state['player_index']] = 1
                return Action.STAY

            if(action - iter == Action.HIT.value):
                idx = np.where(hand == -1)[0][0]
                hand[idx] = self.deck.drawCard()
                return Action.HIT

            if(action - iter == Action.DOUBLE_DOWN.value and (len_hand == 2 or soft < 11)):
                idx = np.where(hand == -1)[0][0]
                hand[idx] = self.deck.drawCard()
                idx = np.where(hand == -1)[0][0]
                hand[idx] = self.deck.drawCard()

                return Action.DOUBLE_DOWN

            if(action - iter == Action.SPLIT.value and len(pairs) > 0 and len_hand == 2):
                card = pairs[0]
                #always [0, 1]
                indices = np.argwhere(np.floor(hand) == card)
                idx = np.max(indices)
                hand[idx] = self.deck.drawCard()

                first_el = self.state['player_hands'][:, 0]
                h_idx = np.where(first_el == -1)[0][0]
                self.state['player_hands'][h_idx][0] = card
                self.state['player_hands'][h_idx][1] = self.deck.drawCard()

                self.state['player_hands_indices'] += 1
                self.state['done_hands'][h_idx] = 0
                return Action.SPLIT

            if((len_hand <= 2 or soft < 11) and len(pairs) > 0):
                iter += 4
                continue
            #action masking
            if((len_hand <= 2 or soft < 11) and len(pairs) > 0):
                iter += 3
                continue
            #action masking
            iter +=2

    def __init__(self):
        # Actions we can take - stand, hit, double_down, split,
        self.action_space = Discrete(4)
        # Observation space: (player_sum, dealer_up_card, usable_ace)
        self.observation_space = Dict({
            'player_hands': Box(low = -1, high = 11, shape = (6, 21), dtype= np.float32),
            'usable_ace': Box(low = -1, high = 1, shape = (6,), dtype= np.int32),
            'player_total': Box(low = -1, high = 41, shape = (6,), dtype = np.int32),
            'player_hands_indices': Discrete(6),
            'player_index': Discrete(6),
            'done_hands': Box(low = -1, high = 1, shape = (6,), dtype = np.int32),
            'dealer_hand': Box(low = -1, high = 11, shape = (21,), dtype= np.float32),
            'dealer_total': Discrete(27),
        })
        self.reset()
    
    def __nextGame__(self):
        player_hands = np.array([[self.deck.drawCard(), self.deck.drawCard()] + 19 * [-1]] + 5 * [21 * [-1]], dtype = np.float32)
        dealer_hand = np.array([self.deck.drawCard()] + 20 * [-1], dtype = np.float32)
        _, _, _, highValue = calculateHand(player_hands[0])
        self.state = {
            'player_hands': player_hands,
            'usable_ace': np.array([1 if 11 in player_hands else 0] + 5 * [-1], dtype = np.int32),
            'player_total': np.array([highValue] + 5 * [-1], dtype= np.int32),
            'player_hands_indices': 1,
            'player_index': 0,
            'done_hands': np.array([0] + 5 * [-1], dtype = np.int32),
            'dealer_hand': dealer_hand,
            'dealer_total': int(math.floor(dealer_hand[0]))
        }

    def reset(self, seed=0):
        self.games = 1
        self.deck = Deck(4)
        self.__nextGame__()
        info = {}
        return self.state, info

    def step(self, action):
        # Set placeholder for info
        info = {}
        truncated = False
        done = False
        reward = 0

        ev_action = self.__evaluateAction__(action)
        soft, hard, pairs, highValue = calculateHand(self.state['player_hands'][self.state['player_index']])
        self.state['player_total'][self.state['player_index']] = highValue

        if(self.state['done_hands'][self.state['player_index']] < 1):
            if(soft > 21):
                self.state['player_hands'][self.state['player_index']] = 21 * [-1]
                self.state['done_hands'][self.state['player_index']] = -1
                self.state['player_hands_indices'] -= 1
                reward = -1
                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)

                non_minus_hands = self.state['player_hands'][self.state['player_hands'][:, 0] != -1]
                minus_hands = self.state['player_hands'][self.state['player_hands'][:, 0] == -1]
                self.state['player_hands'] = np.concatenate((non_minus_hands, minus_hands))

                non_minus_done = self.state['done_hands'][self.state['done_hands'] != -1]
                minus_done = self.state['done_hands'][self.state['done_hands'] == -1]
                self.state['done_hands'] = np.concatenate((non_minus_done, minus_done))

                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)


            elif(soft == 21 or hard == 21):
                self.state['player_hands'][self.state['player_index']] = 21 * [-1]
                self.state['done_hands'][self.state['player_index']] = -1
                self.state['player_hands_indices'] -= 1
                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)

                reward = 1

                non_minus_hands = self.state['player_hands'][self.state['player_hands'][:, 0] != -1]
                minus_hands = self.state['player_hands'][self.state['player_hands'][:, 0] == -1]
                self.state['player_hands'] = np.concatenate((non_minus_hands, minus_hands))

                non_minus_done = self.state['done_hands'][self.state['done_hands'] != -1]
                minus_done = self.state['done_hands'][self.state['done_hands'] == -1]
                self.state['done_hands'] = np.concatenate((non_minus_done, minus_done))

                self.state['player_index'] = np.clip(self.state['player_index'] -1, 0, 6)


        elif(self.state['done_hands'][self.state['player_index']] != -1 and ev_action == Action.DOUBLE_DOWN):
            self.state['done_hands'][self.state['player_index']] = 1

        self.state['player_index'] = self.state['player_index']+1 if self.state['player_index'] + 1 < self.state['player_hands_indices'] else 0
        #still hand to decide an action
        if(np.any(self.state['done_hands'] == 0)):
            return self.state, reward, done, truncated, info



        #all hands decided upon an action
        if(np.any(self.state['done_hands'] == 1)):
            _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])
            while(dealerHard < 17):
                idx = np.where(self.state['dealer_hand'] == -1)[0][0]
                self.state['dealer_hand'][idx] = self.deck.drawCard()
                _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])

            if(dealerHard > 21):
                reward += len([v for v in self.state['player_hands'] if v[0] != -1])
            else:
                for idx in range(self.state['player_hands_indices']):
                    hand = self.state['player_hands'][idx]
                    _, _, _, handHighValue = calculateHand(hand)
                    if(handHighValue > dealerHard): reward += 1
                    elif(handHighValue == dealerHard): pass
                    else: reward += -1

            done = True

        if(reward > 1):
            pass
        self.games -= 1
        if(self.games <= 0): done = True
        else: self.__nextGame__()
        return self.state, reward, done, truncated, info

    def render(self):
        # Implement viz
        pass

def main():
    env = make_vec_env(BlackJackPlayEnv, n_envs=16, vec_env_cls=SubprocVecEnv)

    # check_env(env, warn=True)

    # episodes = 500
    # for episode in range(1, episodes+1):
    #     state = env.reset(0)
    #     done = False
    #     score = 0 

    #     while not done:
    #         env.render()
    #         action = env.action_space.sample()
    #         n_state, reward, done, truncated, info = env.step(action)
    #         score+=reward
    #     print('Episode:{} Score:{}'.format(episode, score))
    # env.close()

    log_path = os.path.join('Training', 'Logs')
    model_path = os.path.join('./CARDS_PPO_MULTIHAND')

    # model = PPO("MultiInputPolicy", env, verbose=1, tensorboard_log=log_path)
    model = PPO.load(model_path, env, verbose=1, tensorboard_log=log_path, ent_coef=0.1)
    model.learn(total_timesteps=1000000, log_interval=1)
    model.save(model_path)

if __name__ == '__main__':
    # This is necessary for Windows to avoid the "freeze_support" error
    main()
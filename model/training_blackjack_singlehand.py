import math
import numpy as np
import os

from gymnasium import Env

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.env_util import make_vec_env

from utils import ACTION_SPACE, BLACKJACK_VALUE, DEALER_STOP_VALUE, MIN_HAND_LENGTH, SINGLE_HAND_OBS, Action, Card, Deck, calculateHand, MAX_PLAYER_HAND_CARDS, DEALER_HAND_CARDS

class BlackJackPlayEnv(Env):
    def __evaluateAction__(self, action):
        iter = 0
        hand = self.state['player_hand']
        soft, _, pairs, _ = calculateHand(hand)
        len_hand = len([v for v in hand if v != -1])
        while True:
            if(action - iter <= Action.STAND.value):
                self.state['done_hand'] = 1
                return Action.STAND

            if(action - iter == Action.HIT.value):
                idx = np.where(hand == -1)[0][0]
                self.state['player_hand'][idx] = self.deck.drawCard()
                self.state['usable_ace'] = 1 if Card.ACE.value in hand else 0

                return Action.HIT

            if(action - iter == Action.DOUBLE_DOWN.value and (len_hand == MIN_HAND_LENGTH and soft < 11)):
                indices = np.where(hand == -1)[0]
                self.state['player_hand'][indices[0]] = self.deck.drawCard()
                self.state['player_hand'][indices[1]] = self.deck.drawCard()
                self.state['usable_ace'] = 1 if Card.ACE.value in hand else 0

                self.state['done_hand'] = 1
                return Action.DOUBLE_DOWN

            if(action - iter == Action.SPLIT.value and len(pairs) > 0):
                card = pairs[0]
                indices = np.where(np.floor(hand) == card)
                idx = np.max(indices)
                self.state['player_hand'][idx] = self.deck.drawCard()
                self.state['usable_ace'] = 1 if Card.ACE.value in hand else 0
                
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
        player_hand = np.array([self.deck.drawCard(), self.deck.drawCard()] + (MAX_PLAYER_HAND_CARDS - 2) * [-1], dtype = np.float32)
        dealer_hand = np.array([self.deck.drawCard()] + (DEALER_HAND_CARDS - 1) * [-1], dtype = np.float32)
        _, _, _, highValue = calculateHand(player_hand)
        self.state = {
            'player_hand': player_hand,
            'usable_ace': 1 if Card.ACE.value in player_hand else 0,
            'player_total': highValue,
            'done_hand': 0,
            'dealer_hand': dealer_hand,
            'dealer_total': int(math.floor(dealer_hand[0]))
        }

    def __init__(self):
        self.action_space = ACTION_SPACE
        self.observation_space = SINGLE_HAND_OBS
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
        soft, _, _, highValue = calculateHand(self.state['player_hand'])
        self.state['player_total'] = highValue

        if(self.state['done_hand'] < 1 and (soft >= BLACKJACK_VALUE)): self.state['done_hand'] = 1

        if(np.any(self.state['done_hand'] == 0)):
            return self.state, reward, done, truncated, info

        _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])
        while(dealerHard < DEALER_STOP_VALUE):
            idx = np.where(self.state['dealer_hand'] == -1)[0][0]
            self.state['dealer_hand'][idx] = self.deck.drawCard()
            _, dealerHard, _, _ = calculateHand(self.state['dealer_hand'])
        if(dealerHard > BLACKJACK_VALUE):
            reward = 1
        else:
            hand = self.state['player_hand']
            _, _, _, handHighValue = calculateHand(hand)
            if(handHighValue > dealerHard): reward = 1
            elif(handHighValue == dealerHard): pass
            else: reward = -1

        done = True
        return self.state, reward, done, truncated, info

    def render(self):
        # Implement viz
        pass

def main():
    env = BlackJackPlayEnv()
    check_env(env, warn=True)

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

    env = make_vec_env(BlackJackPlayEnv, n_envs=16, vec_env_cls=SubprocVecEnv)
    log_path = os.path.join('Training', 'Logs')
    model_path = os.path.join('./CARDS_PPO_SINGLEHAND')

    model = PPO("MultiInputPolicy", env, verbose=1, tensorboard_log=log_path, ent_coef=0.1)
    # model = PPO.load(model_path, env, verbose=1, tensorboard_log=log_path, ent_coef=0.1)
    model.learn(total_timesteps=3000000, log_interval=1)
    model.save(model_path)

if __name__ == '__main__':
    # This is necessary for Windows to avoid the "freeze_support" error
    main()
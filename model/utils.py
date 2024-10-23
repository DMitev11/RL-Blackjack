import math
import random
import numpy as np
from enum import Enum

def shiftEndNegative1D(array, dtype = np.float32): 
    non_negative = np.array([a for a in array if a != -1], dtype=dtype)
    negative = np.array([a for a in array if a == -1], dtype=dtype)

    return np.concatenate((non_negative, negative), dtype=dtype)

def shiftEndNegative2D(array, checkIndex, dtype = np.float32):
    non_negative = np.array(array[array[:, checkIndex] != -1], dtype=dtype)
    negative = np.array(array[array[:, checkIndex] == -1], dtype=dtype)

    return np.concatenate((non_negative, negative), dtype=dtype)

class Card(Enum):
    ACE = 11.
    KING = 10.3
    QUEEN = 10.2
    JACK = 10.1
    TEN = 10.0
    NINE = 9.
    EIGHT = 8.
    SEVEN = 7.
    SIX = 6.
    FIVE = 5.
    FOUR = 4.
    THREE = 3.
    TWO = 2.

class Action(Enum):
    STAND = 0
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
#region hand
def calculateSoftHand(values) -> int:
    cards = [value for value in values if value != -1]
    try: idx = cards.index(Card.ACE.value)
    except: idx = -1

    val = 0
    for i, card in enumerate(cards):
        if(card == Card.ACE.value and i != idx): val += 1
        else: val += math.floor(card)
    return val

def calculateHardHand(values) -> int:
    cards = [value for value in values if value != -1]
    val = 0
    return val + np.sum(np.floor(cards), dtype=np.int32)

def calculatePairs(values):
    if(len(values) > 2): return []
    cards = [value for value in values if value != -1]
    pairs = []
    for idx, value in enumerate(cards):
        found_index = cards.index(value)
        if (found_index != idx and value not in pairs):
            pairs.append(value)

    return pairs

def calculateHand(values):
    soft = calculateSoftHand(values)
    hard = calculateHardHand(values)
    pairs = calculatePairs(values)
    highValue = soft if hard > 21 else hard

    return soft, hard, pairs, highValue
#endregion

BLACKJACK_VALUE = 21.
DEALER_STOP_VALUE = 17.
MIN_HAND_LENGTH = 2
MAX_PLAYER_HAND_CARDS = 12
DEALER_HAND_CARDS = 8
MAX_HANDS = 6

from gymnasium.spaces import Discrete, Box, Dict
import numpy as np
# Actions we can take - stand, hit, double_down, split,
ACTION_SPACE = Discrete(4)
# Observation space: (player_sum, dealer_up_card, usable_ace)
SINGLE_HAND_OBS = Dict({
    'player_hand': Box(low = -1, high = Card.ACE.value, shape = (MAX_PLAYER_HAND_CARDS,), dtype= np.float32),
    'usable_ace': Discrete(2),
    'player_total': Discrete(41),
    'done_hand': Discrete(2),
    'dealer_hand': Box(low = -1, high = Card.ACE.value, shape = (DEALER_HAND_CARDS,), dtype= np.float32),
    'dealer_total': Discrete(27),
})
MULTI_HAND_OBS = Dict({
    'player_hands': Box(low = -1, high = Card.ACE.value, shape = (MAX_HANDS, MAX_PLAYER_HAND_CARDS), dtype= np.float32),
    'usable_ace': Box(low = -1, high = Card.ACE.value, shape = (MAX_HANDS,), dtype= np.int32),
    'player_total': Box(low = -1, high = 41, shape = (MAX_HANDS,), dtype = np.int32),
    'player_hands_indices': Discrete(MAX_HANDS),
    'player_index': Discrete(MAX_HANDS),
    'done_hands': Box(low = -1, high = Card.ACE.value, shape = (MAX_HANDS,), dtype = np.int32),
    'dealer_hand': Box(low = -1, high = Card.ACE.value, shape = (DEALER_HAND_CARDS,), dtype= np.float32),
    'dealer_total': Discrete(27),
})
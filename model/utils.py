
import numpy as np
from enum import Enum

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

#region hand
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
#endregion

def shiftEndNegative1D(array): 
    non_negative = [a for a in array if a != -1]
    negative = [a for a in array if a == -1]

    return np.concatenate((non_negative, negative))

def shiftEndNegative2D(array, checkIndex):
    non_negative = array[array[:, checkIndex] != -1]
    negative = array[array[:, checkIndex] == -1]

    return np.concatenate((non_negative, negative))
def parseCards(cards):
    arr = []
    for card in cards:
        if(card == 'TWO'): arr.append(2.)
        elif(card == 'THREE'): arr.append(3.)
        elif(card == 'FOUR'): arr.append(4.)
        elif(card == 'FIVE'): arr.append(5.)
        elif(card == 'SIX'): arr.append(6.)
        elif(card == 'SEVEN'): arr.append(7.)
        elif(card == 'EIGHT'): arr.append(8.)
        elif(card == 'NINE'): arr.append(9.)
        elif(card == 'TEN'): arr.append(10.)
        elif(card == 'JACK'): arr.append(10.1)
        elif(card == 'QUEEN'): arr.append(10.2)
        elif(card == 'KING'): arr.append(10.3)
        elif(card == 'ACE'): arr.append(11.)

    return arr

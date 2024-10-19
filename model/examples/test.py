from utils import shiftEndNegative1D, shiftEndNegative2D
import numpy as np

class Obj:
    def __init__(self):
        self.state = {
            'double': np.array([[1, 2] + 19 * [-1]] + 5 * [21 * [-1]] + [[1, 2] + 19 * [-1]], dtype = np.float32),
            'array': np.array([-1] + [2] + [1] + [-1] + [4] + 5 * [-1], dtype = np.float32)
        }
# Create the object
self = Obj()

print(shiftEndNegative1D(self, 'array'))
print(shiftEndNegative2D(self, 'double', 0))
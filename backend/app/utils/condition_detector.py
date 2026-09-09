import re
import numpy as np

def infer_conditions(sample_names):
    """
    Infer conditions automatically from sample names.
    Strategy:
      1. Extract numeric part (e.g., S168 -> 168)
      2. Cluster samples into 2 groups using median split
      3. Assign condition A/B
    """

    numeric_values = []

    for s in sample_names:
        match = re.search(r"(\d+)", s)
        if match:
            numeric_values.append(int(match.group(1)))
        else:
            numeric_values.append(0)

    numeric_values = np.array(numeric_values)

    # Median split => two conditions
    median_val = np.median(numeric_values)

    conditions = {}
    for s, val in zip(sample_names, numeric_values):
        if val <= median_val:
            conditions[s] = "A"
        else:
            conditions[s] = "B"

    return conditions

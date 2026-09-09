from app.utils.data_loader import load_counts
from app.utils.data_interpreter import interpret_counts
from app.config import PIPELINE_VERBOSE

def run_statistics_agent(counts_path, verbose=None):
    if verbose is None:
        verbose = PIPELINE_VERBOSE

    if verbose:
        print("Running Statistics Agent...")

    df = load_counts(counts_path)
    summary = interpret_counts(df)
    return {"df": df, "summary": summary}

'''
I feel like the name statistics agent might be misleading 
but this one gives a summary of the statistics so its technically 
a statistics agent even tho the data is loaded from here
'''



'''
data: GSE116267_SUPT4H1_HEK293.tab
'''


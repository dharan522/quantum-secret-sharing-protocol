# storage.py
# Stores all session data in one dictionary (no database needed)

session = {}

def save(key, value):
    session[key] = value

def load(key, default=None):
    return session.get(key, default)

def clear():
    session.clear()

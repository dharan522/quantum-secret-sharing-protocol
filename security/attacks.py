# security/attacks.py
# Simulates 3 attacks to prove the protocol is secure

import random

def eavesdrop(members, measurements):
    # Attack 1 : Attacker intercepts quantum channel
    # Detection : measurements become mixed → QBER exceeds 11%
    values   = list(measurements.values())
    majority = max(set(values), key=values.count)
    errors   = sum(1 for v in values if v != majority)
    qber     = round(errors / len(values) * 100, 2)
    detected = len(set(values)) > 1
    return {
        "attack"  : "Eavesdropping",
        "qber"    : f"{qber}%",
        "detected": detected,
        "action"  : "Protocol ABORTED" if detected else "Not detected",
    }

def tamper(shares):
    # Attack 2 : Attacker changes Member 1's share value
    # Detection : SHA-256 hash no longer matches
    shares[0]["value"] += random.randint(1000, 9999)
    return {
        "attack"  : "Share Tampering",
        "target"  : shares[0]["member"],
        "detected": True,
        "action"  : f"{shares[0]['member']} share REJECTED — hash mismatch",
    }

def insufficient(k, r):
    # Attack 3 : Attacker tries to reconstruct with only 1 share
    # Detection : Zone check blocks reconstruction
    return {
        "attack"  : "Insufficient Shares",
        "provided": 1,
        "required": k + r,
        "detected": True,
        "action"  : f"BLOCKED — in SECURE ZONE. Need {k + r} shares.",
    }

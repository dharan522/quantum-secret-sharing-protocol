# quantum/qss.py
# Splits the AES key into shares and reconstructs it
#
# Ramp QSS zones (Ogawa et al. 2005):
#   Less than K shares    → SECURE ZONE    : cannot reconstruct
#   K to K+R-1 shares     → RAMP ZONE      : cannot reconstruct
#   K+R or more shares    → AUTHORIZED     : full reconstruction

import random, hashlib

PRIME = 2 ** 521 - 1

def make_shares(secret, k, r, members):
    coeffs = [secret] + [random.randrange(1, PRIME) for _ in range(k + r - 1)]
    shares = []
    for i, name in enumerate(members, start=1):
        value      = sum(c * pow(i, e) for e, c in enumerate(coeffs)) % PRIME
        hsh        = hashlib.sha256(f"{i}:{value}".encode()).hexdigest()
        member_key = hashlib.sha256(f"key:{i}:{value}".encode()).hexdigest()[:16].upper()
        shares.append({"member": name, "id": i, "value": value, "hash": hsh, "member_key": member_key})
    return shares

def verify_share(share):
    expected = hashlib.sha256(f"{share['id']}:{share['value']}".encode()).hexdigest()
    return expected == share["hash"]

def reconstruct(shares, k, r):
    upper = k + r
    n     = len(shares)

    if n < k:     return {"ok": False, "zone": "SECURE ZONE",     "secret": None}
    if n < upper: return {"ok": False, "zone": "RAMP ZONE",       "secret": None}

    pts    = shares[:upper]
    xs     = [s["id"]    for s in pts]
    ys     = [s["value"] for s in pts]
    secret = 0
    for i in range(upper):
        num = den = 1
        for j in range(upper):
            if i != j:
                num = num * (0 - xs[j]) % PRIME
                den = den * (xs[i] - xs[j]) % PRIME
        secret = (secret + ys[i] * num * pow(den, -1, PRIME)) % PRIME

    return {"ok": True, "zone": "AUTHORIZED ZONE", "secret": secret}
# evaluation/metrics.py
# Measures performance of the protocol for the report

import time, random

def encryption_speed(sizes_kb):
    # Measure AES encryption time for different file sizes
    from crypto.aes_engine import make_key, encrypt
    results = []
    for kb in sizes_kb:
        data  = "x" * (kb * 1024)
        key   = make_key()
        start = time.perf_counter()
        encrypt(data, key)
        ms    = round((time.perf_counter() - start) * 1000, 3)
        results.append({"size_kb": kb, "time_ms": ms})
    return results

def detection_rate(num_members, trials=1000):
    # Empirical vs theoretical attack detection rate
    from quantum.ghz import measure_qubits, check_channel
    members  = [f"Member {i}" for i in range(1, num_members + 1)]
    detected = sum(
        1 for _ in range(trials)
        if not check_channel(measure_qubits(members, under_attack=True))
    )
    theory = round((1 - 0.5 ** (num_members - 1)) * 100, 2)
    return {
        "members"    : num_members,
        "detected"   : detected,
        "empirical"  : f"{round(detected / trials * 100, 2)}%",
        "theoretical": f"{theory}%",
    }

def noise_analysis(num_members, noise_levels, trials=200):
    # Upgrade 2 : How background noise affects false positive rate
    # noise_level = probability a qubit flips accidentally (0.0 to 1.0)
    # false_positive = channel flagged COMPROMISED when no attacker
    # true_detection = channel flagged COMPROMISED when attacker present
    members = [f"Member {i}" for i in range(1, num_members + 1)]
    results = []

    for noise in noise_levels:
        false_positives = 0
        true_detections = 0

        for _ in range(trials):
            # No attacker — but noise may flip some qubits
            base = random.choice([0, 1])
            noisy = {}
            for member in members:
                flip          = random.random() < noise
                noisy[member] = (1 - base) if flip else base
            if len(set(noisy.values())) > 1:
                false_positives += 1

            # Attacker present — measurements fully random
            attack = {m: random.choice([0, 1]) for m in members}
            if len(set(attack.values())) > 1:
                true_detections += 1

        results.append({
            "noise_level"   : f"{round(noise * 100)}%",
            "false_positive": f"{round(false_positives / trials * 100, 2)}%",
            "true_detection": f"{round(true_detections / trials * 100, 2)}%",
        })

    return results

def qss_comparison(k, n, r_values):
    # Upgrade 3 : Compare Standard QSS vs Ramp QSS
    # Shows polynomial degree, threshold, info rate, reconstruction time
    from quantum.qss import make_shares, reconstruct
    members = [f"Member {i}" for i in range(1, n + 1)]
    secret  = random.randrange(1, 2 ** 256)
    results = []

    # Standard QSS row — reconstruction threshold = k, degree = k-1
    results.append({
        "scheme"           : f"Standard QSS (k={k})",
        "polynomial_degree": k - 1,
        "threshold"        : k,
        "info_rate"        : 1.0,
        "recon_time_ms"    : "N/A",
    })

    # Ramp QSS for each r value
    for r in r_values:
        if k + r > n:
            continue
        shares = make_shares(secret, k, r, members)
        start  = time.perf_counter()
        reconstruct(shares, k, r)
        ms     = round((time.perf_counter() - start) * 1000, 4)
        rate   = round((n - k) / (n - k + r), 4)
        results.append({
            "scheme"           : f"Ramp QSS (k={k}, r={r})",
            "polynomial_degree": k + r - 1,
            "threshold"        : k + r,
            "info_rate"        : rate,
            "recon_time_ms"    : ms,
        })

    return results
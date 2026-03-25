# app.py
# Flask web server — one /run route runs the full protocol
# Run : python app.py
# Open: http://127.0.0.1:5000

from flask import Flask, request, jsonify, render_template
import storage
from quantum.ghz        import prepare_ghz, measure_qubits, check_channel, get_circuit_diagram
from quantum.qss        import make_shares, verify_share, reconstruct
from crypto.aes_engine  import make_key, encrypt, decrypt, key_to_int, int_to_key
from security.attacks   import eavesdrop, tamper, insufficient
from evaluation.metrics import encryption_speed, detection_rate, noise_analysis, qss_comparison

app = Flask(__name__)

def ok(data): return jsonify({"status": "ok",    "data": data})
def err(msg): return jsonify({"status": "error", "message": msg}), 400

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/run", methods=["POST"])
def run():
    d           = request.get_json()
    n           = int(d.get("num_members", 3))
    k           = int(d.get("k", 2))
    r           = int(d.get("r", 1))
    message     = d.get("message", "").strip()
    attack_type = d.get("attack", "none")

    if n < 3:       return err("Minimum 3 members required.")
    if k < 2:       return err("K must be at least 2.")
    if k + r > n:   return err(f"K + R ({k+r}) cannot exceed members ({n}).")
    if not message: return err("Message cannot be empty.")

    members = [f"Member {i}" for i in range(1, n + 1)]

    # Step 1 : Prepare GHZ state and get circuit diagram
    ghz     = prepare_ghz(n)
    circuit = get_circuit_diagram(n)

    # Step 2 : Measure qubits using Qiskit AER (eavesdrop attack here)
    is_eavesdrop = attack_type == "eavesdrop"
    measurements = measure_qubits(members, under_attack=is_eavesdrop)

    # Step 3 : Check channel security
    channel_ok = check_channel(measurements)

    # Force eavesdrop to always fail for clear demonstration
    if is_eavesdrop:
        measurements[members[-1]] = 1 - measurements[members[0]]
        channel_ok = False

    attack_result = None
    if is_eavesdrop:
        attack_result = eavesdrop(members, measurements)
        return ok({
            "ghz": ghz, "circuit": circuit,
            "measurements": measurements,
            "channel": "COMPROMISED", "attack": attack_result,
            "stopped_at": "Step 3 — Channel Validation",
        })

    if not channel_ok:
        return ok({
            "ghz": ghz, "circuit": circuit,
            "measurements": measurements, "channel": "COMPROMISED",
            "stopped_at": "Step 3 — Channel failed. Retrying...",
        })

    # Step 4 : Encrypt message with AES-256-GCM
    aes_key   = make_key()
    encrypted = encrypt(message, aes_key)

    # Step 5 : Split AES key using Ramp QSS
    shares    = make_shares(key_to_int(aes_key), k, r, members)
    info_rate = round((n - k) / (n - k + r), 4)

    # Save to storage for evaluation route
    storage.save("k", k)
    storage.save("num_members", n)

    # Apply tamper attack — corrupt Member 1's share
    if attack_type == "tamper":
        attack_result = tamper(shares)

    # Step 6 : Verify share hashes, reject tampered shares
    valid   = [s for s in shares if verify_share(s)]
    invalid = [s["member"] for s in shares if not verify_share(s)]

    # Apply insufficient attack — only use 1 share
    if attack_type == "insufficient":
        attack_result = insufficient(k, r)
        valid = valid[:1]

    # Step 7 : Reconstruct AES key from shares
    recon = reconstruct(valid, k, r)

    if not recon["ok"]:
        return ok({
            "ghz": ghz, "circuit": circuit,
            "measurements": measurements, "channel": "SECURE",
            "aes_key": aes_key.hex().upper(), "shares": _fmt(shares),
            "info_rate": info_rate, "rejected": invalid,
            "zone": recon["zone"], "recon": False,
            "attack": attack_result,
            "stopped_at": f"Step 7 — Blocked in {recon['zone']}",
        })

    # Step 8 : Decrypt message
    recovered_key     = int_to_key(recon["secret"])
    decrypted_message = decrypt(encrypted, recovered_key)

    return ok({
        "ghz"            : ghz,
        "circuit"        : circuit,
        "measurements"   : measurements,
        "channel"        : "SECURE",
        "aes_key"        : aes_key.hex().upper(),
        "encrypted_size" : len(encrypted),
        "shares"         : _fmt(shares),
        "info_rate"      : info_rate,
        "upper_threshold": k + r,
        "zones"          : {
            "secure"    : f"< {k} shares → zero info",
            "ramp"      : f"{k} to {k+r-1} shares → cannot reconstruct",
            "authorized": f"{k+r}+ shares → full reconstruction",
        },
        "rejected"       : invalid,
        "zone"           : recon["zone"],
        "recon"          : True,
        "original"       : message,
        "decrypted"      : decrypted_message,
        "match"          : message == decrypted_message,
        "attack"         : attack_result,
        "member_keys"    : {s["member"]: s.get("member_key", "") for s in shares},
        "k"              : k,
    })

@app.route("/evaluation", methods=["GET"])
def evaluation():
    k = storage.load("k", 2)
    n = storage.load("num_members", 3)
    return ok({
        "encryption_speed": encryption_speed([1, 10, 50, 100, 500]),
        "detection_rates" : [detection_rate(m) for m in [3, 5, 7]],
        "noise_analysis"  : noise_analysis(3, [0.0, 0.05, 0.10, 0.15, 0.20]),
        "qss_comparison"  : qss_comparison(k=k, n=n, r_values=[1, 2]),
    })

@app.route("/reset", methods=["POST"])
def reset():
    storage.clear()
    return ok({"message": "Reset done."})

def _fmt(shares):
    return [{"member": s["member"], "id": s["id"],
             "value" : str(s["value"])[:20] + "...",
             "hash"  : s["hash"][:20] + "...",
             "member_key": s.get("member_key", "N/A")} for s in shares]

if __name__ == "__main__":
    print("Open browser : http://127.0.0.1:5000")
    app.run(debug=True)
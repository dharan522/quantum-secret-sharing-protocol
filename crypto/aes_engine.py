# crypto/aes_engine.py
# Encrypts and decrypts messages using AES-256-GCM
#
# AES-256 : 256-bit key, very strong encryption
# GCM     : also detects if data was tampered

import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def make_key():
    # Generate a random 256-bit AES key (32 bytes)
    return os.urandom(32)

def encrypt(message, key):
    # Encrypt message string, return bytes (nonce + ciphertext)
    nonce = os.urandom(12)
    return nonce + AESGCM(key).encrypt(nonce, message.encode(), None)

def decrypt(data, key):
    # Decrypt bytes back to original message string
    try:
        return AESGCM(key).decrypt(data[:12], data[12:], None).decode()
    except Exception:
        raise ValueError("Decryption failed. Wrong key or tampered data.")

def key_to_int(key):
    # Convert key bytes to integer (needed for QSS math)
    return int.from_bytes(key, "big")

def int_to_key(number):
    # Convert integer back to 32-byte AES key
    raw = number.to_bytes(max(32, (number.bit_length() + 7) // 8), "big")
    return raw[-32:] if len(raw) >= 32 else raw.rjust(32, b'\x00')

Quantum Secret Sharing is a cryptographic technique where a secret is divided among multiple parties using quantum states. Unlike classical methods, QSS ensures intrinsic security through:

Quantum entanglement
No-cloning theorem
Measurement disturbance detection

This project demonstrates a working model of a QSS protocol, showcasing how quantum mechanics can enhance secure communication.

🚀 Features
🔑 Secure distribution of secrets among multiple participants
⚛️ Utilizes quantum states (e.g., qubits, entanglement)
🛡️ Detection of eavesdropping attempts
👥 Threshold-based reconstruction of the secret
📊 Simulation-ready (can be extended to real quantum hardware)
🧠 How It Works
Secret Encoding
The secret is encoded into quantum states using entangled particles.
Distribution Phase
Qubits are distributed among participants through quantum channels.
Measurement Phase
Participants perform measurements based on predefined bases.
Verification
A subset of qubits is used to detect any interference or eavesdropping.
Reconstruction
Only authorized groups (meeting the threshold condition) can reconstruct the original secret.

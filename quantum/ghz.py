# quantum/ghz.py
# Simulates GHZ quantum entanglement using Qiskit AER
#
# GHZ state formula : |GHZ> = 1/√2 ( |000> + |111> )
# Without attack    : all members measure SAME value
# With attack       : measurements become RANDOM (mixed)

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

def prepare_ghz(num_members):
    zeros = "0" * num_members
    ones  = "1" * num_members
    return f"1/√2 ( |{zeros}> + |{ones}> )"

def get_circuit_diagram(num_members):
    # Build and return GHZ circuit diagram as text
    qc = QuantumCircuit(num_members)
    qc.h(0)                                    # Hadamard on first qubit
    for i in range(1, num_members):
        qc.cx(0, i)                            # CNOT from qubit 0 to all others
    return str(qc.draw(output='text'))

def measure_qubits(members, under_attack=False):
    # Run real Qiskit AER simulation
    # Normal  : GHZ correlation holds → all same result
    # Attack  : X gate injected → breaks entanglement → mixed results
    num_members = len(members)
    qc          = QuantumCircuit(num_members, num_members)
    qc.h(0)
    for i in range(1, num_members):
        qc.cx(0, i)

    if under_attack:
        # Inject X gate on last qubit to simulate eavesdropper
        qc.x(num_members - 1)

    qc.measure(range(num_members), range(num_members))

    simulator = AerSimulator()
    result    = simulator.run(qc, shots=1).result()
    bitstring = list(result.get_counts().keys())[0]

    # Map each bit to each member
    measurements = {}
    for i, member in enumerate(members):
        measurements[member] = int(bitstring[-(i + 1)])

    return measurements

def check_channel(measurements):
    # True = all same = SECURE
    # False = mixed = COMPROMISED
    return len(set(measurements.values())) == 1
export function syncCircuitSelection(engine, circuitId, parameters) {
    engine.setCircuit(circuitId);
    const circuitParams = parameters[circuitId];
    if (!circuitParams)
        return;
    Object.entries(circuitParams).forEach(([parameterId, value]) => {
        engine.setParameter(circuitId, parameterId, value);
    });
}

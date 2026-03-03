import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { syncCircuitSelection } from '../src/audio/syncCircuitSelection.js';
describe('syncCircuitSelection', () => {
    it('sets circuit and applies all saved parameters in the same call', () => {
        const calls = [];
        const engine = {
            setCircuit: (circuitId) => {
                calls.push(`setCircuit:${circuitId}`);
            },
            setParameter: (circuitId, parameterId, value) => {
                calls.push(`setParameter:${circuitId}.${parameterId}=${value}`);
            },
        };
        syncCircuitSelection(engine, 'rat', {
            rat: { distortion: 18, filter: 3400, volume: 0.92 },
        });
        assert.deepEqual(calls, [
            'setCircuit:rat',
            'setParameter:rat.distortion=18',
            'setParameter:rat.filter=3400',
            'setParameter:rat.volume=0.92',
        ]);
    });
    it('still switches circuit immediately when no saved params exist', () => {
        const calls = [];
        const engine = {
            setCircuit: (circuitId) => {
                calls.push(`setCircuit:${circuitId}`);
            },
            setParameter: () => {
                calls.push('setParameter');
            },
        };
        syncCircuitSelection(engine, 'boss-ds1', {});
        assert.deepEqual(calls, ['setCircuit:boss-ds1']);
    });
});

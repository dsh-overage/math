const assert = require('assert');
const Core = require('../core.js');

const state = Core.normalizedState();
assert.equal(Object.keys(state.skills).length, 8);
assert.equal(Core.levelFromXp(0).level, 1);
assert.equal(Core.weakestSkills(state, 2).length, 2);

for (const skill of Object.keys(Core.SKILLS)) {
  for (let d = 1; d <= 10; d++) {
    const q = Core.generateQuestion(skill, d);
    assert.equal(q.skill, skill);
    assert(Number.isFinite(Number(q.answer)), `${skill} difficulty ${d} produced invalid answer`);
    assert(Core.checkAnswer(q, String(q.answer)), `${skill} difficulty ${d} rejects its own answer`);
  }
}

const q = Core.generateQuestion('mental', 5);
const before = state.skills.mental;
const xp = Core.applyAttempt(state, q, true, 'daily');
assert(xp > 0);
assert(state.skills.mental >= before);
assert.equal(state.solved, 1);
assert.equal(state.correct, 1);

const session = Core.makeSession('daily', state);
assert.equal(session.length, 12);
assert.equal(Core.makeSession('diagnostic', state).length, 8);
assert.equal(Core.makeSession('boss', state).length, 5);
assert.equal(Core.makeSession('weakness', state).length, 10);

console.log('NUMEN core tests passed');

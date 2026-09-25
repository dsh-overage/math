(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MathCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SKILLS = {
    mental: { name: 'Mental Math', short: 'Speed + number sense', description: 'Fast arithmetic, decomposition and estimation.', color: '#8f7cff' },
    percent: { name: 'Percentages', short: 'Rates + change', description: 'Percentages, ratios and successive changes.', color: '#65d7ff' },
    finance: { name: 'Financial Math', short: 'Money + margins', description: 'Budgets, margins, growth and practical money math.', color: '#68e3af' },
    logic: { name: 'Logic', short: 'Patterns + deduction', description: 'Sequences, constraints and structured reasoning.', color: '#ffce73' },
    algebra: { name: 'Algebra', short: 'Unknowns + models', description: 'Equations and translating situations into variables.', color: '#c993ff' },
    probability: { name: 'Probability', short: 'Risk + uncertainty', description: 'Chance, independence and expected outcomes.', color: '#ff8fa8' },
    statistics: { name: 'Statistics', short: 'Signal + data', description: 'Averages, distributions and interpretation.', color: '#79d2a6' },
    data: { name: 'Data / IT Math', short: 'Systems + scale', description: 'Throughput, growth, latency and technical estimation.', color: '#70a8ff' }
  };

  const DEFAULT_STATE = {
    version: 2,
    xp: 0,
    solved: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    sessions: 0,
    diagnosticDone: false,
    lessonsCompleted: [],
    skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 50])),
    attemptsBySkill: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    correctBySkill: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
    history: []
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const round = (n, digits = 0) => Number(n.toFixed(digits));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = arr => arr[rand(0, arr.length - 1)];
  const shuffle = arr => [...arr].sort(() => Math.random() - .5);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);

  function normalizedState(raw) {
    const state = clone(DEFAULT_STATE);
    if (!raw || typeof raw !== 'object') return state;
    for (const key of ['xp','solved','correct','streak','bestStreak','sessions']) if (Number.isFinite(raw[key])) state[key] = raw[key];
    state.lastActiveDate = raw.lastActiveDate || null;
    state.diagnosticDone = !!raw.diagnosticDone;
    state.lessonsCompleted = Array.isArray(raw.lessonsCompleted) ? [...new Set(raw.lessonsCompleted.filter(x => typeof x === 'string'))] : [];
    for (const skill of Object.keys(SKILLS)) {
      if (raw.skills && Number.isFinite(raw.skills[skill])) state.skills[skill] = clamp(raw.skills[skill], 0, 100);
      if (raw.attemptsBySkill && Number.isFinite(raw.attemptsBySkill[skill])) state.attemptsBySkill[skill] = Math.max(0, raw.attemptsBySkill[skill]);
      if (raw.correctBySkill && Number.isFinite(raw.correctBySkill[skill])) state.correctBySkill[skill] = Math.max(0, raw.correctBySkill[skill]);
    }
    state.history = Array.isArray(raw.history) ? raw.history.slice(0, 30) : [];
    return state;
  }

  function updateStreak(state, date = todayISO()) {
    if (!state.lastActiveDate) {
      state.streak = 1;
    } else if (state.lastActiveDate !== date) {
      const gap = dayDiff(state.lastActiveDate, date);
      state.streak = gap === 1 ? state.streak + 1 : 1;
    }
    state.lastActiveDate = date;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    return state;
  }

  function levelFromXp(xp) {
    let level = 1;
    let threshold = 100;
    let used = 0;
    while (xp >= used + threshold) {
      used += threshold;
      level += 1;
      threshold = Math.round(100 * Math.pow(1.17, level - 1));
    }
    return { level, floorXp: used, nextXp: used + threshold, progress: (xp - used) / threshold };
  }

  function rankName(level) {
    if (level >= 20) return 'Architect';
    if (level >= 14) return 'Strategist';
    if (level >= 9) return 'Analyst';
    if (level >= 5) return 'Operator';
    return 'Initiate';
  }

  function weakestSkills(state, count = 2) {
    return Object.entries(state.skills).sort((a,b) => a[1] - b[1]).slice(0,count).map(([k]) => k);
  }
  function strongestSkill(state) {
    return Object.entries(state.skills).sort((a,b) => b[1] - a[1])[0][0];
  }
  function difficultyForSkill(state, skill, modifier = 0) {
    return clamp(Math.round(state.skills[skill] / 12) + 1 + modifier, 1, 10);
  }

  function mentalQuestion(d) {
    if (d <= 2) {
      const a = rand(18, 89), b = rand(7, 49);
      return q('mental', d, `${a} + ${b}`, a+b, 'Split one number into tens and ones.', `${a} + ${b} = ${a + b}.`);
    }
    if (d <= 5) {
      const a = rand(12, 49), b = rand(6, 19);
      return q('mental', d, `${a} × ${b}`, a*b, `Round ${b} to a nearby easy number, then compensate.`, `${a} × ${b} = ${a*b}. Try decomposition instead of long multiplication.`);
    }
    if (d <= 7) {
      const base = rand(11, 39), mult = pick([6,7,8,9,11,12]);
      const dividend = base * mult;
      return q('mental', d, `${dividend} ÷ ${mult}`, base, 'Reverse the multiplication table.', `${dividend} ÷ ${mult} = ${base}.`);
    }
    const a = rand(45, 95), b = rand(45, 95);
    return q('mental', d, `${a} × ${b}`, a*b, 'Use a nearby round base such as 50 or 100.', `A fast route is to decompose around a round base. Exact answer: ${a*b}.`);
  }

  function percentQuestion(d) {
    if (d <= 3) {
      const pct = pick([5,10,12.5,15,20,25,30,40]);
      const base = pick([80,120,160,200,240,320,400,480]);
      return q('percent', d, `What is ${pct}% of ${base}?`, base*pct/100, `Start from 10%, 25% or 50% and compose the rest.`, `${pct}% of ${base} = ${round(base*pct/100,2)}.`);
    }
    if (d <= 6) {
      const base = rand(80, 600);
      const pct = pick([8,12,15,18,22,25]);
      const direction = pick(['increase','decrease']);
      const ans = direction === 'increase' ? base*(1+pct/100) : base*(1-pct/100);
      return q('percent', d, `A value of ${base} changes by ${pct}% (${direction}). What is the new value?`, ans, `Use a multiplier: ${direction === 'increase' ? '1 +' : '1 -'} ${pct/100}.`, `Multiply ${base} by ${direction === 'increase' ? round(1+pct/100,2) : round(1-pct/100,2)} = ${round(ans,2)}.`);
    }
    const base = pick([120,160,200,240,320,400]);
    const pct = pick([10,15,20,25]);
    const ans = base * (1+pct/100) * (1-pct/100);
    return q('percent', d, `${base} rises by ${pct}% and then falls by ${pct}%. Final value?`, ans, 'Equal percentage up and down do not cancel because the second percentage uses a new base.', `${base} × ${round(1+pct/100,2)} × ${round(1-pct/100,2)} = ${round(ans,2)}.`);
  }

  function financeQuestion(d) {
    if (d <= 3) {
      const income = pick([1800,2200,2600,3000]);
      const fixed = pick([900,1100,1250,1400]);
      const save = pick([20,25,30,35]);
      const ans = (income-fixed)*save/100;
      return q('finance', d, `Net income €${income}. Fixed costs €${fixed}. You save ${save}% of what remains. Monthly savings?`, ans, 'First calculate disposable income, then take the percentage.', `(${income} − ${fixed}) × ${save/100} = €${round(ans,2)}.`);
    }
    if (d <= 6) {
      const price = pick([59,69,79,89,99]);
      const cost = pick([21,24,27,29,32]);
      const ad = pick([12,16,19,21,24]);
      const fee = pick([2.5,2.9,3.2]);
      const ans = price - cost - ad - price*fee/100;
      return q('finance', d, `Product sells for €${price}. Cost €${cost}, ads €${ad}, payment fee ${fee}%. Contribution margin per order?`, ans, 'Subtract every variable cost. The fee is a percentage of selling price.', `${price} − ${cost} − ${ad} − ${round(price*fee/100,2)} = €${round(ans,2)}.`);
    }
    const capital = pick([1000,1500,2000,2500]);
    const rate = pick([4,5,6,8]);
    const years = pick([2,3,4]);
    const ans = capital * Math.pow(1+rate/100, years);
    return q('finance', d, `€${capital} grows at ${rate}% per year for ${years} years, compounded annually. Final amount?`, ans, 'Compound growth multiplies the capital by the same growth factor each year.', `${capital} × ${round(1+rate/100,2)}^${years} = €${round(ans,2)}.`);
  }

  function logicQuestion(d) {
    if (d <= 3) {
      const start = rand(2,15), step = rand(2,9);
      const seq = [0,1,2,3].map(i => start+i*step);
      return q('logic', d, `Continue the sequence: ${seq.join(', ')}, ?`, start+4*step, 'Look at the difference between adjacent terms.', `The constant difference is ${step}, so the next term is ${start+4*step}.`);
    }
    if (d <= 6) {
      const a = rand(2,8), b = rand(1,6), start = rand(1,5);
      const seq = [start];
      for(let i=0;i<3;i++) seq.push(seq[i]*a+b);
      const ans = seq[3]*a+b;
      return q('logic', d, `Rule is consistent: ${seq.join(' → ')} → ?. Find the next number.`, ans, `Try “multiply, then add”.`, `Each step is ×${a} + ${b}. Next: ${seq[3]} × ${a} + ${b} = ${ans}.`);
    }
    const n = rand(4,8);
    const total = n*(n-1)/2;
    return q('logic', d, `${n} people each shake hands with every other person exactly once. How many handshakes?`, total, 'Each pair should be counted exactly once.', `Number of unique pairs is ${n}×${n-1}÷2 = ${total}.`);
  }

  function algebraQuestion(d) {
    if (d <= 3) {
      const x = rand(2,15), a = rand(2,8), b = rand(1,15), c = a*x+b;
      return q('algebra', d, `Solve for x: ${a}x + ${b} = ${c}`, x, `Undo +${b}, then divide by ${a}.`, `${a}x = ${c-b}, so x = ${x}.`);
    }
    if (d <= 6) {
      const x = rand(2,12), a=rand(2,7), b=rand(1,9), c=rand(2,5), rhs=(a-c)*x+b;
      return q('algebra', d, `Solve: ${a}x + ${b} = ${c}x + ${rhs}`, x, 'Move x terms to one side and constants to the other.', `${a-c}x = ${rhs-b}, so x = ${x}.`);
    }
    const x=rand(3,12), a=rand(2,6), b=rand(1,8), c=a*(x+b);
    return q('algebra', d, `${a}(x + ${b}) = ${c}. Find x.`, x, `Divide by ${a} first, then subtract ${b}.`, `x + ${b} = ${c/a}; x = ${x}.`);
  }

  function probabilityQuestion(d) {
    if (d <= 3) {
      const sides = pick([4,6,8,10]);
      const favourable = rand(1,sides-1);
      const ans = favourable/sides*100;
      return q('probability', d, `A fair ${sides}-sided die has ${favourable} winning faces. Win probability in percent?`, ans, 'Probability = favourable outcomes ÷ total outcomes.', `${favourable}/${sides} = ${round(ans,2)}%.`);
    }
    if (d <= 6) {
      const p = pick([20,25,30,40,50]);
      const ans = Math.pow(p/100,2)*100;
      return q('probability', d, `An independent event has ${p}% probability. Probability it happens twice in a row?`, ans, 'Independent probabilities multiply.', `${p/100} × ${p/100} = ${round(ans,2)}%.`);
    }
    const p = pick([10,20,25,30]);
    const n = pick([2,3,4]);
    const ans = (1-Math.pow(1-p/100,n))*100;
    return q('probability', d, `Chance of success per independent attempt is ${p}%. What is the chance of at least one success in ${n} attempts?`, ans, 'It is easier to calculate “no successes” first, then subtract from 100%.', `1 − ${(1-p/100).toFixed(2)}^${n} = ${round(ans,2)}%.`);
  }

  function statisticsQuestion(d) {
    const len = d <= 4 ? 5 : 7;
    const values = Array.from({length:len}, () => rand(4,30));
    if (d <= 5) {
      const ans = values.reduce((a,b)=>a+b,0)/len;
      return q('statistics', d, `Mean of: ${values.join(', ')}`, ans, 'Add all values and divide by how many values there are.', `Sum ${values.reduce((a,b)=>a+b,0)} ÷ ${len} = ${round(ans,2)}.`);
    }
    const sorted=[...values].sort((a,b)=>a-b);
    const ans=sorted[Math.floor(len/2)];
    return q('statistics', d, `Median of: ${values.join(', ')}`, ans, 'Sort the values first. The median is the middle observation.', `Sorted: ${sorted.join(', ')}. Median = ${ans}.`);
  }

  function dataQuestion(d) {
    if (d <= 4) {
      const rate = pick([25,30,35,40,50]);
      const seconds = pick([20,30,45,60]);
      return q('data', d, `A service handles ${rate} requests/second. How many requests in ${seconds} seconds?`, rate*seconds, 'Throughput × time = total work.', `${rate} × ${seconds} = ${rate*seconds} requests.`);
    }
    if (d <= 7) {
      const current=pick([30,40,50,60]); const growth=pick([10,15,20,25]);
      const ans=current*(1+growth/100);
      return q('data', d, `Traffic is ${current} req/s and rises by ${growth}%. New throughput?`, ans, 'Apply the growth multiplier to the current rate.', `${current} × ${round(1+growth/100,2)} = ${round(ans,2)} req/s.`);
    }
    const latency=pick([80,100,120,150]); const parallel=pick([4,5,8,10]);
    const ans=parallel/(latency/1000);
    return q('data', d, `A worker takes ${latency} ms per request and runs ${parallel} requests in parallel. Approx max throughput per second?`, ans, 'Convert milliseconds to seconds, then divide parallel capacity by request duration.', `${parallel} ÷ ${latency/1000} ≈ ${round(ans,2)} req/s.`);
  }

  const GENERATORS = { mental: mentalQuestion, percent: percentQuestion, finance: financeQuestion, logic: logicQuestion, algebra: algebraQuestion, probability: probabilityQuestion, statistics: statisticsQuestion, data: dataQuestion };

  function q(skill, difficulty, prompt, answer, hint, explanation, extras={}) {
    return { id: `${skill}-${Date.now()}-${Math.random().toString(16).slice(2)}`, skill, difficulty, prompt, answer: round(answer, 2), hint, explanation, context: SKILLS[skill].short, tolerance: Math.max(.01, Math.abs(answer)*.002), type:'number', ...extras };
  }

  function generateQuestion(skill, difficulty) {
    const key = SKILLS[skill] ? skill : 'mental';
    return GENERATORS[key](clamp(difficulty,1,10));
  }

  function makeSession(mode, state) {
    const all = Object.keys(SKILLS);
    let plan=[];
    if (mode === 'diagnostic') {
      plan = all.map(skill => ({skill, difficulty:5}));
    } else if (mode === 'weakness') {
      const weak = weakestSkills(state,2);
      for(let i=0;i<10;i++) { const skill=weak[i%weak.length]; plan.push({skill,difficulty:difficultyForSkill(state,skill,1)}); }
    } else if (mode === 'boss') {
      const pool = shuffle(all).slice(0,5);
      plan = pool.map(skill => ({skill,difficulty:clamp(difficultyForSkill(state,skill,2),6,10)}));
    } else if (mode === 'speed') {
      const pool=['mental','percent','algebra'];
      for(let i=0;i<60;i++) { const skill=pick(pool); plan.push({skill,difficulty:clamp(difficultyForSkill(state,skill,-1),1,7)}); }
    } else {
      const weak=weakestSkills(state,3);
      for(let i=0;i<12;i++) {
        const skill = i < 7 ? pick(weak) : pick(all);
        plan.push({skill,difficulty:difficultyForSkill(state,skill,0)});
      }
    }
    return plan.map(p => generateQuestion(p.skill,p.difficulty));
  }

  function checkAnswer(question, raw) {
    if (question.type === 'choice') return String(raw) === String(question.answer);
    const parsed = Number(String(raw).replace(',', '.').replace(/[^0-9.\-]/g,''));
    if (!Number.isFinite(parsed)) return false;
    return Math.abs(parsed - Number(question.answer)) <= question.tolerance;
  }

  function applyAttempt(state, question, correct, mode='daily') {
    const s=state;
    s.solved += 1;
    s.attemptsBySkill[question.skill] += 1;
    if (correct) { s.correct += 1; s.correctBySkill[question.skill] += 1; }
    const expected = clamp((question.difficulty*10 - s.skills[question.skill]) / 20, -2, 2);
    const delta = correct ? clamp(1.8 + expected, .8, 4.2) : -clamp(1.5 - expected*.3, .8, 2.4);
    const modeMult = mode === 'boss' ? 1.25 : mode === 'diagnostic' ? 1.45 : 1;
    s.skills[question.skill] = round(clamp(s.skills[question.skill] + delta*modeMult, 0,100),1);
    const xp = correct ? Math.round((6 + question.difficulty*2) * (mode === 'boss' ? 1.4 : 1)) : 1;
    s.xp += xp;
    return xp;
  }

  function applyDiagnostic(state, answers) {
    const grouped={};
    for(const a of answers){
      if(!grouped[a.skill]) grouped[a.skill]=[];
      grouped[a.skill].push(a);
    }
    for(const [skill,items] of Object.entries(grouped)){
      const score=items.reduce((sum,a)=>sum+(a.correct ? 1:0),0)/items.length;
      const avgDiff=items.reduce((sum,a)=>sum+a.difficulty,0)/items.length;
      state.skills[skill]=round(clamp(25 + score*55 + (avgDiff-5)*2.5, 10,95),1);
    }
    state.diagnosticDone=true;
  }

  function completeLesson(state, lessonId, skill) {
    if (!state.lessonsCompleted.includes(lessonId)) {
      state.lessonsCompleted.push(lessonId);
      state.xp += 25;
      if (state.skills[skill] !== undefined) state.skills[skill] = round(clamp(state.skills[skill] + 1.5, 0, 100), 1);
    }
    updateStreak(state);
    return state;
  }

  function completeSession(state, summary) {
    updateStreak(state);
    state.sessions += 1;
    state.history.unshift({
      date: new Date().toISOString(),
      mode: summary.mode,
      correct: summary.correct,
      total: summary.total,
      xp: summary.xp,
      focus: summary.focus || null
    });
    state.history=state.history.slice(0,30);
  }

  return {
    SKILLS, DEFAULT_STATE, normalizedState, clamp, round, todayISO, updateStreak,
    levelFromXp, rankName, weakestSkills, strongestSkill, difficultyForSkill,
    generateQuestion, makeSession, checkAnswer, applyAttempt, applyDiagnostic, completeLesson, completeSession
  };
});

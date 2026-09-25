(() => {
  'use strict';
  const Core = window.MathCore;
  const STORAGE_KEY = 'numen-math-state-v1';
  let state = loadState();
  let session = null;

  const viewMeta = {
    home: ['PERSONAL MATH OS', 'Command center'],
    map: ['MASTERY GRAPH', 'Skill map'],
    train: ['ADAPTIVE ENGINE', 'Training'],
    analytics: ['PERFORMANCE DATA', 'Analytics']
  };
  const modeNames = { daily:'Daily mission', diagnostic:'Diagnostic', speed:'Speed protocol', weakness:'Weakness attack', boss:'Boss fight' };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function loadState(){
    try { return Core.normalizedState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return Core.normalizedState(); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function switchView(name){
    $$('.view').forEach(v=>v.classList.remove('is-active'));
    `#view-${name}` && $(`#view-${name}`).classList.add('is-active');
    $$('.nav-item').forEach(b=>b.classList.toggle('is-active', b.dataset.view===name));
    $('#viewEyebrow').textContent=viewMeta[name][0];
    $('#viewTitle').textContent=viewMeta[name][1];
    window.scrollTo({top:0,behavior:'smooth'});
    if(name==='analytics') renderAnalytics();
    if(name==='map') renderSkillMap();
  }

  function skillEntriesSorted(){ return Object.entries(state.skills).sort((a,b)=>a[1]-b[1]); }
  function render(){
    const level=Core.levelFromXp(state.xp);
    const weak=skillEntriesSorted()[0];
    const strong=skillEntriesSorted().slice(-1)[0];
    $('#streakValue').textContent=state.streak;
    $('#levelValue').textContent=level.level;
    $('#levelBadge').textContent=String(level.level).padStart(2,'0');
    $('#rankName').textContent=Core.rankName(level.level);
    $('#xpProgress').style.width=`${Math.round(level.progress*100)}%`;
    $('#xpCurrent').textContent=`${state.xp-level.floorXp} XP`;
    $('#xpTarget').textContent=`${level.nextXp-level.floorXp} XP`;
    $('#solvedValue').textContent=state.solved;
    $('#accuracyValue').textContent=state.solved ? `${Math.round(state.correct/state.solved*100)}%` : '—';
    $('#bestStreakValue').textContent=state.bestStreak;
    $('#focusTitle').textContent=Core.SKILLS[weak[0]].name;
    $('#focusScore').textContent=Math.round(weak[1]);
    $('#focusProgress').style.width=`${weak[1]}%`;
    $('#heroFocus').textContent=Core.SKILLS[weak[0]].name.split(' ')[0];
    $('#heroText').textContent=state.diagnosticDone
      ? `Adaptive mix is currently biased toward ${Core.SKILLS[weak[0]].name} and ${Core.SKILLS[skillEntriesSorted()[1][0]].name}, while still keeping your stronger areas active.`
      : 'Start with the diagnostic once. It will replace the default ratings with a first estimate of your actual strengths and weaknesses.';
    $('#analyticsStrongest').textContent=Core.SKILLS[strong[0]].name;
    renderSkillCards();
    renderSkillMap();
    renderAnalytics();
  }

  function renderSkillCards(){
    $('#skillGrid').innerHTML=Object.entries(Core.SKILLS).map(([key,skill])=>{
      const score=Math.round(state.skills[key]);
      return `<article class="skill-card" style="--skill-glow:${hexToGlow(skill.color)}">
        <div class="skill-top"><div><div class="eyebrow">${skill.short}</div><div class="skill-name">${skill.name}</div></div><div class="skill-score">${score}</div></div>
        <div class="skill-description">${skill.description}</div><div class="skill-bar"><span style="width:${score}%"></span></div>
      </article>`;
    }).join('');
  }

  function renderSkillMap(){
    const layout=[
      ['mental',0,0], ['percent',1,0], ['finance',2,0], ['statistics',3,0],
      ['logic',0,1], ['algebra',1,1], ['probability',2,1], ['data',3,1]
    ];
    $('#skillMap').innerHTML=`<div class="map-grid">${layout.map(([key,col])=>{
      const skill=Core.SKILLS[key], score=Math.round(state.skills[key]);
      const cls=score<42?'low':score>72?'high':'';
      return `<div class="map-node ${cls}" data-col="${col}"><div class="node-ring">${symbolFor(key)}</div><div class="map-node-score">${score}</div><strong>${skill.name}</strong><small>${skill.short}</small></div>`;
    }).join('')}</div>`;
  }

  function renderAnalytics(){
    $('#analyticsXp').textContent=state.xp;
    $('#analyticsAccuracy').textContent=state.solved?`${Math.round(state.correct/state.solved*100)}%`:'—';
    $('#analyticsSessions').textContent=state.sessions;
    const strongest=Core.strongestSkill(state);
    $('#analyticsStrongest').textContent=Core.SKILLS[strongest].name;
    $('#historyList').innerHTML=state.history.length ? state.history.map(h=>{
      const d=new Date(h.date);
      return `<div class="history-row"><div><strong>${modeNames[h.mode]||h.mode}</strong><br><small>${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><span>${h.correct}/${h.total}</span><span>${Math.round(h.correct/h.total*100)}%</span><span>+${h.xp} XP</span></div>`;
    }).join('') : '<div class="history-empty">No completed sessions yet. Your first one will appear here.</div>';
  }

  function symbolFor(key){ return ({mental:'±',percent:'%',finance:'€',logic:'◇',algebra:'x',probability:'P',statistics:'μ',data:'↯'})[key]; }
  function hexToGlow(hex){ return hex + '25'; }

  function startSession(mode){
    if(session && !confirm('Exit the current session and start a new one?')) return;
    switchView('train');
    const questions=Core.makeSession(mode,state);
    session={mode,questions,index:0,correct:0,xp:0,answers:[],startedAt:Date.now(),timeLeft:mode==='speed'?60:null,timer:null,answered:false,selectedChoice:null};
    renderQuestionShell();
    if(mode==='speed') startTimer();
  }

  function renderQuestionShell(){
    const stage=$('#trainingStage');
    stage.innerHTML='';
    stage.appendChild($('#questionTemplate').content.cloneNode(true));
    stage.querySelector('.session-mode').textContent=modeNames[session.mode];
    stage.querySelector('.session-title').textContent=session.mode==='diagnostic'?'Calibrate your map':'Stay precise under pressure';
    stage.querySelector('.session-close').addEventListener('click',closeSession);
    stage.querySelector('.hint-button').addEventListener('click',showHint);
    stage.querySelector('.submit-answer').addEventListener('click',submitCurrent);
    if(session.mode==='speed') stage.querySelector('.timer-box').classList.remove('is-hidden');
    renderCurrentQuestion();
  }

  function renderCurrentQuestion(){
    if(!session) return;
    if(session.index>=session.questions.length) return finishSession();
    const q=session.questions[session.index];
    session.answered=false; session.selectedChoice=null;
    const stage=$('#trainingStage');
    const total=session.mode==='speed'?'∞':session.questions.length;
    stage.querySelector('.question-counter').textContent=`Problem ${session.index+1} / ${total}`;
    stage.querySelector('.skill-pill').textContent=Core.SKILLS[q.skill].name;
    stage.querySelector('.difficulty-pill').textContent=`Difficulty ${q.difficulty}/10`;
    stage.querySelector('.problem-context').textContent=q.context;
    stage.querySelector('.problem-prompt').textContent=q.prompt;
    stage.querySelector('.feedback-card').className='feedback-card is-hidden';
    stage.querySelector('.feedback-card').innerHTML='';
    stage.querySelector('.hint-button').textContent='Hint';
    stage.querySelector('.submit-answer').textContent='Check answer';
    const progress=session.mode==='speed'?Math.min(100,(60-session.timeLeft)/60*100):(session.index/session.questions.length*100);
    stage.querySelector('.session-progress span').style.width=`${progress}%`;
    stage.querySelector('.session-score').textContent=`${session.correct} correct`;
    stage.querySelector('.session-xp').textContent=`+${session.xp} XP`;
    const zone=stage.querySelector('.answer-zone');
    if(q.type==='choice'){
      zone.innerHTML=`<div class="choice-grid">${q.choices.map(c=>`<button class="choice-button" data-value="${escapeHtml(String(c))}">${escapeHtml(String(c))}</button>`).join('')}</div>`;
      zone.querySelectorAll('.choice-button').forEach(btn=>btn.addEventListener('click',()=>{
        zone.querySelectorAll('.choice-button').forEach(x=>x.classList.remove('is-selected'));
        btn.classList.add('is-selected'); session.selectedChoice=btn.dataset.value;
      }));
    } else {
      zone.innerHTML='<input class="answer-input" inputmode="decimal" autocomplete="off" placeholder="Type your answer" aria-label="Answer" />';
      const input=zone.querySelector('input');
      input.addEventListener('keydown',e=>{if(e.key==='Enter') submitCurrent();});
      setTimeout(()=>input.focus(),30);
    }
  }

  function showHint(){
    if(!session || session.answered) return;
    const q=session.questions[session.index];
    const feedback=$('#trainingStage .feedback-card');
    feedback.className='feedback-card';
    feedback.innerHTML=`<div class="feedback-title">Hint</div><p>${escapeHtml(q.hint)}</p>`;
  }

  function submitCurrent(){
    if(!session) return;
    if(session.answered){ session.index++; renderCurrentQuestion(); return; }
    const q=session.questions[session.index];
    const input=$('#trainingStage .answer-input');
    const raw=q.type==='choice'?session.selectedChoice:(input?input.value:'');
    if(raw===null || String(raw).trim()===''){ pulseInput(); return; }
    const correct=Core.checkAnswer(q,raw);
    const xp=Core.applyAttempt(state,q,correct,session.mode);
    session.correct+=correct?1:0;
    session.xp+=xp;
    session.answers.push({skill:q.skill,difficulty:q.difficulty,correct});
    session.answered=true;
    saveState();
    const feedback=$('#trainingStage .feedback-card');
    feedback.className=`feedback-card ${correct?'good':'bad'}`;
    feedback.innerHTML=`<div class="feedback-title">${correct?'Correct.':`Not quite. Answer: ${formatAnswer(q.answer)}`} ${correct?`+${xp} XP`:''}</div><p>${escapeHtml(q.explanation)}</p>`;
    const submit=$('#trainingStage .submit-answer');
    submit.textContent=(session.mode==='speed')?'Next':'Continue →';
    $('#trainingStage .session-score').textContent=`${session.correct} correct`;
    $('#trainingStage .session-xp').textContent=`+${session.xp} XP`;
    render();
    if(session.mode==='speed') setTimeout(()=>{ if(session && session.answered){session.index++;renderCurrentQuestion();}},320);
  }

  function pulseInput(){
    const target=$('#trainingStage .answer-input') || $('#trainingStage .answer-zone');
    if(!target)return; target.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:180});
  }

  function startTimer(){
    if(session.timer) clearInterval(session.timer);
    session.timer=setInterval(()=>{
      if(!session)return;
      session.timeLeft--;
      const el=$('#trainingStage .timer-value'); if(el) el.textContent=session.timeLeft;
      const bar=$('#trainingStage .session-progress span'); if(bar) bar.style.width=`${(60-session.timeLeft)/60*100}%`;
      if(session.timeLeft<=0){ clearInterval(session.timer); finishSession(); }
    },1000);
  }

  function finishSession(){
    if(!session)return;
    if(session.timer)clearInterval(session.timer);
    const completed=session;
    if(completed.mode==='diagnostic') Core.applyDiagnostic(state,completed.answers);
    Core.completeSession(state,{mode:completed.mode,correct:completed.correct,total:completed.answers.length,xp:completed.xp,focus:Core.weakestSkills(state,1)[0]});
    saveState(); render();
    const accuracy=completed.answers.length?Math.round(completed.correct/completed.answers.length*100):0;
    const stage=$('#trainingStage');
    stage.innerHTML=`<div class="session-summary"><div class="summary-mark">✓</div><div class="eyebrow accent">SESSION COMPLETE</div><h2>${modeNames[completed.mode]}</h2><p>${summaryCopy(completed.mode,accuracy)}</p><div class="summary-stats"><div><strong>${completed.correct}/${completed.answers.length}</strong><span>correct</span></div><div><strong>${accuracy}%</strong><span>accuracy</span></div><div><strong>+${completed.xp}</strong><span>xp</span></div></div><div class="empty-actions"><button class="primary-button" id="repeatSession">Train again</button><button class="secondary-button" id="returnHome">Command center</button></div></div>`;
    session=null;
    $('#repeatSession').addEventListener('click',()=>startSession(completed.mode));
    $('#returnHome').addEventListener('click',()=>switchView('home'));
  }

  function summaryCopy(mode,accuracy){
    if(mode==='diagnostic') return 'Your mastery map has been recalibrated from this diagnostic sample. Keep training to make it more accurate.';
    if(accuracy>=90) return 'Excellent precision. The adaptive engine will keep raising the difficulty where you are consistently strong.';
    if(accuracy>=70) return 'Solid work. This is close to the productive difficulty zone: enough success to progress, enough friction to expose weaknesses.';
    return 'Useful session: the misses give the engine clear information about what to train next.';
  }

  function closeSession(){
    if(!session || confirm('Exit this session? Attempts already answered will stay in your progress.')){
      if(session?.timer)clearInterval(session.timer); session=null;
      $('#trainingStage').innerHTML=`<div class="training-empty"><div class="training-logo">∑</div><h2>Choose a training protocol</h2><p>Daily Mission is the best default. Diagnostic recalibrates your skill map.</p><div class="empty-actions"><button class="primary-button" data-start-mode="daily">Daily mission</button><button class="secondary-button" data-start-mode="diagnostic">Diagnostic</button></div></div>`;
      bindDynamicButtons();
    }
  }

  function bindDynamicButtons(){
    $$('[data-start-mode]').forEach(btn=>{btn.onclick=()=>startSession(btn.dataset.startMode);});
  }

  function escapeHtml(str){ return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function formatAnswer(n){ return Number.isInteger(Number(n))?String(n):String(Number(n).toFixed(2)).replace(/\.00$/,''); }

  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  $$('[data-go-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.goView)));
  bindDynamicButtons();
  $('#resetButton').addEventListener('click',()=>{
    if(confirm('Reset all local NUMEN progress?')){ localStorage.removeItem(STORAGE_KEY); state=Core.normalizedState(); render(); switchView('home'); }
  });

  render();
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();

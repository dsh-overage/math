(() => {
  'use strict';
  const Core = window.MathCore;
  const Lessons = window.MathLessons;
  const STORAGE_KEY = 'numen-math-state-v1';
  let state = loadState();
  let session = null;
  let learning = null;

  const viewMeta = {
    home: ['PERSONAL MATH OS', 'Command center'],
    map: ['MASTERY GRAPH', 'Skill map'],
    train: ['GUIDED LEARNING', 'Learn'],
    analytics: ['PERFORMANCE DATA', 'Analytics']
  };
  const modeNames = {
    learn:'Guided lesson',
    daily:'Daily mission',
    diagnostic:'Diagnostic',
    speed:'Speed protocol',
    weakness:'Weakness attack',
    boss:'Boss fight'
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function loadState(){
    try { return Core.normalizedState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch { return Core.normalizedState(); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function switchView(name){
    $$('.view').forEach(v=>v.classList.remove('is-active'));
    const target=$(`#view-${name}`);
    if(target) target.classList.add('is-active');
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
    const next=Lessons.nextLesson(state);

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
    $('#heroFocus').textContent=Core.SKILLS[next.skill].name.split(' ')[0];
    $('#heroText').textContent=`Следующий урок: «${next.title}». Сначала разберём принцип и пример, затем решим одну задачу вместе и только после этого перейдём к самостоятельной практике.`;
    $('#analyticsStrongest').textContent=Core.SKILLS[strong[0]].name;

    renderLessonPath();
    renderSkillCards();
    renderSkillMap();
    renderAnalytics();
    bindDynamicButtons();
  }

  function renderLessonPath(){
    const done=new Set(state.lessonsCompleted||[]);
    const next=Lessons.nextLesson(state);
    $('#lessonPath').innerHTML=Lessons.CURRICULUM.map((lesson,i)=>{
      const status=done.has(lesson.id)?'done':lesson.id===next.id?'current':'';
      return `<button class="lesson-card ${status}" data-lesson-id="${lesson.id}">
        <span class="lesson-number">${String(i+1).padStart(2,'0')}</span>
        <span class="lesson-skill">${Core.SKILLS[lesson.skill].name}</span>
        <strong>${escapeHtml(lesson.title)}</strong>
        <small>${escapeHtml(lesson.subtitle)}</small>
        <span class="lesson-status">${status==='done'?'✓ Пройдено':status==='current'?'Продолжить →':'Открыть'}</span>
      </button>`;
    }).join('');
    $$('.lesson-card').forEach(btn=>btn.addEventListener('click',()=>startLearning(btn.dataset.lessonId)));
  }

  function renderSkillCards(){
    $('#skillGrid').innerHTML=Object.entries(Core.SKILLS).map(([key,skill])=>{
      const score=Math.round(state.skills[key]);
      const completed=Lessons.lessonsForSkill(key).filter(l=>(state.lessonsCompleted||[]).includes(l.id)).length;
      const total=Lessons.lessonsForSkill(key).length;
      return `<article class="skill-card clickable-skill" data-skill="${key}" style="--skill-glow:${hexToGlow(skill.color)}">
        <div class="skill-top"><div><div class="eyebrow">${skill.short}</div><div class="skill-name">${skill.name}</div></div><div class="skill-score">${score}</div></div>
        <div class="skill-description">${skill.description}</div>
        <div class="skill-lesson-count">${completed}/${total} lessons</div>
        <div class="skill-bar"><span style="width:${score}%"></span></div>
      </article>`;
    }).join('');
    $$('.clickable-skill').forEach(card=>card.addEventListener('click',()=>startLearningForSkill(card.dataset.skill)));
  }

  function renderSkillMap(){
    const layout=[
      ['mental',0,0], ['percent',1,0], ['finance',2,0], ['statistics',3,0],
      ['logic',0,1], ['algebra',1,1], ['probability',2,1], ['data',3,1]
    ];
    $('#skillMap').innerHTML=`<div class="map-grid">${layout.map(([key,col])=>{
      const skill=Core.SKILLS[key], score=Math.round(state.skills[key]);
      const cls=score<42?'low':score>72?'high':'';
      return `<button class="map-node ${cls}" data-col="${col}" data-skill="${key}"><div class="node-ring">${symbolFor(key)}</div><div class="map-node-score">${score}</div><strong>${skill.name}</strong><small>${skill.short}</small></button>`;
    }).join('')}</div>`;
    $$('#skillMap .map-node').forEach(node=>node.addEventListener('click',()=>startLearningForSkill(node.dataset.skill)));
  }

  function renderAnalytics(){
    $('#analyticsXp').textContent=state.xp;
    $('#analyticsAccuracy').textContent=state.solved?`${Math.round(state.correct/state.solved*100)}%`:'—';
    $('#analyticsSessions').textContent=state.sessions;
    const strongest=Core.strongestSkill(state);
    $('#analyticsStrongest').textContent=Core.SKILLS[strongest].name;
    $('#historyList').innerHTML=state.history.length ? state.history.map(h=>{
      const d=new Date(h.date);
      const total=Number(h.total)||0, correct=Number(h.correct)||0;
      const pct=total?Math.round(correct/total*100):'—';
      const detail=h.lesson ? escapeHtml(h.lesson) : `${correct}/${total}`;
      return `<div class="history-row"><div><strong>${modeNames[h.mode]||h.mode}</strong><br><small>${d.toLocaleDateString()} · ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><span>${detail}</span><span>${pct==='—'?'—':pct+'%'}</span><span>+${h.xp||0} XP</span></div>`;
    }).join('') : '<div class="history-empty">No completed sessions yet. Your first one will appear here.</div>';
  }

  function startLearningForSkill(skill){
    const lessons=Lessons.lessonsForSkill(skill);
    const lesson=lessons.find(l=>!(state.lessonsCompleted||[]).includes(l.id)) || lessons[0];
    startLearning(lesson.id);
  }

  function startLearning(lessonId){
    if(session && !confirm('Exit the current practice session and start the lesson?')) return;
    const lesson=lessonId ? Lessons.byId[lessonId] : Lessons.nextLesson(state);
    if(!lesson) return;
    if(session?.timer) clearInterval(session.timer);
    session=null;
    learning={
      lesson,
      stage:'concept',
      guidedAttempts:0,
      guidedSolved:false,
      practiceIndex:0,
      practiceCorrect:0,
      practiceXp:0,
      practiceQuestions:[
        Core.generateQuestion(lesson.skill, Math.max(1, lesson.practiceDifficulty-1)),
        Core.generateQuestion(lesson.skill, lesson.practiceDifficulty)
      ],
      practiceAnswered:false
    };
    switchView('train');
    renderLearning();
  }

  function renderLearning(){
    if(!learning) return;
    const l=learning.lesson;
    const stage=$('#trainingStage');
    const stageIndex={concept:0,example:1,guided:2,practice:3,complete:4}[learning.stage]||0;
    const labels=['Понять','Разбор','Вместе','Самостоятельно'];
    stage.innerHTML=`<div class="learn-shell">
      <div class="learn-top">
        <div>
          <div class="eyebrow accent">${Core.SKILLS[l.skill].name} · УРОК ${l.order}</div>
          <h2>${escapeHtml(l.title)}</h2>
          <p class="learn-subtitle">${escapeHtml(l.subtitle)}</p>
        </div>
        <button class="icon-button learn-close" aria-label="Exit lesson">×</button>
      </div>
      <div class="learn-rail">
        ${labels.map((x,i)=>`<div class="learn-step ${i<stageIndex?'done':i===stageIndex?'active':''}"><span>${i<stageIndex?'✓':i+1}</span><small>${x}</small></div>`).join('')}
      </div>
      <div class="learn-content" id="learnContent"></div>
    </div>`;
    stage.querySelector('.learn-close').addEventListener('click',closeLearning);
    if(learning.stage==='concept') renderConcept();
    if(learning.stage==='example') renderExample();
    if(learning.stage==='guided') renderGuided();
    if(learning.stage==='practice') renderLessonPractice();
  }

  function renderConcept(){
    const l=learning.lesson;
    $('#learnContent').innerHTML=`<div class="lesson-phase">
      <div class="phase-label">01 · ПОНЯТЬ ИДЕЮ</div>
      <div class="concept-grid">
        <div class="concept-main">
          <h3>Главная мысль</h3>
          <p class="concept-lead">${escapeHtml(l.concept)}</p>
        </div>
        <aside class="rule-card">
          <span>ПРАВИЛО</span>
          <strong>${escapeHtml(l.rule)}</strong>
        </aside>
      </div>
      <div class="why-card"><span>ЗАЧЕМ ЭТО НУЖНО</span><p>${escapeHtml(l.why)}</p></div>
      <div class="learn-actions"><span></span><button class="primary-button" id="lessonNext">Покажи на примере →</button></div>
    </div>`;
    $('#lessonNext').addEventListener('click',()=>{learning.stage='example';renderLearning();});
  }

  function renderExample(){
    const l=learning.lesson;
    $('#learnContent').innerHTML=`<div class="lesson-phase">
      <div class="phase-label">02 · РАЗОБРАННЫЙ ПРИМЕР</div>
      <div class="worked-problem">${escapeHtml(l.example.prompt)}</div>
      <div class="worked-steps">
        ${l.example.steps.map(([n,calc,why])=>`<div class="worked-step"><span class="step-no">${n}</span><div><strong>${escapeHtml(calc)}</strong><p>${escapeHtml(why)}</p></div></div>`).join('')}
      </div>
      <div class="worked-result"><span>РЕЗУЛЬТАТ</span><strong>${escapeHtml(l.example.result)}</strong></div>
      <div class="learn-actions"><button class="text-button" id="lessonBack">← Назад</button><button class="primary-button" id="lessonNext">Теперь решим вместе →</button></div>
    </div>`;
    $('#lessonBack').addEventListener('click',()=>{learning.stage='concept';renderLearning();});
    $('#lessonNext').addEventListener('click',()=>{learning.stage='guided';renderLearning();});
  }

  function renderGuided(){
    const l=learning.lesson;
    $('#learnContent').innerHTML=`<div class="lesson-phase guided-phase">
      <div class="phase-label">03 · РЕШАЕМ ВМЕСТЕ</div>
      <div class="coach-note"><span>NUMEN</span><p>Теперь тот же принцип, но числа другие. Не нужно угадывать: повтори только что увиденный метод.</p></div>
      <div class="guided-prompt">${escapeHtml(l.guided.prompt)}</div>
      <input class="answer-input guided-input" inputmode="decimal" autocomplete="off" placeholder="Твой ответ" />
      <div class="guided-feedback is-hidden"></div>
      <div class="learn-actions"><button class="text-button" id="guidedHint">Мне нужен шаг</button><button class="primary-button" id="guidedCheck">Проверить шаг</button></div>
    </div>`;
    const input=$('.guided-input');
    input.addEventListener('keydown',e=>{if(e.key==='Enter') checkGuided();});
    $('#guidedHint').addEventListener('click',()=>{
      const fb=$('.guided-feedback'); fb.className='guided-feedback'; fb.innerHTML=`<strong>Следующий шаг</strong><p>${escapeHtml(l.guided.hint)}</p>`;
    });
    $('#guidedCheck').addEventListener('click',checkGuided);
    setTimeout(()=>input.focus(),30);
  }

  function checkGuided(){
    const l=learning.lesson;
    const input=$('.guided-input');
    const raw=input.value;
    if(!raw.trim()) return pulse(input);
    const fake={answer:l.guided.answer,tolerance:Math.max(.01,Math.abs(l.guided.answer)*.002),type:'number'};
    const ok=Core.checkAnswer(fake,raw);
    learning.guidedAttempts++;
    const fb=$('.guided-feedback');
    if(ok){
      learning.guidedSolved=true;
      fb.className='guided-feedback good';
      fb.innerHTML=`<strong>Да. Именно так.</strong><p>${escapeHtml(l.guided.explanation)}</p>`;
      $('#guidedCheck').textContent='К самостоятельной практике →';
      $('#guidedCheck').onclick=()=>{learning.stage='practice';renderLearning();};
      input.disabled=true;
    } else {
      fb.className='guided-feedback bad';
      const explanation=learning.guidedAttempts>=2 ? l.guided.explanation : l.guided.hint;
      fb.innerHTML=`<strong>${learning.guidedAttempts>=2?'Разберём полностью':'Почти. Не перескакивай шаг.'}</strong><p>${escapeHtml(explanation)}</p>`;
      if(learning.guidedAttempts>=2){
        const reveal=document.createElement('button');
        reveal.className='secondary-button reveal-answer';
        reveal.textContent='Показать ответ и продолжить';
        reveal.addEventListener('click',()=>{
          fb.innerHTML=`<strong>Ответ: ${formatAnswer(l.guided.answer)}</strong><p>${escapeHtml(l.guided.explanation)}</p>`;
          $('#guidedCheck').textContent='К самостоятельной практике →';
          $('#guidedCheck').onclick=()=>{learning.stage='practice';renderLearning();};
        });
        fb.appendChild(reveal);
      }
    }
  }

  function renderLessonPractice(){
    const q=learning.practiceQuestions[learning.practiceIndex];
    if(!q) return completeLearning();
    learning.practiceAnswered=false;
    $('#learnContent').innerHTML=`<div class="lesson-phase">
      <div class="phase-label">04 · ТЕПЕРЬ САМ · ${learning.practiceIndex+1}/${learning.practiceQuestions.length}</div>
      <div class="coach-note compact"><span>NUMEN</span><p>Здесь подсказка уже спрятана. Если застрянешь — открой её, но сначала попробуй применить метод сам.</p></div>
      <div class="practice-skill">${escapeHtml(Core.SKILLS[q.skill].short)}</div>
      <div class="practice-prompt">${escapeHtml(q.prompt)}</div>
      <input class="answer-input lesson-practice-input" inputmode="decimal" autocomplete="off" placeholder="Твой ответ" />
      <div class="guided-feedback practice-feedback is-hidden"></div>
      <div class="learn-actions"><button class="text-button" id="practiceHint">Подсказка</button><button class="primary-button" id="practiceCheck">Проверить</button></div>
    </div>`;
    const input=$('.lesson-practice-input');
    input.addEventListener('keydown',e=>{if(e.key==='Enter') checkLessonPractice();});
    $('#practiceHint').addEventListener('click',()=>{
      const fb=$('.practice-feedback'); fb.className='guided-feedback'; fb.innerHTML=`<strong>Подсказка</strong><p>${escapeHtml(q.hint)}</p>`;
    });
    $('#practiceCheck').addEventListener('click',checkLessonPractice);
    setTimeout(()=>input.focus(),30);
  }

  function checkLessonPractice(){
    if(learning.practiceAnswered){
      learning.practiceIndex++;
      renderLessonPractice();
      return;
    }
    const q=learning.practiceQuestions[learning.practiceIndex];
    const input=$('.lesson-practice-input');
    const raw=input.value;
    if(!raw.trim()) return pulse(input);
    const ok=Core.checkAnswer(q,raw);
    const xp=Core.applyAttempt(state,q,ok,'daily');
    learning.practiceCorrect+=ok?1:0;
    learning.practiceXp+=xp;
    learning.practiceAnswered=true;
    saveState();
    const fb=$('.practice-feedback');
    fb.className=`guided-feedback ${ok?'good':'bad'}`;
    fb.innerHTML=`<strong>${ok?'Верно. Метод уже начинает закрепляться.':`Ответ: ${formatAnswer(q.answer)}`}</strong><p>${escapeHtml(q.explanation)}</p>`;
    const btn=$('#practiceCheck');
    btn.textContent=learning.practiceIndex+1<learning.practiceQuestions.length?'Следующая задача →':'Завершить урок →';
    btn.onclick=()=>{
      learning.practiceIndex++;
      renderLessonPractice();
    };
    input.disabled=true;
    render();
  }

  function completeLearning(){
    const doneLearning=learning;
    const l=doneLearning.lesson;
    const firstTime=!(state.lessonsCompleted||[]).includes(l.id);
    Core.completeLesson(state,l.id,l.skill);
    state.sessions+=1;
    state.history.unshift({
      date:new Date().toISOString(),
      mode:'learn',
      correct:doneLearning.practiceCorrect,
      total:doneLearning.practiceQuestions.length,
      xp:doneLearning.practiceXp+(firstTime?25:0),
      focus:l.skill,
      lesson:l.title
    });
    state.history=state.history.slice(0,30);
    saveState();
    const bonus=firstTime?25:0;
    const totalXp=doneLearning.practiceXp+bonus;
    learning=null;
    render();
    const next=Lessons.nextLesson(state);
    $('#trainingStage').innerHTML=`<div class="session-summary lesson-complete">
      <div class="summary-mark">✓</div>
      <div class="eyebrow accent">УРОК ЗАВЕРШЁН</div>
      <h2>${escapeHtml(l.title)}</h2>
      <p>Ты не просто решил примеры: сначала разобрал принцип, увидел метод и применил его самостоятельно.</p>
      <div class="summary-stats">
        <div><strong>${doneLearning.practiceCorrect}/${doneLearning.practiceQuestions.length}</strong><span>самостоятельно</span></div>
        <div><strong>+${totalXp}</strong><span>xp</span></div>
        <div><strong>${Math.round(state.skills[l.skill])}</strong><span>${escapeHtml(Core.SKILLS[l.skill].name)}</span></div>
      </div>
      <div class="next-lesson-preview"><span>ДАЛЬШЕ</span><strong>${escapeHtml(next.title)}</strong><small>${escapeHtml(next.subtitle)}</small></div>
      <div class="empty-actions"><button class="primary-button" id="nextLesson">Следующий урок →</button><button class="secondary-button" id="returnHome">На главную</button></div>
    </div>`;
    $('#nextLesson').addEventListener('click',()=>startLearning(next.id));
    $('#returnHome').addEventListener('click',()=>switchView('home'));
  }

  function closeLearning(){
    if(confirm('Выйти из урока? Прогресс завершённых уроков сохранится.')){
      learning=null;
      showLearningEmpty();
    }
  }

  function showLearningEmpty(){
    $('#trainingStage').innerHTML=`<div class="training-empty"><div class="training-logo">∑</div><h2>Learn, then practice</h2><p>NUMEN сначала объясняет метод, затем решает пример вместе с тобой и только после этого проверяет самостоятельное применение.</p><div class="empty-actions"><button class="primary-button" data-start-learning>Продолжить обучение</button><button class="secondary-button" data-start-mode="daily">Практика</button></div></div>`;
    bindDynamicButtons();
  }

  function startSession(mode){
    if(mode !== 'diagnostic' && (state.lessonsCompleted || []).length === 0){
      startLearning();
      return;
    }
    if(learning && !confirm('Exit the current lesson and start practice?')) return;
    if(session && !confirm('Exit the current session and start a new one?')) return;
    learning=null;
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
    stage.querySelector('.session-title').textContent=session.mode==='diagnostic'?'Calibrate your map':'Practice what you already understand';
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
    zone.innerHTML='<input class="answer-input" inputmode="decimal" autocomplete="off" placeholder="Type your answer" aria-label="Answer" />';
    const input=zone.querySelector('input');
    input.addEventListener('keydown',e=>{if(e.key==='Enter') submitCurrent();});
    setTimeout(()=>input.focus(),30);
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
    const raw=input?input.value:'';
    if(!String(raw).trim()){ pulse(input); return; }
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
    if(mode==='diagnostic') return 'Your mastery map has been recalibrated. Guided lessons will use this map to prioritize weaker areas.';
    if(accuracy>=90) return 'Excellent precision. Practice is now doing its job: making an already understood method automatic.';
    if(accuracy>=70) return 'Solid work. Review the explanations on misses, then continue the learning path.';
    return 'This topic probably needs a lesson, not more blind repetition. Return to Learn and build the method first.';
  }

  function closeSession(){
    if(!session || confirm('Exit this session? Attempts already answered will stay in your progress.')){
      if(session?.timer)clearInterval(session.timer);
      session=null;
      showLearningEmpty();
    }
  }

  function bindDynamicButtons(){
    $$('[data-start-mode]').forEach(btn=>{btn.onclick=()=>startSession(btn.dataset.startMode);});
    $$('[data-start-learning]').forEach(btn=>{btn.onclick=()=>startLearning();});
  }

  function pulse(target){
    if(!target)return;
    target.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:180});
  }
  function symbolFor(key){ return ({mental:'±',percent:'%',finance:'€',logic:'◇',algebra:'x',probability:'P',statistics:'μ',data:'↯'})[key]; }
  function hexToGlow(hex){ return hex + '25'; }
  function escapeHtml(str){ return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function formatAnswer(n){ return Number.isInteger(Number(n))?String(n):String(Number(n).toFixed(2)).replace(/\.00$/,''); }

  $$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  $$('[data-go-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.goView)));
  bindDynamicButtons();

  $('#resetButton').addEventListener('click',()=>{
    if(confirm('Reset all local NUMEN progress?')){
      localStorage.removeItem(STORAGE_KEY);
      state=Core.normalizedState();
      learning=null; session=null;
      render(); switchView('home');
    }
  });

  render();
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();

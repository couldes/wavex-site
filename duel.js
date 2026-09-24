(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const CARDS = {
    jab: { name: '探手', cost: 0, type: 'attack', damage: 3, text: '造成 3 点伤害' },
    strike: { name: '斩击', cost: 1, type: 'attack', damage: 5, text: '造成 5 点伤害' },
    heavy: { name: '重斩', cost: 2, type: 'attack', damage: 10, text: '造成 10 点伤害' },
    guard: { name: '架势', cost: 1, type: 'guard', armor: 6, text: '获得 6 点护甲' },
    focus: { name: '读招', cost: 1, type: 'focus', bonus: 4, text: '下一次攻击伤害 +4' },
  };
  const STARTER_DECK = ['jab', 'jab', 'strike', 'strike', 'strike', 'strike', 'heavy', 'heavy', 'guard', 'guard', 'focus', 'focus'];
  const LANE_NAMES = ['左翼', '中线', '右翼'];
  const PLAYER_MAX_HP = 32;
  const BOSS_MAX_HP = 80;
  const MAX_AP = 3;
  const CHARGE_DAMAGE = 14;
  const INTERRUPT_DAMAGE = 14;

  let playerHp;
  let bossHp;
  let armor;
  let actionPoints;
  let turn;
  let playerLane;
  let intent;
  let bossExposed;
  let attackBonus;
  let roundDamageThisTurn;
  let deck;
  let discard;
  let hand;
  let ended;

  const playerHpLabel = $('#player-hp');
  const playerHealth = $('#player-health');
  const playerState = $('#player-state');
  const apLabel = $('#ap-value');
  const apPips = $('#ap-pips');
  const openingState = $('#opening-state');
  const bossHpLabel = $('#boss-hp');
  const bossHealth = $('#boss-health');
  const bossState = $('#boss-state');
  const roundLabel = $('#round-label');
  const intentCard = $('#intent-card');
  const intentTitle = $('#intent-title');
  const intentLanes = $('#intent-lanes');
  const intentDetail = $('#intent-detail');
  const handNode = $('#hand');
  const feedback = $('#feedback');
  const endTurnButton = $('#end-turn');
  const explainer = $('#intent-explainer');
  const terminal = document.createElement('div');
  terminal.className = 'terminal-banner';
  terminal.hidden = true;
  $('.arena').append(terminal);

  function shuffle(cards) {
    const result = [...cards];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function drawCards(count) {
    while (hand.length < count) {
      if (deck.length === 0) {
        if (discard.length === 0) break;
        deck = shuffle(discard);
        discard = [];
      }
      hand.push(deck.pop());
    }
  }

  function beginRound() {
    actionPoints = MAX_AP;
    armor = 0;
    drawCards(4);
    roundDamageThisTurn = 0;
    const lockedLane = playerLane;
    const beat = (turn - 1) % 3;
    if (beat === 0) intent = { type: 'strike', lanes: [lockedLane], damage: 8, title: '落锤 · 单线重击', detail: '8 伤害 · 红线是锁定位置。换到其他战线即可躲开。' };
    else if (beat === 1) {
      const sweep = lockedLane === 2 ? [1, 2] : [0, 1];
      intent = { type: 'sweep', lanes: sweep, damage: 10, title: '横扫 · 两线覆盖', detail: '10 伤害 · 两条红线会被扫中，换到最后一条安全线。' };
    } else intent = { type: 'charge', lanes: [0, 1, 2], damage: CHARGE_DAMAGE, title: '炉心过载 · 全线爆发', detail: '14 伤害 · 本回合对 Boss 累计造成至少 14 伤害即可打断。' };
    render();
    feedback.textContent = turn === 1
      ? '预警已亮起。先安排攻击与防御，再决定要不要花 1 AP 换线。'
      : '新一轮开始：预警锁定你当前所在战线。选择进攻、换线或留 AP 防守。';
  }

  function setLane(nextLane) {
    if (ended || nextLane === playerLane) return;
    if (actionPoints < 1) {
      feedback.textContent = '换线需要 1 AP；先留出行动点，或在当前战线迎接攻击。';
      return;
    }
    const oldLane = playerLane;
    actionPoints -= 1;
    playerLane = nextLane;
    render();
    feedback.textContent = `你从${LANE_NAMES[oldLane]}转移到${LANE_NAMES[nextLane]}（1 AP）。结算预警前仍可继续出牌。`;
  }

  function applyDamage(amount) {
    const exposedBonus = bossExposed ? 4 : 0;
    const dealt = amount + attackBonus + exposedBonus;
    const before = bossHp;
    bossHp = Math.max(0, bossHp - dealt);
    roundDamageThisTurn += before - bossHp;
    attackBonus = 0;
    bossExposed = false;
    if (bossHp <= 0) endGame(true);
    return dealt;
  }

  function playCard(index) {
    if (ended) return;
    const id = hand[index];
    if (!id) return;
    const card = CARDS[id];
    if (actionPoints < card.cost) {
      feedback.textContent = `${card.name}需要 ${card.cost} AP；你现在只有 ${actionPoints} AP。`;
      return;
    }
    actionPoints -= card.cost;
    hand.splice(index, 1);
    discard.push(id);
    if (card.type === 'attack') {
      const amount = applyDamage(card.damage);
      if (ended) return;
      feedback.textContent = `${card.name}造成 ${amount} 伤害（基础 ${card.damage} + 读招/破绽加成）。`;
    } else if (card.type === 'guard') {
      armor += card.armor;
      feedback.textContent = `${card.name}：获得 ${card.armor} 护甲；本回合可叠加减伤。`;
    } else {
      attackBonus += card.bonus;
      feedback.textContent = `${card.name}：下一次攻击 +${attackBonus} 伤害（持续到打出攻击牌）。`;
    }
    render();
  }

  function resolveTurn() {
    if (ended) return;
    const threatened = intent.lanes.includes(playerLane);
    let bossInterrupted = false;
    if (intent.type === 'charge') {
      const damageThisRound = roundDamageThisTurn;
      if (damageThisRound >= INTERRUPT_DAMAGE) {
        bossInterrupted = true;
        bossExposed = true;
        feedback.textContent = `过载打断！你本回合对统领造成 ${damageThisRound} 点伤害，爆发被阻止；炉心暴露。`;
      } else {
        const loss = Math.max(0, CHARGE_DAMAGE - armor);
        playerHp = Math.max(0, playerHp - loss);
        armor = 0;
        feedback.textContent = `过载没有打断：受到 ${loss} 伤害${damageThisRound < INTERRUPT_DAMAGE ? `；打断还差 ${INTERRUPT_DAMAGE - damageThisRound}` : ''}。`;
      }
    } else if (threatened) {
      const loss = Math.max(0, intent.damage - armor);
      playerHp = Math.max(0, playerHp - loss);
      armor = 0;
      feedback.textContent = `${intent.title}命中你所在的${LANE_NAMES[playerLane]}：受到 ${loss} 伤害${loss < intent.damage ? `（护甲抵消 ${intent.damage - loss}）` : ''}。`;
    } else {
      bossExposed = true;
      feedback.textContent = `成功避开${intent.title}！统领露出破绽：你下次攻击 +4 伤害。`;
    }
    if (bossHp <= 0) return;
    if (playerHp <= 0) {
      endGame(false);
      return;
    }
    hand.forEach(id => discard.push(id));
    hand = [];
    turn += 1;
    beginRound();
    if (bossInterrupted) feedback.textContent = '统领的过载被打断，炉心暴露！新回合开始。';
  }

  function endTurn() {
    if (ended) return;
    resolveTurn();
  }

  function endGame(won) {
    ended = true;
    endTurnButton.disabled = true;
    terminal.hidden = false;
    terminal.classList.toggle('victory', won);
    terminal.innerHTML = won
      ? '<strong>炉心熄灭</strong><span>你读懂了它的节奏，并赢下这场决斗。</span>'
      : '<strong>远征者倒下</strong><span>看清预警、换线和蓄力打断之间的取舍，再试一次。</span>';
    feedback.textContent = won ? '胜利。单场战斗结束；重新挑战可从头再来。' : '失败。没有永久损失，立即重新挑战。';
    render();
  }

  function renderIntent() {
    intentCard.classList.toggle('charge-intent', intent.type === 'charge');
    intentTitle.textContent = intent.title;
    intentDetail.textContent = intent.detail;
    intentLanes.replaceChildren();
    intent.lanes.forEach(lane => {
      const marker = document.createElement('span');
      marker.className = 'intent-lane';
      marker.textContent = LANE_NAMES[lane];
      intentLanes.append(marker);
    });
    explainer.textContent = intent.type === 'charge'
      ? `全线都会被击中。换线无效：本回合累计造成 ${INTERRUPT_DAMAGE} 伤害打断，或用护甲承受剩余爆发。`
      : `红色战线会受到攻击。花 1 AP 换到安全线可完全闪避，并让下一击获得 +4；也可以留在原位进攻或用护甲减伤。`;
  }

  function renderLanes() {
    document.querySelectorAll('.lane').forEach((button, index) => {
      const selected = playerLane === index;
      const danger = intent.lanes.includes(index);
      button.classList.toggle('selected', selected);
      button.classList.toggle('threatened', danger);
      button.setAttribute('aria-pressed', String(selected));
      button.querySelector('.lane-warning').textContent = danger ? '命中' : '安全';
      button.querySelector('.lane-occupant').textContent = selected ? '你在此' : '空位';
      button.disabled = ended || selected || actionPoints < 1 || intent.type === 'charge';
    });
  }

  function renderHand() {
    handNode.replaceChildren();
    hand.forEach((id, index) => {
      const card = CARDS[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `action-card ${card.type}`;
      button.dataset.cost = String(card.cost);
      button.disabled = ended || actionPoints < card.cost;
      button.setAttribute('aria-label', `${card.name}，费用 ${card.cost} AP，${card.text}`);
      button.innerHTML = `<span class="card-cost"><b>${card.cost === 0 ? 'FREE' : `${card.cost} AP`}</b><kbd>${index + 1}</kbd></span><span class="card-glyph" aria-hidden="true">${({jab:'✦',strike:'⚔',heavy:'⬟',guard:'⛨',focus:'◎'})[id]}</span><strong>${card.name}</strong><span class="card-text">${card.text}</span>`;
      button.addEventListener('click', () => playCard(index));
      handNode.append(button);
    });
  }

  function render() {
    playerHpLabel.textContent = `${playerHp} / ${PLAYER_MAX_HP}`;
    playerHealth.style.width = `${Math.max(0, playerHp / PLAYER_MAX_HP) * 100}%`;
    playerState.textContent = `状态：${armor ? `护甲 ${armor}` : '稳定'} · 行动点 ${actionPoints}`;
    apLabel.textContent = String(actionPoints);
    apPips.replaceChildren(...Array.from({ length: MAX_AP }, (_, index) => {
      const pip = document.createElement('i');
      pip.className = index < actionPoints ? 'available' : '';
      return pip;
    }));
    openingState.textContent = attackBonus ? `读招：下次攻击 +${attackBonus}` : bossExposed ? '炉心暴露：下次攻击 +4' : '尚无反击窗口';
    openingState.classList.toggle('is-open', bossExposed || attackBonus > 0);
    bossHpLabel.textContent = `${bossHp} / ${BOSS_MAX_HP}`;
    bossHealth.style.width = `${Math.max(0, bossHp / BOSS_MAX_HP) * 100}%`;
    bossState.textContent = bossExposed ? '炉心外壳错位，下一击将造成额外伤害。' : intent.type === 'charge' ? '炉心正在过载。读条完成前必须打断！' : '甲壳稳定。正在准备下一次攻势。';
    roundLabel.textContent = `第 ${turn} 回合`;
    renderIntent();
    renderLanes();
    renderHand();
    endTurnButton.disabled = ended;
    endTurnButton.innerHTML = intent.type === 'charge' ? '结算过载 <span>↗</span>' : '结束回合 <span>↗</span>';
  }

  function restart() {
    playerHp = PLAYER_MAX_HP;
    bossHp = BOSS_MAX_HP;
    armor = 0;
    actionPoints = MAX_AP;
    turn = 1;
    playerLane = 1;
    bossExposed = false;
    attackBonus = 0;
    deck = shuffle(STARTER_DECK);
    discard = [];
    hand = [];
    ended = false;
    roundDamageThisTurn = 0;
    terminal.hidden = true;
    beginRound();
    render();
  }

  document.querySelectorAll('.lane').forEach(button => button.addEventListener('click', () => setLane(Number(button.dataset.lane))));
  endTurnButton.addEventListener('click', endTurn);
  $('#restart').addEventListener('click', restart);
  window.addEventListener('keydown', event => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || ended) return;
    const match = /^Digit([1-4])$/.exec(event.code);
    if (match) {
      const button = handNode.querySelectorAll('.action-card')[Number(match[1]) - 1];
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    }
  });

  restart();
})();

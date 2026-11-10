const grid = document.querySelector('.grid');
const timer = document.querySelector('#timer');
const moves = document.querySelector('#moves');
const victory = document.querySelector('#victory');
const levels = { facil: { pares: 6, nome: 'Fácil' }, medio: { pares: 10, nome: 'Médio' }, dificil: { pares: 15, nome: 'Difícil' } };
let level = 'facil';
let player = 'Jogador';
try {
  const saved = localStorage.getItem('nivel');
  if (Object.hasOwn(levels, saved)) level = saved;
  player = localStorage.getItem('nome')?.trim().slice(0, 20) || player;
} catch { /* A partida continua quando o armazenamento está indisponível. */ }
const deck = ['copas', 'espadas', 'ouros', 'paus'].flatMap(suit =>
  ['As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map(rank => ({
    id: suit + rank,
    label: `${({ As: 'Ás', J: 'Valete', Q: 'Dama', K: 'Rei' })[rank] || rank} de ${suit}`,
  })));

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function readRecord() {
  try {
    const record = JSON.parse(localStorage.getItem(`recorde-${level}`));
    if (record && Number.isFinite(record.tempo) && record.tempo >= 0 &&
        Number.isInteger(record.jogadas) && record.jogadas >= levels[level].pares) return record;
  } catch { /* Um recorde inválido não impede uma nova partida. */ }
  return null;
}
let firstCard = null;
let locked = false;
let finished = false;
let matched = 0;
let attempts = 0;
let startedAt = null;
let clock;
let pending;
let round = 0;
function updateTimer() {
  timer.textContent = formatTime(startedAt === null ? 0 : performance.now() - startedAt);
}
async function showVictory(lastCard, currentRound) {
  // Aguarda a virada e o brilho reais, inclusive com movimento reduzido.
  await Promise.allSettled(lastCard.getAnimations({ subtree: true }).map(animation => animation.finished));
  if (currentRound !== round || !finished) return;
  victory.showModal();
}
function finishGame(lastCard) {
  finished = true;
  clearInterval(clock);
  const elapsed = Math.floor(performance.now() - startedAt);
  timer.textContent = formatTime(elapsed);
  const previous = readRecord();
  const best = !previous || elapsed < previous.tempo || (elapsed === previous.tempo && attempts < previous.jogadas);
  const record = best ? { tempo: elapsed, jogadas: attempts } : previous;
  let saved = true;
  if (best) {
    try { localStorage.setItem(`recorde-${level}`, JSON.stringify(record)); }
    catch { saved = false; }
  }
  document.querySelector('#victory-name').textContent = `Parabéns, ${player}!`;
  document.querySelector('#victory-result').textContent = `${levels[level].nome} · ${formatTime(elapsed)} · ${attempts} jogadas`;
  document.querySelector('#victory-record').textContent = `${best ? 'Novo recorde! ' : 'Recorde: '}${formatTime(record.tempo)} · ${record.jogadas} jogadas${saved ? '' : ' (não foi possível salvar)'}`;
  showVictory(lastCard, round);
}
function revealCard({ currentTarget: card }) {
  if (locked || finished || card.disabled || card === firstCard) return;
  if (startedAt === null) {
    startedAt = performance.now();
    clock = setInterval(updateTimer, 250);
  }
  card.classList.add('reveal-card');
  card.setAttribute('aria-label', card.dataset.label);
  if (!firstCard) { firstCard = card; return; }
  attempts++;
  moves.textContent = String(attempts);
  const first = firstCard;
  firstCard = null;
  if (first.dataset.character === card.dataset.character) {
    for (const match of [first, card]) {
      match.disabled = true;
      match.classList.add('matched');
      match.setAttribute('aria-label', `${match.dataset.label}, par encontrado`);
    }
    matched++;
    document.querySelector('#status').textContent = `Par encontrado. ${matched} de ${levels[level].pares} pares.`;
    if (matched === levels[level].pares) finishGame(card);
    return;
  }
  locked = true;
  first.classList.add('wrong'); card.classList.add('wrong');
  document.querySelector('#status').textContent = 'Não foi um par. Tente novamente.';
  pending = setTimeout(() => {
    for (const wrong of [first, card]) {
      wrong.classList.remove('reveal-card', 'wrong');
      wrong.setAttribute('aria-label', 'Carta virada para baixo');
    }
    // Mantém o bloqueio até terminar a volta das cartas.
    pending = setTimeout(() => { locked = false; }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400);
  }, 850);
}
function sizeBoard() {
  grid.style.maxWidth = '';
  if (window.innerWidth < 768) return;
  const style = getComputedStyle(grid);
  const columns = Number(style.getPropertyValue('--columns'));
  const rows = Math.ceil(grid.children.length / columns);
  const gap = parseFloat(style.columnGap);
  const top = grid.getBoundingClientRect().top + window.scrollY;
  const height = window.innerHeight - top - document.querySelector('.divFooter').getBoundingClientRect().height - 32;
  const cardWidth = Math.max(0, (height - gap * (rows - 1)) / rows / 1.5);
  grid.style.maxWidth = `${cardWidth * columns + gap * (columns - 1)}px`;
}
function loadGame() {
  round++;
  clearInterval(clock); clearTimeout(pending);
  if (victory.open) victory.close();
  firstCard = null; locked = false; finished = false; matched = 0; attempts = 0; startedAt = null;
  timer.textContent = '00:00'; moves.textContent = '0';
  document.querySelector('#status').textContent = 'Encontre todos os pares. O tempo começa ao virar a primeira carta.';
  document.querySelector('#player').textContent = player;
  document.querySelector('#level-name').textContent = levels[level].nome;
  grid.dataset.level = level;
  grid.replaceChildren();
  const selected = shuffle(deck).slice(0, levels[level].pares);
  shuffle([...selected, ...selected]).forEach(character => {
    const card = document.createElement('button');
    card.type = 'button'; card.className = 'card';
    card.dataset.character = character.id; card.dataset.label = character.label;
    card.setAttribute('aria-label', 'Carta virada para baixo');
    const inner = document.createElement('span'); inner.className = 'card-inner';
    for (const face of ['back', 'front']) {
      const image = document.createElement('img');
      image.className = `face ${face}`;
      image.src = `img/CartasDoBaralho/${face === 'back' ? 'versoCarta' : character.id}.svg`;
      image.alt = ''; image.draggable = false;
      inner.appendChild(image);
    }
    card.appendChild(inner); card.addEventListener('click', revealCard); grid.appendChild(card);
  });
  sizeBoard();
}
document.querySelector('#restart').addEventListener('click', loadGame);
document.querySelector('#play-again').addEventListener('click', () => {
  loadGame(); grid.children[0].focus();
});
document.querySelector('#close-victory').addEventListener('click', () => victory.close());
victory.addEventListener('close', () => document.querySelector('#restart').focus());
loadGame();
window.addEventListener('resize', sizeBoard);
const boardLayout = new ResizeObserver(sizeBoard);
for (const selector of ['.inner-header', '.toolbar', '#status', '.divFooter']) {
  boardLayout.observe(document.querySelector(selector));
}

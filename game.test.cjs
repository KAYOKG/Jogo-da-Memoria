const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function page(file, values = {}) {
  const elements = new Map();
  class Element {
    constructor() {
      this.children = []; this.dataset = {}; this.style = {}; this.attributes = {};
      this.listeners = {}; this.value = ''; this.textContent = ''; this.open = false;
      const classes = new Set();
      this.classList = { add: (...names) => names.forEach(n => classes.add(n)),
        remove: (...names) => names.forEach(n => classes.delete(n)), contains: n => classes.has(n) };
    }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren() { this.children = []; }
    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
    getBoundingClientRect() { return { top: 200, height: 100 }; }
    addEventListener(k, fn) { this.listeners[k] = fn; }
    click() { if (!this.disabled) this.listeners.click?.({ currentTarget: this }); }
    focus() {}
    setCustomValidity(message) { this.error = message; }
    reportValidity() {}
    showModal() { this.open = true; }
    close() { this.open = false; }
    getAnimations() { return []; }
  }
  const get = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const storage = new Map(Object.entries({ nome: 'Ana', nivel: 'facil', ...values }));
  let now = 0, id = 0;
  const timers = new Map();
  const context = vm.createContext({
    document: { querySelector: get, createElement: () => new Element() },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
    getComputedStyle: () => ({ columnGap: '16px', getPropertyValue: () => '6' }),
    ResizeObserver: class { observe() {} },
    window: { innerWidth: 1440, innerHeight: 900, scrollY: 0, location: { href: '' }, matchMedia: () => ({ matches: false }), addEventListener() {} },
    performance: { now: () => now }, Math, JSON, Promise,
    setInterval: () => ++id, clearInterval() {},
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  return { get, storage, context, tick: ms => { now += ms; },
    flush: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}

test('cada nivel sorteia pares completos do baralho sem joker', () => {
  for (const [nivel, count] of [['facil', 12], ['medio', 20], ['dificil', 30]]) {
    const p = page('game.js', { nivel });
    const cards = p.get('.grid').children;
    assert.equal(cards.length, count);
    const counts = {};
    cards.forEach(c => { counts[c.dataset.character] = (counts[c.dataset.character] || 0) + 1;
      assert(fs.existsSync(`img/CartasDoBaralho/${c.dataset.character}.svg`));
      assert.notEqual(c.dataset.character, 'joker'); });
    assert.equal(Object.keys(counts).length, count / 2);
    assert(Object.values(counts).every(n => n === 2));
  }
});

test('erro trava terceiro clique e reinicio cancela a resolucao pendente', () => {
  const p = page('game.js');
  const cards = p.get('.grid').children;
  const other = cards.find(c => c.dataset.character !== cards[0].dataset.character);
  cards[0].click(); other.click();
  const third = cards.find(c => c !== cards[0] && c !== other);
  third.click();
  assert(!third.classList.contains('reveal-card'));
  assert.equal(p.get('#moves').textContent, '1');
  p.get('#restart').click(); p.flush();
  assert.equal(p.get('.grid').children.length, 12);
  assert.equal(p.get('#moves').textContent, '0');
});

test('cronometro comeca no primeiro clique, para no ultimo par e salva recorde', async () => {
  const p = page('game.js');
  p.tick(90000);
  const cards = p.get('.grid').children;
  const pairs = new Map();
  cards.forEach(c => pairs.set(c.dataset.character, [...(pairs.get(c.dataset.character) || []), c]));
  let first = true;
  for (const pair of pairs.values()) {
    pair[0].click(); if (first) { p.tick(5000); first = false; }
    pair[1].click(); p.flush(); await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(p.get('#timer').textContent, '00:05');
  assert.equal(p.get('#moves').textContent, '6');
  assert(p.get('#victory').open);
  assert.match(p.get('#victory-name').textContent, /Ana/);
  const record = JSON.parse(p.storage.get('recorde-facil'));
  assert.equal(record.tempo, 5000); assert.equal(record.jogadas, 6);
  p.tick(5000); cards[0].click();
  assert.equal(p.get('#moves').textContent, '6');
  p.get('#play-again').click();
  assert(!p.get('#victory').open);
  assert.equal(p.get('#timer').textContent, '00:00');
});

test('submit rejeita branco e nomes longos, salva nome aparado e nivel', () => {
  const p = page('index.js');
  const input = p.get('.myInput'), form = p.get('.resultadoForm');
  let prevented = 0;
  const submit = () => form.listeners.submit({ preventDefault: () => prevented++ });
  input.value = '   '; submit(); assert(input.error);
  input.value = 'a'.repeat(21); submit(); assert(input.error);
  input.value = '  Bia  '; p.get('#level').value = 'medio'; submit();
  assert.equal(prevented, 3); assert.equal(p.storage.get('nome'), 'Bia');
  assert.equal(p.storage.get('nivel'), 'medio');
  assert.equal(p.context.window.location.href, 'game.html');
});

test('recorde desempata por jogadas e preserva um tempo menor', async () => {
  for (const [previous, expectedMoves, expectedTime] of [
    [{ tempo: 5000, jogadas: 9 }, 6, 5000],
    [{ tempo: 4000, jogadas: 9 }, 9, 4000],
    [{ tempo: 5000, jogadas: 6 }, 6, 5000],
  ]) {
    const p = page('game.js', { 'recorde-facil': JSON.stringify(previous) });
    const pairs = new Map();
    p.get('.grid').children.forEach(c => pairs.set(c.dataset.character, [...(pairs.get(c.dataset.character) || []), c]));
    let first = true;
    for (const pair of pairs.values()) {
      pair[0].click(); if (first) { p.tick(5000); first = false; } pair[1].click();
    }
    await new Promise(resolve => setImmediate(resolve));
    const saved = JSON.parse(p.storage.get('recorde-facil'));
    assert.equal(saved.tempo, expectedTime); assert.equal(saved.jogadas, expectedMoves);
  }
});

test('modal espera animacao e reiniciar impede modal de partida anterior', async () => {
  const p = page('game.js');
  let finishAnimation;
  const animation = new Promise(resolve => { finishAnimation = resolve; });
  const pairs = new Map();
  p.get('.grid').children.forEach(c => {
    c.getAnimations = () => [{ finished: animation }];
    pairs.set(c.dataset.character, [...(pairs.get(c.dataset.character) || []), c]);
  });
  for (const pair of pairs.values()) { pair[0].click(); pair[1].click(); }
  await new Promise(resolve => setImmediate(resolve));
  assert(!p.get('#victory').open);
  p.get('#restart').click(); finishAnimation();
  await new Promise(resolve => setImmediate(resolve));
  assert(!p.get('#victory').open);
});

test('nivel e recorde corrompidos usam fallback; tela inicial mostra recorde valido', () => {
  const game = page('game.js', { nivel: '__proto__', 'recorde-facil': '{invalid' });
  assert.equal(game.get('.grid').children.length, 12);
  const home = page('index.js', { 'recorde-medio': '{invalid', 'recorde-facil': '{"tempo":65000,"jogadas":8}' });
  assert.match(home.get('#record-facil').textContent, /01:05.*8 jogadas/);
  assert.match(home.get('#record-medio').textContent, /sem recorde/);
});

 test('tabuleiro limita cartas pela altura e libera limite no celular', () => {
  const p = page('game.js', { nivel: 'dificil' });
  vm.runInContext('sizeBoard()', p.context);
  const width = parseFloat(p.get('.grid').style.maxWidth);
  const cardWidth = (width - 5 * 16) / 6;
  assert(cardWidth > 0);
  assert(200 + 5 * cardWidth * 1.5 + 4 * 16 + 100 + 32 <= 900.01);
  p.context.window.innerHeight = 600;
  vm.runInContext('sizeBoard()', p.context);
  assert(parseFloat(p.get('.grid').style.maxWidth) < width);
  p.context.window.innerWidth = 390;
  vm.runInContext('sizeBoard()', p.context);
  assert.equal(p.get('.grid').style.maxWidth, '');
});

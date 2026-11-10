const input = document.querySelector('.myInput');
const form = document.querySelector('.resultadoForm');
const levelInput = document.querySelector('#level');
const levels = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
function showRecords() {
  for (const [level, label] of Object.entries(levels)) {
    let text = `${label}: sem recorde`;
    try {
      const record = JSON.parse(localStorage.getItem(`recorde-${level}`));
      if (record && Number.isFinite(record.tempo) && record.tempo >= 0 &&
          Number.isInteger(record.jogadas) && record.jogadas >= ({ facil: 6, medio: 10, dificil: 15 })[level]) {
        const seconds = Math.floor(record.tempo / 1000);
        text = `${label}: ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} · ${record.jogadas} jogadas`;
      }
    } catch { /* Recordes são opcionais quando o armazenamento está bloqueado. */ }
    document.querySelector(`#record-${level}`).textContent = text;
  }
}
try {
  input.value = localStorage.getItem('nome')?.slice(0, 20) || '';
  const savedLevel = localStorage.getItem('nivel');
  if (Object.hasOwn(levels, savedLevel)) levelInput.value = savedLevel;
} catch { /* O formulário permanece disponível. */ }
input.addEventListener('input', () => input.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  const name = input.value.trim();
  input.setCustomValidity(!name ? 'Digite seu nome.' : name.length > 20 ? 'Use no máximo 20 caracteres.' : '');
  if (!name || name.length > 20) { input.reportValidity(); return; }
  const level = Object.hasOwn(levels, levelInput.value) ? levelInput.value : 'facil';
  try {
    localStorage.setItem('nome', name);
    localStorage.setItem('nivel', level);
  } catch {
    document.querySelector('#form-error').textContent = 'Permita o armazenamento neste navegador para salvar seu nome e nível.';
    return;
  }
  window.location.href = 'game.html';
});
window.addEventListener('pageshow', showRecords);
showRecords();

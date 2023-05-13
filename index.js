const input = document.querySelector(".myInput");
const form = document.querySelector(".resultadoForm");

const capturarNome = (evento) => {
  console.log("capturando nome");
  localStorage.setItem("nome", input.value);
  window.location = "game.html";
}

form.addEventListener("submit", capturarNome);
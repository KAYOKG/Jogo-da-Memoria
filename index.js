function armazenarValor() {
    var valorInput = document.getElementById("myInput").value;
    localStorage.setItem("inputValor", valorInput);
    window.location.href = "game.html";
}
const grid = document.querySelector('.grid');
const character = ['copas2', 'copas3', 'copas4', 'copas5', 
];

function createElement(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
}

let firstCard = '';
let secondCard = '';

const checkEndGame = () => {
    const disabledCards = document.querySelectorAll('.disabled-card');
    console.log(disabledCards.length);
  
    if (disabledCards.length === 8) {
      
      alert(`Parabéns, ! Seu tempo foi de: `);
    }
  }

const checkCards = () => {
    const firstCharacter = firstCard.getAttribute('data-character');
    const secondCharacter = secondCard.getAttribute('data-character');
  
    if (firstCharacter === secondCharacter) {
  
      firstCard.firstChild.classList.add('disabled-card');
      secondCard.firstChild.classList.add('disabled-card');
  
      firstCard = '';
      secondCard = '';
  
      checkEndGame();
  
    } else {
      setTimeout(() => {
  
        firstCard.classList.remove('reveal-card');
        secondCard.classList.remove('reveal-card');
  
        firstCard = '';
        secondCard = '';
  
      }, 500);
    }
  
  }

const revealCard = ({target}) =>{
    if (target.parentNode.className.includes('reveal-card')) {
        return;
      }
    
      if (firstCard === '') {
    
        target.parentNode.classList.add('reveal-card');
        firstCard = target.parentNode;
    
      } else if (secondCard === '') {
    
        target.parentNode.classList.add('reveal-card');
        secondCard = target.parentNode;
    
        checkCards();
    
      }
}

function createCard(character){
    const card = createElement('div','card');
    const front = createElement('div','face front');
    const back = createElement('div','face back');

    front.style.backgroundImage = `url('img/CartasDoBaralho/${character}.svg')`;

    card.appendChild(front);
    card.appendChild(back);

    card.addEventListener('click',revealCard);

    card.setAttribute('data-character', character)

    return card;
}

const loadGame = () =>{

    const duplicateCharacter = [...character,...character]

    const shuffledArray = duplicateCharacter.sort(() => Math.random() - 0.5);

    shuffledArray.forEach((character) =>{
        const card = createCard(character);
        grid.appendChild(card);
    });
}

loadGame();

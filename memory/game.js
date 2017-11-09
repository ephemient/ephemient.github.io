'use strict';

function shuffle(...array) {
    for (let i = 0; i < array.length; i++) {
        let j = Math.floor(Math.random() * i);
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

const CARD_STATE_CLOSED = Symbol();
const CARD_STATE_OPENED = Symbol();
const CARD_STATE_MISMATCH = Symbol();
const CARD_STATE_MATCHED = Symbol();

class Card {
    constructor({symbol, element, state = CARD_STATE_CLOSED}) {
        this.symbol = symbol;
        this.element = element;
        this.state = state;
        this.element.classList.add(Card.cssClassForState(state));
    }

    get isMatched() {
        return this.state === CARD_STATE_MATCHED;
    }

    matches(...cards) {
        return cards.every((card) => this.symbol === card.symbol);
    }

    open() {
        if (this.state !== CARD_STATE_CLOSED) {
            return false;
        }
        this.setState(CARD_STATE_OPENED);
        return true;
    }

    close() {
        this.setState(CARD_STATE_CLOSED);
    }

    mismatch() {
        this.setState(CARD_STATE_MISMATCH);
    }

    match() {
        this.setState(CARD_STATE_MATCHED);
    }

    setState(state) {
        this.element.classList.remove(Card.cssClassForState(this.state));
        this.element.classList.add(Card.cssClassForState(state));
        this.state = state;
    }

    static cssClassForState(state) {
        switch (state) {
            case CARD_STATE_CLOSED:
                return 'closed';
            case CARD_STATE_OPENED:
                return 'opened';
            case CARD_STATE_MISMATCH:
                return 'mismatch';
            case CARD_STATE_MATCHED:
                return 'matched';
        }
    }
}

const GAME_EVENT_MOVES = 'GameMoves';
const GAME_EVENT_OVER = 'GameOver';

const GAME_STATE_GUESSING = Symbol();
const GAME_STATE_MISMATCH = Symbol();
const GAME_STATE_OVER = Symbol();

const GAME_SHOWING_TIMEOUT = 2000;

class Game {
    constructor({board, symbols, matchCount = 2}) {
        this.board = board;
        this.cards = [];
        this.openedCards = [];
        this.matchCount = matchCount;
        for (const symbol of shuffle(...symbols)) {
            const element = board.appendChild(document.createElement('div'));
            element.dataset.symbol = symbol;
            const card = new Card({symbol, element});
            this.cards.push(card);
            element.addEventListener('click', this.onCardClick.bind(this, card));
        }
        board.addEventListener('click', this.onBoardClick.bind(this));
        this.state = GAME_STATE_GUESSING;
        this.mismatchTimeout = 0;
        this.moves = 0;
    }

    onBoardClick(event) {
        if (this.state !== GAME_STATE_MISMATCH) {
            return;
        }
        event.stopPropagation();
        this.guessing();
    }

    onCardClick(card, event) {
        if (this.state !== GAME_STATE_GUESSING) {
            return;
        }
        if (!card.open()) {
            return;
        }
        event.stopPropagation();
        const matched = card.matches(...this.openedCards);
        this.openedCards.push(card);
        if (!matched) {
            this.mismatch();
        } else if (this.openedCards.length >= this.matchCount) {
            this.matched();
        }
    }

    guessing() {
        this.openedCards.forEach((card) => card.close());
        this.openedCards.splice(0, this.openedCards.length);
        this.state = GAME_STATE_GUESSING;
        window.clearTimeout(this.mismatchTimeout);
        this.mismatchTimeout = 0;
    }

    mismatch() {
        this.openedCards.forEach((card) => card.mismatch());
        this.state = GAME_STATE_MISMATCH;
        this.incrementMoves();
        this.mismatchTimeout = window.setTimeout(this.guessing.bind(this), GAME_SHOWING_TIMEOUT);
    }

    matched() {
        this.openedCards.forEach((card) => card.match());
        this.openedCards.splice(0, this.openedCards.length);
        this.incrementMoves();
        if (this.cards.every((card) => card.isMatched)) {
            this.over();
        } else {
            this.guessing();
        }
    }

    over() {
        this.state = GAME_STATE_OVER;
        this.board.dispatchEvent(new CustomEvent(GAME_EVENT_OVER));
    }

    incrementMoves() {
        this.board.dispatchEvent(new CustomEvent(GAME_EVENT_MOVES, {detail: ++this.moves}));
    }
}

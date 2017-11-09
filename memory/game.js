'use strict';


function shuffle(...array) {
    for (let i = 1; i < array.length; i++) {
        let j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}


class Card {
    constructor({symbol, element, state = Card.State.CLOSED}) {
        this.symbol = symbol;
        this.element = element;
        this.state = state;
        for (const key of Object.getOwnPropertySymbols(Card.CSSClass)) {
            this.element.classList.remove(Card.CSSClass[key]);
        }
        this.element.classList.add(Card.CSSClass[state]);
    }

    get isMatched() {
        return this.state === Card.State.MATCHED;
    }

    matches(...cards) {
        return cards.every((card) => this.symbol === card.symbol);
    }

    tryOpen() {
        if (this.state !== Card.State.CLOSED) {
            return false;
        }
        this.setState(Card.State.OPENED);
        return true;
    }

    close() {
        this.setState(Card.State.CLOSED);
    }

    mismatch() {
        this.setState(Card.State.MISMATCH);
    }

    match() {
        this.setState(Card.State.MATCHED);
    }

    setState(state) {
        this.element.classList.replace(Card.CSSClass[this.state], Card.CSSClass[state]);
        this.state = state;
    }
}

Card.State = {
    CLOSED: Symbol(),
    OPENED: Symbol(),
    MISMATCH: Symbol(),
    MATCHED: Symbol()
};

Card.CSSClass = function() {
    const cssClass = {};
    cssClass[Card.State.CLOSED] = 'closed';
    cssClass[Card.State.OPENED] = 'opened';
    cssClass[Card.State.MISMATCH] = 'mismatch';
    cssClass[Card.State.MATCHED] = 'matched';
    return cssClass;
}();


class Game {
    constructor({board, symbols, elements, matchCount = 2, showTimeout = 2000}) {
        this.board = board;
        this.cards = [];
        this.openedCards = [];
        this.matchCount = matchCount;
        this.showTimeout = showTimeout;
        shuffle(...symbols).forEach((symbol, i) => {
            const element = elements[i];
            element.dataset.symbol = symbol;
            const card = new Card({symbol, element});
            this.cards.push(card);
            element.addEventListener('click', this.onCardClick.bind(this, card));
        });
        board.addEventListener('click', this.onBoardClick.bind(this));
        this.state = Game.State.GUESSING;
        this.mismatchTimeout = 0;
        this.moves = 0;
    }

    onBoardClick(event) {
        if (this.state !== Game.State.MISMATCH) {
            return;
        }
        event.stopPropagation();
        this.guessing();
    }

    onCardClick(card, event) {
        if (this.state !== Game.State.GUESSING) {
            return;
        }
        if (!card.tryOpen()) {
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
        this.state = Game.State.GUESSING;
        window.clearTimeout(this.mismatchTimeout);
        this.mismatchTimeout = 0;
    }

    mismatch() {
        this.openedCards.forEach((card) => card.mismatch());
        this.state = Game.State.MISMATCH;
        this.incrementMoves();
        this.mismatchTimeout = window.setTimeout(this.guessing.bind(this), this.showTimeout);
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
        this.state = Game.State.OVER;
        this.board.dispatchEvent(new CustomEvent(Game.Events.OVER));
    }

    incrementMoves() {
        this.board.dispatchEvent(new CustomEvent(Game.Events.MOVES, {detail: ++this.moves}));
    }
}

Game.Events = {
    MOVES: 'GameMoves',
    OVER: 'GameOver'
};

Game.State = {
    GUESSING: Symbol(),
    MISMATCH: Symbol(),
    OVER: Symbol()
};

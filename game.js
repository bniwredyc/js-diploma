'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if (!(vector instanceof(Vector))) {
      throw new Error('Vector.plus: Прибавляемый вектор должен быть объектом Vector');
    }
      const addX = this.x + vector.x;
      const addY = this.y + vector.y;
    return new Vector(addX, addY);
  }
  times(num) {
    if (typeof(num) !== 'number') {
      throw new Error('Vector.times: Множитель должен быть числом');
    }
    const addX = this.x * num;
    const addY = this.y * num;
    return new Vector(addX, addY);
  }
}

class Actor {
  constructor(pos = new Vector(), size = new Vector(1,1), speed = new Vector()) {
    if (!(pos instanceof(Vector)) || !(size instanceof(Vector)) || !(speed instanceof(Vector))) {
      throw new Error('Actor.constructor: все аргументы должны быть объектами Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  get type() {
    return 'actor';
  }

  act() {}

  isIntersect(actor) {
    if (!(actor instanceof(Actor)) || actor === undefined) {
      throw new Error('Actor.isIntersect: аргумент должен быть объектом Actor')
    }
    if (actor === this) {
      return false;
    }
    return !(this.right <= actor.left ||
              this.left >= actor.right ||
              this.bottom <= actor.top ||
              this.top >= actor.bottom);
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = grid.length;
    this.width = this.height > 0 ? Math.max(...grid.map(el => el.length)) : 0;
    this.status = null;
    this.finishDelay = 1;
    this.player = this.actors.find(actor => actor.type === 'player');
  }
  isFinished() {
    return (this.status !== null && this.finishDelay < 0);
  }


  actorAt(obj) {
    if (!(obj instanceof(Actor)) || obj === undefined) {
      throw new Error('Level.actorAt: аргумент должен быть объектом Actor')
    }
      return this.actors.find(actorEl => actorEl.isIntersect(obj));
  }
  obstacleAt(destination, size) {
    if (!(destination instanceof(Vector)) || !(size instanceof(Vector))) {
      throw new Error('Level.obstacleAt: аргументы должны быть объектами Vector')
    }

      const borderLeft = Math.floor(destination.x);
      const borderRight = Math.ceil(destination.x + size.x);
      const borderTop = Math.floor(destination.y);
      const borderBottom = Math.ceil(destination.y + size.y);

    let actor = new Actor(destination, size);
    if (actor.top < 0 || actor.left < 0 || actor.right > this.width) {
      return 'wall';
    }
    if (actor.bottom > this.height) {
      return 'lava';
    }
    for (let col = borderTop; col < borderBottom; col++) {
      for (let row = borderLeft; row < borderRight; row++) {
        const gridLev = this.grid[col][row];
        if (gridLev) {
          return gridLev;
        }
      }
    }
  }
  removeActor(actor) {
    const actorIndex = this.actors.indexOf(actor);
    this.actors.splice(actorIndex, 1);
  }
  noMoreActors(type) {
    return !this.actors.some((actor) => actor.type === type);
  }
  playerTouched(type, actor) {
    if (this.status !== null) {
        return;
    }
    if (['lava', 'fireball'].some((el) => el === type)) {
        return this.status = 'lost';
    }
    if (type === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
          return this.status = 'won'
      }
    }
  }
}

class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }
  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }
  obstacleFromSymbol(symbol) {
    if (symbol === 'x') {
      return 'wall';
    }
    if (symbol === '!') {
      return 'lava';
    }
  }
  createGrid(plan) {
    return plan.map(line => line.split('')).map(line => line.map(line => this.obstacleFromSymbol(line)));
  }
  createActors(plan) {
    const result = [];
    if (this.dictionary) {
      plan.forEach((row, y) => {
        row.split('').forEach((cell, x) => {
          if (typeof this.dictionary[cell] === 'function') {
            const pos = new Vector(x, y);
            const actor = new this.dictionary[cell](pos);
            if (actor instanceof Actor) {
              result.push(actor);
            }
          }
        })
      })
    }
    return result;
  }
  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0,0), speed = new Vector(0,0)) {
    super(pos, new Vector(1,1), speed);
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(t = 1) {
    return this.pos.plus(this.speed.times(t));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(t, lvl) {
    let nextPosition = this.getNextPosition(t);
    if (!lvl.obstacleAt(nextPosition, this.size)) {
      this.pos = nextPosition;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball{
  constructor(pos) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball{
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball{
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.init = pos;
  }
  handleObstacle() {
    this.pos = this.init;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector()) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.initPos = pos.plus(new Vector(0.2, 0.1));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }
  get type() {
    return 'coin';
  }
  updateSpring(t = 1) {
    this.spring += this.springSpeed * t;
  }
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  getNextPosition(t = 1) {
    this.updateSpring(t);
    return this.initPos.plus(this.getSpringVector());
  }
  act(t) {
    this.pos = this.getNextPosition(t);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(1,1)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector());
  }
  get type() {
    return 'player';
  }
}

const actors = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain
};
const parser = new LevelParser(actors);

loadLevels()
  .then(result => runGame(JSON.parse(result), parser, DOMDisplay))
  .then(() => alert('Вы выиграли приз!'));
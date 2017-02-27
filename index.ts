import {makeDOMDriver, div, h} from '@cycle/dom';
import {timeDriver} from '@cycle/time';
import {run} from '@cycle/run';
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

import {Vector, add, subtract, multiply, pythag, normalize} from './vector';

const glider = h('g', {props: {innerHTML: `
<svg width="166px" height="40px" viewBox="274 123 166 40" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <!-- Generator: Sketch 42 (36781) - http://www.bohemiancoding.com/sketch -->
    <desc>Created with Sketch.</desc>
    <defs>
        <rect id="path-1" x="305" y="146" width="34" height="9" rx="4.5"></rect>
        <mask id="mask-2" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="34" height="9" fill="white">
            <use xlink:href="#path-1"></use>
        </mask>
        <rect id="path-3" x="303" y="151" width="34" height="9" rx="4.5"></rect>
        <mask id="mask-4" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="34" height="9" fill="white">
            <use xlink:href="#path-3"></use>
        </mask>
        <rect id="path-5" x="328" y="144" width="40" height="18" rx="8"></rect>
        <mask id="mask-6" maskContentUnits="userSpaceOnUse" maskUnits="objectBoundingBox" x="0" y="0" width="40" height="18" fill="white">
            <use xlink:href="#path-5"></use>
        </mask>
    </defs>
    <use id="Rectangle-2" stroke="#979797" mask="url(#mask-2)" stroke-width="2" fill="#D8D8D8" fill-rule="evenodd" xlink:href="#path-1"></use>
    <use id="Rectangle-2" stroke="#979797" mask="url(#mask-4)" stroke-width="2" fill="#834E4E" fill-rule="evenodd" xlink:href="#path-3"></use>
    <use id="Rectangle" stroke="#979797" mask="url(#mask-6)" stroke-width="2" fill="#B7DD9C" fill-rule="evenodd" xlink:href="#path-5"></use>
    <circle id="Oval" stroke="#979797" stroke-width="1" fill="#EFDAB9" fill-rule="evenodd" cx="373" cy="153" r="9"></circle>
    <polygon id="Triangle" stroke="#979797" stroke-width="1" fill="#D8D8D8" fill-rule="evenodd" points="435 143.171423 276 160.304688 297.278967 139.282832 281.025369 124"></polygon>
</svg>
`}});

function renderGlider (state) {
  const rotation = Math.atan2(state.direction.y, state.direction.x);
  const transform = `translate(${window.innerWidth / 2 - 166 / 2}px, ${window.innerHeight / 2 - 40 / 2}px) rotate(${rotation}rad)`;

  return {
    ...glider,

    data: {
      ...glider.data,

      style: {transform, position: 'absolute', 'transform-origin': 'center'}
    }
  }
}

function view (state) {
  const center = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }

  const velocityLine = add(center, multiply(state.velocity, 5));
  const liftLife = add(center, multiply(state.lift, 3));

  const renderLine = (vector, color, multiplier) => {
    const end = add(center, multiply(vector, multiplier));

    return h('line', {attrs: {x1: center.x, y1: center.y, x2: end.x, y2: end.y, stroke: color}});
  }

  const style = {
    'background-image': 'url("clouds.jpg")',
    'background-repeat': 'repeat',
    'background-position': `${-state.position.x.toFixed(1)}px ${-state.position.y.toFixed(1)}px`
  }

  const debugLines = [
    renderLine(state.velocity, 'gold', 3),
    renderLine(state.lift, 'lime', 100),
    renderLine(state.direction, 'blue', 70),
    renderLine(state.drag, 'red', 100)
  ];

  return (
    h('svg', {attrs: {width: '100%', height: '100%'}, style}, [
      renderGlider(state),

      ...(state.debug ? debugLines : [])
    ])
  )
}

const gravity = {
  x: 0,
  y: 9.8 / 60
}

const liftBase = {
  x: 0,
  y: -0.2
}

function rotate (point: Vector, angle: number) {
  return {
    x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
    y: point.x * Math.sin(angle) + point.y * Math.cos(angle)
  }
}


function noAbsPythag (v: Vector): number {
  const {x, y} = v;

  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

function sign (i) {
  if (i === 0) {
    return 0;
  }

  if (i > 0) {
    return 1;
  } else {
    return -1;
  }
}

function safePow (i) {
  const iSign = sign(i);
  const abs = Math.abs(i);

  if (abs < 0.3) {
    return abs * iSign;
  }


  return Math.max(0, (0.3 - (abs - 0.3))) * iSign;
}

function updateState (state, [frame, mousePosition]) {
  const center = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }
  const direction = normalize(subtract(mousePosition, center));

  const perpendicularDirection = normalize(rotate(state.velocity, Math.PI * -0.5));

  const angle1 = Math.atan2(state.velocity.y, state.velocity.x) - Math.atan2(direction.y, direction.x);
  const angle2 = (Math.atan2(direction.y, direction.x) + Math.PI * 2) - Math.atan2(state.velocity.y, state.velocity.x);
  let angle
  if (angle1 > Math.PI) {
    angle = -angle2
  } else {
    angle = angle1
  }

  const lift = multiply(perpendicularDirection, pythag(state.velocity) * safePow(angle) / 10);
  const drag = multiply(normalize(state.velocity), -((0.05 + Math.abs(angle) / 20) * pythag(state.velocity) / 20));

  const velocity = [gravity, lift, drag].reduce(add, state.velocity);

  const position = add(state.position, velocity);

  return {
    ...state,

    position,
    velocity,
    direction,
    lift,
    drag
  }
}

function main (sources) {
  const frame$ = sources.Time.animationFrames();
  const initialState = {
    position: {
      x: 50,
      y: 50
    },

    velocity: {
      x: 10,
      y: 0
    },

    direction: {
      x: 1,
      y: 0
    },

    lift: {
      x: 0,
      y: 0
    },

    drag: {
      x: 0,
      y: 0
    },

    debug: false
  }

  const mousePosition$ = sources.DOM
    .select('document')
    .events('mousemove')
    .compose(sources.Time.throttleAnimation)
    .map(ev => ({x: ev.clientX, y: ev.clientY}))

  const debug$ = sources.DOM
    .select('document')
    .events('keydown')
    .filter(ev => ev.code === 'Space')
    .map(ev => (state) => ({...state, debug: !state.debug}));

  const reducer$ = xs.merge(
    frame$.compose(sampleCombine(mousePosition$)).map(frame => (state) => updateState(state, frame)),
    debug$
  );

  const state$ = reducer$.fold((state, reducer: Function) => reducer(state), initialState);

  return {
    DOM: state$.map(view)
  }
}

const drivers = {
  DOM: makeDOMDriver('body'),
  Time: timeDriver
}

run(main, drivers);

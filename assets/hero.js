// The hero's scan demonstration, written as one score: every element's motion is a fixed function of loop time
// (Web Animations, transform and opacity only). No script runs per frame, the loop's first and last moments are the
// same by construction, and pausing is one call. Values are dated examples set in build.py; nothing is fetched.
//
// A scan is the app's own recognition (Motion.swift, SingleScanScore.swift, AddedFeedback.swift): the card arrives, the
// scan box closes in and reads it, then in one moment the box locks on, the card takes a knock, a sheen crosses it and
// the screen's edge lights in its color. The value pops up, travels to the session total, and the total rolls and
// catches light. The card is dealt away as the next one arrives.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo || !demo.animate) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hasLinear = CSS.supports('animation-timing-function', 'linear(0, 1)');

  const cards = [...demo.querySelectorAll('[data-card]')];
  const results = [...demo.querySelectorAll('[data-result]')];

  // Times in seconds. A card's beats are measured from when it starts to arrive.
  const SETTLED = 0.62; // First paint is Darkrai at rest, so the score joins here, as its scan begins.
  const BOX = 0.62;
  const READ = 0.64;
  const RECOGNIZED = 1.14;
  const PRICE = RECOGNIZED + 0.05;
  const NAME = RECOGNIZED + 0.08;
  const FLIGHT = RECOGNIZED + 0.42;
  const TOTAL = RECOGNIZED + 0.62;
  const LEAVE = RECOGNIZED + 1.62;
  const BEAT = LEAVE + 0.1;
  const STARTS = cards.map((_, i) => i * BEAT);
  const RESET = STARTS[cards.length - 1] + LEAVE + 0.1;
  const LOOP = RESET + 0.75;

  // Session totals, right-aligned into hundreds, tens, ones, and two decimals. ' ' is an empty slot.
  let cents = 0;
  const TOTALS = ['0.00', ...results.map((r) => ((cents += +r.dataset.cents) / 100).toFixed(2))].map((s) => s.padStart(6, ' '));
  const CHANGES = [RESET, ...STARTS.map((t) => t + TOTAL)];

  // A damped spring's step response, in the app's terms (Motion.swift), as a CSS linear() easing.
  const spring = (response, damping) => {
    const w = (2 * Math.PI) / response;
    const wd = w * Math.sqrt(1 - damping * damping);
    const x = (t) => 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
    let settle = 0;
    for (let t = 0; t < 4; t += 1 / 240) if (Math.abs(1 - x(t)) > 0.001) settle = t;
    const points = Array.from({ length: 48 }, (_, i) => x((i / 48) * settle).toFixed(4));
    return {
      easing: hasLinear ? `linear(${points.join(', ')}, 1)` : 'cubic-bezier(.23, 1, .32, 1)',
      duration: settle,
    };
  };

  const curve = (easing, duration) => ({ easing, duration });
  const STRONG_OUT = 'cubic-bezier(.23, 1, .32, 1)';
  const DRAWER = 'cubic-bezier(.32, .72, 0, 1)';
  const SNAP = curve('linear', 0.001);
  const TOSS = spring(0.46, 0.8); // A tossed card decelerating hard into place.
  const BOX_IN = spring(0.3, 0.98);
  const LOCK = spring(0.2, 0.55); // The box's small kick as it locks on.
  const POP = spring(0.3, 0.62); // The value: quick, a little past, a decisive stop.
  const LIFT_AWAY = spring(0.42, 0.8);
  const DIGIT = spring(0.3, 0.82);
  const FLIGHT_PATH = spring(0.36, 0.98);
  const FADE_IN = curve(STRONG_OUT, 0.1);
  const READ_RUN = curve('cubic-bezier(.45, 0, .55, 1)', RECOGNIZED - READ);
  const SHEEN_RUN = curve('cubic-bezier(.4, 0, .6, 1)', 0.34);
  const DIM = curve(STRONG_OUT, 0.12);
  const FADE_OUT = curve(STRONG_OUT, 0.12);
  const DIGIT_OUT = curve(STRONG_OUT, 0.18);
  const PICK_UP = curve(STRONG_OUT, 0.06);
  const DEAL = curve('cubic-bezier(.77, 0, .175, 1)', 0.3);
  const AMBIENT = curve(DRAWER, 0.34);

  // The knock: a stiff, light-damped spring absorbing an impulse. Pressed in 4.5 %, recoiling a little past where it was.
  const IMPACT = { response: 0.2, damping: 0.5, depth: 0.045, lasts: 0.34 };
  const knock = (() => {
    const w = (2 * Math.PI) / IMPACT.response;
    const wd = w * Math.sqrt(1 - IMPACT.damping ** 2);
    const peak = Math.exp((-IMPACT.damping * w * Math.PI) / (2 * wd));
    return (u) => `scale(${(1 - (IMPACT.depth * Math.exp(-IMPACT.damping * w * u) * Math.sin(wd * u)) / peak).toFixed(4)})`;
  })();

  let animations = [];

  // `steps` are [time, values, curve]; each holds until the next. A step with a `path` is drawn point by point instead.
  // The last values must equal `from`, closing the loop.
  const track = (el, from, steps) => {
    const frames = [{ offset: 0, ...from, easing: 'linear' }];
    const add = (t, values, easing) => frames.push({ offset: Math.max(t / LOOP, frames[frames.length - 1].offset), ...values, easing });
    let now = from;
    for (const [t, to, c] of steps) {
      add(t, now, c.easing || 'linear');
      if (c.path) {
        for (let i = 1; i < c.samples; i += 1) {
          const u = (i / c.samples) * c.duration;
          add(t + u, { transform: c.path(u) }, 'linear');
        }
      }
      add(t + c.duration, to, 'linear');
      now = to;
    }
    frames.push({ offset: 1, ...now });
    animations.push(el.animate(frames, { duration: LOOP * 1000, iterations: Infinity }));
  };

  // The same steps at every card's start.
  const onEveryCard = (steps) => STARTS.flatMap((t) => steps.map(([at, to, c]) => [t + at, to, c]));
  const part = (selector) => demo.querySelector(selector);

  const scoreCards = () => {
    const pose = (x, y, degrees, scale) => ({ transform: `translateX(${x}%) translateY(${y}%) rotate(${degrees}deg) scale(${scale})` });
    const ARRIVING = pose(0, 92, 3, 1.05);
    const REST = pose(0, 0, 0, 1);
    const PICKED_UP = pose(0, -0.5, 0, 1.03);
    const DEALT = pose(128, -3, 5, 1.03);
    const GONE = LEAVE + PICK_UP.duration + DEAL.duration + 0.01;
    cards.forEach((card, i) => {
      const t = STARTS[i];
      track(card, ARRIVING, [
        [t, REST, TOSS],
        [t + LEAVE, PICKED_UP, PICK_UP],
        [t + LEAVE + PICK_UP.duration, DEALT, DEAL],
        [t + GONE, ARRIVING, SNAP],
      ]);
      // Darkened under its value (as in Figma), brightening again as it's picked up.
      track(card, { opacity: 0 }, [
        [t, { opacity: 1 }, FADE_IN],
        [t + RECOGNIZED + 0.02, { opacity: 0.5 }, DIM],
        [t + LEAVE, { opacity: 1 }, FADE_OUT],
        [t + GONE, { opacity: 0 }, SNAP],
      ]);
    });

    const RESTING = { transform: 'scale(1)' };
    track(part('[data-stack]'), RESTING, onEveryCard([
      [RECOGNIZED, RESTING, { path: knock, duration: IMPACT.lasts, samples: 24 }],
    ]));

    demo.querySelectorAll('[data-tint]').forEach((tint) => {
      const i = +tint.dataset.tint;
      track(tint, { opacity: 0 }, [
        [STARTS[i] - 0.05, { opacity: 1 }, AMBIENT],
        [STARTS[i] + BEAT - 0.05, { opacity: 0 }, AMBIENT],
      ]);
    });
    demo.querySelectorAll('[data-edge]').forEach((edge) => {
      const at = STARTS[+edge.dataset.edge] + RECOGNIZED;
      track(edge, { opacity: 0 }, [
        [at, { opacity: 0.9 }, curve(STRONG_OUT, 0.1)],
        [at + 0.1, { opacity: 0.76 }, curve('linear', 0.08)],
        [at + 0.18, { opacity: 0 }, curve('cubic-bezier(.33, 0, .67, 1)', 0.65)],
      ]);
    });
  };

  const scoreScanner = () => {
    const LOOSE = { transform: 'scale(1.05)', opacity: 0 };
    const READING = { transform: 'scale(1.012)', opacity: 0.9 };
    track(part('[data-box]'), LOOSE, onEveryCard([
      [BOX, READING, BOX_IN],
      [RECOGNIZED, { transform: 'scale(1)', opacity: 0 }, curve('linear', 0.04)],
      [LEAVE, LOOSE, SNAP],
    ]));

    const UNLOCKED = { transform: 'scale(1.012)', opacity: 0 };
    track(part('[data-lock]'), UNLOCKED, onEveryCard([
      [RECOGNIZED, { transform: 'scale(1)', opacity: 1 }, LOCK],
      [RECOGNIZED + 0.42, { transform: 'scale(1)', opacity: 0 }, curve(STRONG_OUT, 0.3)],
      [LEAVE, UNLOCKED, SNAP],
    ]));

    const beam = part('[data-beam]');
    const ABOVE = { transform: 'translateY(-100%)' };
    const BELOW = { transform: 'translateY(285%)' };
    track(beam, ABOVE, onEveryCard([
      [READ, BELOW, READ_RUN],
      [LEAVE, ABOVE, SNAP],
    ]));
    track(beam, { opacity: 0 }, onEveryCard([
      [READ, { opacity: 1 }, curve('linear', 0.05)],
      [RECOGNIZED - 0.05, { opacity: 0 }, curve('linear', 0.05)],
    ]));

    const OFF_LEFT = { transform: 'translateX(-120%)' };
    track(part('[data-sheen]'), OFF_LEFT, onEveryCard([
      [RECOGNIZED, { transform: 'translateX(120%)' }, SHEEN_RUN],
      [LEAVE, OFF_LEFT, SNAP],
    ]));
  };

  const scoreResults = () => {
    const SHOWN = { transform: 'translateY(0) scale(1)', opacity: 1 };
    const AWAY = { transform: 'translateY(-8%) scale(1)', opacity: 0 };
    results.forEach((result, i) => {
      const t = STARTS[i];
      const [name, price, flight] = result.children;
      for (const [el, at, enter] of [
        [name, NAME, 'translateY(60%) scale(.92)'],
        [price, PRICE, 'translateY(36%) scale(.78)'],
      ]) {
        const HIDDEN = { transform: enter, opacity: 0 };
        track(el, HIDDEN, [
          [t + at, SHOWN, POP],
          [t + LEAVE, AWAY, FADE_OUT],
          [t + LEAVE + 0.2, HIDDEN, SNAP],
        ]);
      }
      // The value travels to the total: 296 points up, shrinking to the total's size.
      const HOME = { transform: 'translateY(0) scale(1)' };
      track(flight, HOME, [
        [t + FLIGHT, { transform: 'translateY(-356%) scale(.375)' }, FLIGHT_PATH],
        [t + LEAVE, HOME, SNAP],
      ]);
      track(flight, { opacity: 0 }, [
        [t + FLIGHT, { opacity: 0.95 }, SNAP],
        [t + FLIGHT + 0.14, { opacity: 0 }, curve(STRONG_OUT, 0.14)],
      ]);
    });
  };

  // Like the app's .numericText: a digit that changes slides out while its replacement slides in, rightmost first.
  // Counting up moves upward; the reset to a new session moves down.
  const scoreTotal = () => {
    const total = part('[data-total]');
    const row = document.createElement('span');
    row.className = 'demo__row';
    row.dataset.row = '';
    const sign = document.createElement('span');
    sign.textContent = '$';
    row.append(sign);

    const HIDDEN_BELOW = { transform: 'translateY(38%) scale(.94)', opacity: 0 };
    const HIDDEN_ABOVE = { transform: 'translateY(-38%) scale(.94)', opacity: 0 };
    const SHOWN = { transform: 'translateY(0) scale(1)', opacity: 1 };

    [0, 1, 2, null, 4, 5].forEach((slot) => {
      if (slot === null) {
        const dot = document.createElement('span');
        dot.textContent = '.';
        row.append(dot);
        return;
      }
      const cell = document.createElement('span');
      cell.className = 'demo__cell';
      row.append(cell);
      const lag = (5 - slot - (slot < 3 ? 1 : 0)) * 0.024;

      // Each run of one glyph across consecutive totals is one element.
      let k = 0;
      while (k < TOTALS.length) {
        const glyph = TOTALS[k][slot];
        let end = k + 1;
        while (end < TOTALS.length && TOTALS[end][slot] === glyph) end += 1;
        if (glyph !== ' ') {
          const el = document.createElement('span');
          el.textContent = glyph;
          cell.append(el);
          const leavesToReset = end === TOTALS.length;
          const out = leavesToReset ? CHANGES[0] : CHANGES[end];
          if (k === 0) {
            track(el, SHOWN, [
              [out + lag, HIDDEN_ABOVE, DIGIT_OUT],
              [CHANGES[0] + lag, SHOWN, DIGIT],
            ]);
          } else {
            const steps = [[CHANGES[k] + lag, SHOWN, DIGIT]];
            steps.push([out + lag, leavesToReset ? HIDDEN_BELOW : HIDDEN_ABOVE, DIGIT_OUT]);
            if (!leavesToReset) steps.push([out + lag + DIGIT_OUT.duration + 0.01, HIDDEN_BELOW, SNAP]);
            track(el, HIDDEN_BELOW, steps);
          }
        }
        k = end;
      }
    });

    // With no tens or hundreds, the sign closes up and the row re-centers.
    const DIGIT_W = 'calc(1ch - .06em)';
    const shift = (n) => ({ transform: `translateX(calc(${n} * ${DIGIT_W}))` });
    const reCenter = (el, n) =>
      track(el, shift(n), [
        [CHANGES[1], shift(0), POP],
        [CHANGES[0], shift(n), LIFT_AWAY],
      ]);
    sign.style.display = 'inline-block';
    reCenter(sign, 2);
    reCenter(row, -1);
    total.append(row);

    // The total catches the value: a small lift and a soft light, then it settles.
    const STILL = { transform: 'scale(1)' };
    track(total, STILL, onEveryCard([
      [TOTAL, { transform: 'scale(1.08)' }, curve(STRONG_OUT, 0.1)],
      [TOTAL + 0.1, STILL, LIFT_AWAY],
    ]));
    track(part('[data-halo]'), { opacity: 0 }, onEveryCard([
      [TOTAL, { opacity: 1 }, curve(STRONG_OUT, 0.1)],
      [TOTAL + 0.16, { opacity: 0 }, curve('cubic-bezier(.33, 0, .67, 1)', 0.55)],
    ]));
  };

  let saved = SETTLED * 1000;
  const seek = (ms) => {
    const now = document.timeline.currentTime;
    for (const a of animations) a.startTime = now - ms;
  };
  const pause = () => {
    if (!animations.length || animations[0].playState === 'paused') return;
    saved = animations[0].currentTime;
    for (const a of animations) a.pause();
  };
  const resume = () => {
    if (animations.length && animations[0].playState === 'paused') seek(saved);
  };

  let onScreen = true;
  let userPaused = false;
  const toggle = document.querySelector('[data-toggle]');
  const sync = () => (onScreen && !document.hidden && !userPaused ? resume() : pause());
  const flip = () => {
    userPaused = !userPaused;
    toggle.textContent = userPaused ? 'Play demo' : 'Pause demo';
    toggle.classList.toggle('is-shown', userPaused);
    sync();
  };

  const start = () => {
    if (animations.length) return;
    scoreCards();
    scoreScanner();
    scoreResults();
    scoreTotal();
    demo.classList.add('is-live');
    seek(saved);
    sync();
  };

  const stop = () => {
    for (const a of animations) a.cancel();
    animations = [];
    demo.classList.remove('is-live');
    demo.querySelector('[data-row]')?.remove();
    saved = SETTLED * 1000;
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(demo);
  document.addEventListener('visibilitychange', sync);
  demo.addEventListener('click', flip);
  toggle.addEventListener('click', flip);
  reduced.addEventListener('change', () => (reduced.matches ? stop() : ready().then(start)));

  // Every card decoded and the total's font in place, so nothing pops in mid-score.
  const ready = () =>
    Promise.all([
      ...cards.map((card) => card.querySelector('img').decode().catch(() => {})),
      document.fonts.load('400 24px Geist', '$0.'),
      document.fonts.load('600 64px Geist', '$0.'),
    ]);

  if (!reduced.matches) ready().then(() => { if (!reduced.matches) start(); });
})();

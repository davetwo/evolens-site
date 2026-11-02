// The hero's scan demonstration, written as one score: every element's motion is a fixed function of loop time
// (Web Animations, transform and opacity only). No script runs per frame, the loop's first and last moments are the
// same by construction, and pausing is one call. Cards and prices are examples from the Figma design, nothing is fetched.
(() => {
  const demo = document.querySelector('[data-demo]');
  if (!demo || !demo.animate) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hasLinear = CSS.supports('animation-timing-function', 'linear(0, 1)');

  // Times in seconds. A card's beats are measured from when it starts to enter.
  const BEAT = 4.3;
  const LOOP = 13.4;
  const STARTS = [0, BEAT, 2 * BEAT];
  const SETTLED = 0.95; // First paint is Darkrai at rest, so the score joins here.
  const DIM = 1.3;
  const NAME = 1.38;
  const VALUE = 1.46;
  const TOTAL = 1.95;
  const RESULT_OUT = 3.85;
  const CARD_OUT = 4;
  const RESET = STARTS[2] + CARD_OUT;

  // Session totals, right-aligned into hundreds, tens, ones, and two decimals. ' ' is an empty slot.
  const TOTALS = ['  0.00', '323.13', '327.45', '352.09'];
  const CHANGES = [RESET, STARTS[0] + TOTAL, STARTS[1] + TOTAL, STARTS[2] + TOTAL];

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
  const SNAP = curve('linear', 0.001);
  const LAND = spring(0.62, 0.82);
  const DETAIL = spring(0.42, 0.86);
  const DIGIT = spring(0.5, 0.9);
  const DIGIT_OUT = curve('cubic-bezier(.23, 1, .32, 1)', 0.22);
  const FADE_IN = curve('cubic-bezier(.23, 1, .32, 1)', 0.16);
  const DIMMING = curve('cubic-bezier(.32, .72, 0, 1)', 0.42);
  const RESULT_EXIT = curve('cubic-bezier(.23, 1, .32, 1)', 0.22);
  const CARD_EXIT = curve('cubic-bezier(.32, .72, 0, 1)', 0.3);
  const AMBIENT = curve('cubic-bezier(.77, 0, .175, 1)', 0.6);

  let animations = [];

  // `steps` are [time, values, curve]; each holds until the next. The last values must equal `from`, closing the loop.
  const track = (el, from, steps) => {
    const frames = [{ offset: 0, ...from, easing: 'linear' }];
    let now = from;
    for (const [t, to, c] of steps) {
      frames.push({ offset: t / LOOP, ...now, easing: c.easing });
      frames.push({ offset: (t + c.duration) / LOOP, ...to, easing: 'linear' });
      now = to;
    }
    frames.push({ offset: 1, ...now });
    animations.push(el.animate(frames, { duration: LOOP * 1000, iterations: Infinity }));
  };

  const scoreCards = () => {
    const ENTER = { transform: 'translateY(92%) scale(.96) rotate(1.2deg)' };
    const REST = { transform: 'translateY(0) scale(1) rotate(0deg)' };
    const LEAVE = { transform: 'translateY(-6%) scale(.97) rotate(0deg)' };
    demo.querySelectorAll('[data-card]').forEach((card, i) => {
      const t = STARTS[i];
      track(card, ENTER, [
        [t, REST, LAND],
        [t + CARD_OUT, LEAVE, CARD_EXIT],
        [t + BEAT + 0.01, ENTER, SNAP],
      ]);
      track(card, { opacity: 0 }, [
        [t, { opacity: 1 }, FADE_IN],
        [t + CARD_OUT, { opacity: 0 }, CARD_EXIT],
      ]);
      track(card.querySelector('img'), { opacity: 1 }, [
        [t + DIM, { opacity: 0.5 }, DIMMING],
        [t + BEAT + 0.01, { opacity: 1 }, SNAP],
      ]);
    });
    track(demo.querySelector('.demo__tint'), { opacity: 0 }, [
      [STARTS[0] + CARD_OUT, { opacity: 1 }, AMBIENT],
      [STARTS[1] + CARD_OUT, { opacity: 0 }, AMBIENT],
    ]);
  };

  const scoreResults = () => {
    const REST = 'translateY(0) scale(1)';
    demo.querySelectorAll('[data-result]').forEach((result, i) => {
      const t = STARTS[i];
      const [name, value] = result.children;
      const parts = [
        [name, NAME, 'translateY(40%) scale(.98)'],
        [value, VALUE, 'translateY(16%) scale(.94)'],
      ];
      for (const [el, at, enter] of parts) {
        const HIDDEN = { transform: enter, opacity: 0 };
        track(el, HIDDEN, [
          [t + at, { transform: REST, opacity: 1 }, DETAIL],
          [t + RESULT_OUT, { transform: 'translateY(-8%) scale(1)', opacity: 0 }, RESULT_EXIT],
          [t + BEAT + 0.01, HIDDEN, SNAP],
        ]);
      }
    });
  };

  // Like the app's .numericText: a digit that changes slides out while its replacement slides in, rightmost first.
  // Counting up moves upward; the reset to a new session moves down.
  const scoreTotal = () => {
    const total = demo.querySelector('[data-total]');
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
      const lag = (5 - slot - (slot < 3 ? 1 : 0)) * 0.034;

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
        [CHANGES[1], shift(0), DETAIL],
        [CHANGES[0], shift(n), DETAIL],
      ]);
    sign.style.display = 'inline-block';
    reCenter(sign, 2);
    reCenter(row, -1);
    total.append(row);
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
      ...[...demo.querySelectorAll('[data-card] img')].map((img) => img.decode().catch(() => {})),
      document.fonts.load('400 24px Geist', '$0.'),
      document.fonts.load('600 64px Geist', '$0.'),
    ]);

  if (!reduced.matches) ready().then(() => { if (!reduced.matches) start(); });
})();

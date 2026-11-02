import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Scenario = 'context' | 'recovery' | 'correction' | 'evaluation';
type Props = {
  onClose: (restoreFocus?: boolean) => void;
  onScenario: (scenario: Scenario) => void;
  threshold: number;
  approved: boolean;
  post: 'ready' | 'unknown' | 'verified';
  corrected: boolean;
  candidate: string;
};

const steps: { title: string; target: string; scenario?: Scenario; explanation: string; action: string }[] = [
  {
    title: 'One fictional invoice', target: 'invoice',
    explanation: 'I chose printer maintenance so the exception is easy to follow. The entity, vendor and invoice number identify this invoice. Changing its amount or coding should not create a new invoice.',
    action: 'This is synthetic data. Nothing here is sent to a real accounting system.',
  },
  {
    title: 'A changed policy needs a new approval', target: 'context', scenario: 'context',
    explanation: 'An approval covers the policy used at the time. I made a policy change invalidate the earlier approval instead of silently reusing it.',
    action: 'Try approving as operator, then change the threshold to ₹1,000. This ₹1,250 invoice then needs controller review.',
  },
  {
    title: 'No response is an unknown outcome', target: 'recovery', scenario: 'recovery',
    explanation: 'A timeout cannot tell the sender whether a write happened. I kept the invoice identity stable so recovery checks the same invoice instead of sending a new one.',
    action: 'Try Send · lose response, then Check the receipt. The result here is simulated. Inspect recorded HTTP run for the separate process-and-store experiment.',
  },
  {
    title: 'A correction is not future policy', target: 'correction', scenario: 'correction',
    explanation: 'I kept a one-off fix separate from a future rule. A rule needs testing, review and explicit activation, with a narrow scope.',
    action: 'Try the one-off correction. Continue through the actual controls to compare a matching invoice and a different purpose, then withdraw. You can also move on without changing anything.',
  },
  {
    title: 'Look at recorded comparisons', target: 'evaluation', scenario: 'evaluation',
    explanation: 'The guide does not rerun these experiments. Open the recorded evaluation and separate frozen challenge; keep their case counts separate. Both versions passed the six challenge cases, so that result did not establish improvement.',
    action: 'Open the model proposals too: a valid format still needed review. These are recorded synthetic examples, not production results. Loading or unavailable records are not successful runs.',
  },
  {
    title: 'What I built, and where AI helped', target: 'approach',
    explanation: 'I set the brief and used Codex to build and test this exercise. The code and recorded results are here to inspect. I am learning to explain the decisions and their limits.',
    action: 'A possible next step is to observe a real operator and agree what needs human review before a pilot. That depends on real customer access.',
  },
];

export default function GuidedWalkthrough({ onClose, onScenario, threshold, approved, post, corrected, candidate }: Props) {
  const [step, setStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [targetAvailable, setTargetAvailable] = useState(true);
  const [showTarget, setShowTarget] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const current = steps[step];

  useEffect(() => {
    document.documentElement.dataset.walkthroughActive = 'true';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    const presentation = () => onClose(false);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const stopMotion = () => { if (motion.matches) window.scrollTo({ top: window.scrollY, behavior: 'instant' }); };
    motion.addEventListener('change', stopMotion);
    document.addEventListener('keydown', escape);
    window.addEventListener('zerogrunt:presentation-start', presentation);
    return () => {
      delete document.documentElement.dataset.walkthroughActive;
      motion.removeEventListener('change', stopMotion);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('zerogrunt:presentation-start', presentation);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-tour-target="${current.target}"]`);
    const actions = target?.closest('.lab-content')?.querySelector<HTMLElement>('.lab-actions');
    let highlighted: HTMLElement | null = null;
    let resizeFrame = 0;
    setTargetAvailable(Boolean(target));

    function fit() {
      if (!target || !panel.current) return;
      if (actions) {
        const copy = panel.current.querySelector<HTMLElement>('.walkthrough-copy');
        const dock = panel.current.getBoundingClientRect();
        const chromeHeight = dock.height - (copy?.getBoundingClientRect().height || 0);
        const bottom = parseFloat(getComputedStyle(panel.current).bottom) || 16;
        const roomForDock = window.innerHeight - actions.getBoundingClientRect().height - bottom - 24;
        // Reserve room for the complete action group without shrinking text or hit targets.
        const cap = roomForDock >= chromeHeight + 80 ? Math.min(window.innerHeight * 0.6, roomForDock) : window.innerHeight * 0.6;
        const maxHeight = `${cap}px`;
        if (panel.current.style.maxHeight !== maxHeight) panel.current.style.maxHeight = maxHeight;
      } else panel.current.style.maxHeight = '';
      const dockTop = panel.current.getBoundingClientRect().top;
      let anchor = target;
      let offset = 24;
      if (actions) {
        const state = target.getBoundingClientRect();
        const controls = actions.getBoundingClientRect();
        const groupHeight = Math.max(state.bottom, controls.bottom) - state.top;
        if (groupHeight + offset + 16 > dockTop) {
          // Keep the real controls reachable when state + actions cannot fit together.
          anchor = actions;
          offset = Math.max(8, Math.min(24, dockTop - controls.height - 16));
          if (controls.height + offset + 8 > dockTop) {
            anchor = actions.querySelector<HTMLButtonElement>('button') || actions;
          }
        }
      }
      if (highlighted !== anchor) {
        highlighted?.removeAttribute('data-walkthrough-current');
        highlighted = anchor;
        highlighted.setAttribute('data-walkthrough-current', 'true');
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, window.scrollY + anchor.getBoundingClientRect().top - offset), behavior: reduce ? 'instant' : 'smooth' });
    }

    const copy = heading.current?.closest('.walkthrough-copy');
    if (copy) copy.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(fit);
    const queueFit = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(fit);
    };
    const observer = new ResizeObserver(queueFit);
    window.addEventListener('resize', queueFit);
    if (target) observer.observe(target);
    if (actions) observer.observe(actions);
    if (panel.current) observer.observe(panel.current);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      window.removeEventListener('resize', queueFit);
      highlighted?.removeAttribute('data-walkthrough-current');
    };
  }, [current, showTarget]);

  function go(index: number) {
    const next = steps[index];
    if (next.scenario) onScenario(next.scenario);
    setCollapsed(false);
    setStep(index);
  }

  let hint = '';
  if (step === 1) hint = threshold === 100000
    ? `The lab is already using the ₹1,000 threshold. ${approved ? 'It has a current controller approval.' : 'It needs controller review.'} Use Reset lab to replay from the original policy.`
    : approved ? 'The current policy has an operator approval. Try changing the threshold.' : 'The invoice is awaiting operator review.';
  if (step === 2) hint = post === 'verified'
    ? 'The simulated receipt is now verified. This is not a live ERP receipt.'
    : post === 'unknown' ? 'The current simulated outcome is unknown. Check the receipt using the existing button.' : 'The simulation is ready to send. No posting action has been taken by the guide.';
  if (step === 3) hint = corrected
    ? `The one-off correction is applied. ${candidate === 'none' ? 'No future rule has been proposed.' : `The control candidate is ${candidate}.`} This lifecycle does not establish measured improvement.`
    : 'The original OFFICE-OPS proposal is unchanged. The guide has not corrected or activated anything.';

  return <section ref={panel} className={`walkthrough${collapsed ? ' walkthrough-collapsed' : ''}`} role="region" aria-label="Guided walkthrough">
    <div className="walkthrough-top"><span className="walkthrough-progress" role="status">Step {step + 1} of {steps.length}</span><button type="button" className="quiet-button" aria-label="Exit walkthrough" onClick={() => onClose()}>Exit</button></div>
    {collapsed ? <><h3 ref={heading} tabIndex={-1}>{current.title}</h3><button type="button" className="button outline" aria-expanded={false} onClick={() => { setCollapsed(false); setShowTarget((value) => value + 1); }}>Show guide</button></> : <>
      <div className="walkthrough-copy"><h3 ref={heading} tabIndex={-1}>{current.title}</h3><p>{current.explanation}</p><p className="walkthrough-action">{current.action}</p>{hint && <p className="walkthrough-hint">{hint}</p>}{!targetAvailable && <p className="walkthrough-hint">This part is unavailable in the current view. You can move on or exit.</p>}</div>
      <div className="walkthrough-navigation"><button type="button" className="button outline" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>{step < steps.length - 1 ? <button type="button" className="button dark-button" onClick={() => go(step + 1)}>Next</button> : <button type="button" className="button dark-button" onClick={() => onClose()}>Finish</button>}</div>
      <div className="walkthrough-tools"><button type="button" className="quiet-button" onClick={() => setShowTarget((value) => value + 1)}>Show section</button><button type="button" className="quiet-button" aria-label="Collapse guide" aria-expanded={true} onClick={() => setCollapsed(true)}>Collapse</button></div>
    </>}
  </section>;
}

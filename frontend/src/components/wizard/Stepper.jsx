export default function Stepper({ currentStep, totalSteps = 3, t }) {
  return (
    <div className="flex items-center gap-1 mb-11">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        
        let barClass = "w-0";
        if (isDone) barClass = "w-full";
        if (isCurrent) barClass = "w-1/2";
        
        return (
          <div key={stepNum} className={`flex-1 flex flex-col gap-2 relative step-dot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
            <div className="h-[3px] bg-line rounded-[3px] overflow-hidden">
              <i className={`block h-full bg-sprout transition-all duration-300 ${barClass}`}></i>
            </div>
            <label className={`text-[0.7rem] uppercase tracking-[1px] font-semibold ${isCurrent ? 'text-turmeric' : 'text-text-dim'}`}>
              {t ? t(`wizard.step.${stepNum}`) : `Step ${stepNum}`}
            </label>
          </div>
        );
      })}
    </div>
  );
}

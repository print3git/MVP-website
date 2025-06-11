const STAGE_KEY = 'wizardStage';

export function setWizardStage(stage) {
  try {
    localStorage.setItem(STAGE_KEY, stage);
  } catch {
    /* ignore quota errors */
  }
  updateWizard();
}

export function updateWizard() {
  const stage = localStorage.getItem(STAGE_KEY) || 'prompt';
  const order = ['prompt', 'building', 'print', 'purchase'];
  const map = {
    prompt: 'wizard-step-prompt',
    building: 'wizard-step-building',
    print: 'wizard-step-print',
    purchase: 'wizard-step-purchase',
  };
  const idx = order.indexOf(stage);
  order.forEach((key, i) => {
    const el = document.getElementById(map[key]);
    if (!el) return;
    if (i < idx) {
      // Completed steps turn blue
      el.classList.remove('opacity-50');
      el.classList.add('bg-[#30D5C8]', 'text-[#1A1A1D]');
    } else if (i === idx) {
      // Current step is highlighted but not blue
      el.classList.remove('opacity-50', 'bg-[#30D5C8]', 'text-[#1A1A1D]');
    } else {
      // Future steps are dimmed
      el.classList.add('opacity-50');
      el.classList.remove('bg-[#30D5C8]', 'text-[#1A1A1D]');
    }
  });
}

document.addEventListener('DOMContentLoaded', updateWizard);
window.setWizardStage = setWizardStage;

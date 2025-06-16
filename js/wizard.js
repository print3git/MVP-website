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
  let stage = localStorage.getItem(STAGE_KEY) || 'prompt';
  if (stage === 'print') stage = 'purchase';
  const order = ['prompt', 'building', 'purchase'];
  const map = {
    prompt: 'wizard-step-prompt',
    building: 'wizard-step-building',
    purchase: 'wizard-step-purchase',
  };
  const idx = order.indexOf(stage);
  order.forEach((key, i) => {
    const el = document.getElementById(map[key]);
    if (!el) return;
    el.classList.remove('bg-[#30D5C8]', 'bg-[#2A2A2E]', 'text-[#1A1A1D]', 'opacity-50');
    if (i < idx) {
      // Completed steps turn blue
      el.classList.add('bg-[#30D5C8]', 'text-[#1A1A1D]');
    } else if (i === idx) {
      // Current step highlighted in grey
      el.classList.add('bg-[#2A2A2E]');
    } else {
      // Future steps have no background
      el.classList.remove('bg-[#2A2A2E]', 'bg-[#30D5C8]');
    }
  });

  const slots = document.getElementById('wizard-slots');
  if (slots) {
    if (idx >= 2) slots.classList.remove('hidden');
    else slots.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', updateWizard);
window.setWizardStage = setWizardStage;
export function setWizardSlotCount(n) {
  const el = document.getElementById('wizard-slots');
  if (el) el.textContent = `Only ${n} print slots remaining`;
}
window.setWizardSlotCount = setWizardSlotCount;

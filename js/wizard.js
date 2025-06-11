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
  const map = {
    prompt: 'wizard-step-prompt',
    building: 'wizard-step-building',
    print: 'wizard-step-print',
    purchase: 'wizard-step-purchase',
  };
  Object.entries(map).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === stage) {
      el.classList.remove('opacity-50');
    } else {
      el.classList.add('opacity-50');
    }
  });
}

document.addEventListener('DOMContentLoaded', updateWizard);
window.setWizardStage = setWizardStage;

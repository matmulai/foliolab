import { SourceType } from "@shared/schema";

const WIZARD_STORAGE_KEY = "foliolab_wizard_state";

export interface WizardState {
  selectedSources: SourceType[];
  currentStep: number;
  completedSources: SourceType[];
  totalSteps: number;
  startedAt: string;
}

export function getWizardState(): WizardState | null {
  try {
    const data = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading wizard state:', error);
    return null;
  }
}

export function saveWizardState(state: WizardState) {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving wizard state:', error);
    throw error;
  }
}

export function initializeWizardState(selectedSources: SourceType[]): WizardState {
  const state: WizardState = {
    selectedSources,
    currentStep: 1, // Start at step 1 (source selection is step 0)
    completedSources: [],
    totalSteps: selectedSources.length + 2, // sources + selection page + preview
    startedAt: new Date().toISOString()
  };
  saveWizardState(state);
  return state;
}

export function updateWizardStep(step: number) {
  const state = getWizardState();
  if (!state) return;
  state.currentStep = step;
  saveWizardState(state);
}

export function markSourceComplete(source: SourceType) {
  const state = getWizardState();
  if (!state) return;

  if (!state.completedSources.includes(source)) {
    state.completedSources.push(source);
  }
  saveWizardState(state);
}

export function clearWizardState() {
  localStorage.removeItem(WIZARD_STORAGE_KEY);
}

export function getNextIncompleteSource(): SourceType | null {
  const state = getWizardState();
  if (!state) return null;

  return state.selectedSources.find(
    source => !state.completedSources.includes(source)
  ) || null;
}

export function isWizardComplete(): boolean {
  const state = getWizardState();
  if (!state) return false;

  return state.completedSources.length === state.selectedSources.length;
}

import { useRef } from "react";
import { GraphQLClient } from 'graphql-request';
import { requestSeedRecord, runSeedPhases, validateConcertsSeed } from "../utils/seedRecords";
import { startOnboarding, completeOnboarding } from '../actions/onboarding';
import { TemplateType, OnboardingStep } from './useOnboardingState';

const GRAPHQL_ENDPOINT = '/api/graphql';

interface OnboardingApiProps {
  selectedTemplate: TemplateType;
  currentJsonData: any;
  completedItems: Record<string, string[]>;
  setProgress: (message: string) => void;
  setItemLoading: (type: string, item: string) => void;
  setItemCompleted: (type: string, item: string) => void;
  setItemError: (type: string, item: string, errorMessage: string) => void;
  setStep: (step: OnboardingStep) => void;
  setError: (error: string | null) => void;
  setSettingsReview: (review: { reused: boolean; checkedFields: string[]; mismatchedFields: string[] }) => void;
  setIsLoading: (loading: boolean) => void;
  resetOnboardingState: () => void;
}

// Ordered phases: parents before children. Every record goes through the seedConcerts mutation.
const PHASES: Array<{ type: string; label: string; section: string; name: (row: any) => string }> = [
  { type: 'roles', label: 'roles', section: 'role', name: (r) => r.name },
  { type: 'paymentProviders', label: 'payment providers', section: 'provider', name: (r) => r.name },
  { type: 'venues', label: 'venues and seating charts', section: 'venue', name: (r) => r.name },
  { type: 'agencies', label: 'agencies', section: 'agency', name: (r) => r.name },
  { type: 'artists', label: 'artists', section: 'artist', name: (r) => r.name },
  { type: 'tours', label: 'tours', section: 'tour', name: (r) => r.name },
  { type: 'events', label: 'events, deals and pricing', section: 'event', name: (r) => r.title },
  { type: 'dateHolds', label: 'calendar holds', section: 'dateHold', name: (r) => `${r.venue} #${r.rank}` },
  { type: 'promoCodes', label: 'promo codes', section: 'promo', name: (r) => r.code },
];

export function useOnboardingApi(props: OnboardingApiProps) {
  const { currentJsonData, setProgress, setItemLoading, setItemCompleted, setItemError, setStep, setError, setSettingsReview, setIsLoading, resetOnboardingState } = props;
  const running = useRef(false);

  const runOnboarding = async () => {
    if (running.current) return;
    running.current = true;
    setIsLoading(true);
    setError(null);
    resetOnboardingState();
    setStep('progress');
    setProgress('Starting setup...');
    try {
      validateConcertsSeed(currentJsonData);
      const client = new GraphQLClient(GRAPHQL_ENDPOINT, { headers: { 'Content-Type': 'application/json' } });
      const one = async (type: string, section: string, label: string, data: any) => {
        setItemLoading(type, label);
        try { await requestSeedRecord(client, section, data); setItemCompleted(type, label); }
        catch (e: any) {
          const message = e.response?.errors?.map((x: any) => x.message).join('\n') || e.message || 'Unknown error';
          setItemError(type, label, message); throw new Error(message);
        }
      };
      const phases: Array<() => Promise<unknown>> = [
        async () => {
          setProgress('Saving promoter settings...');
          await one('storeInfo', 'settings', currentJsonData.storeInfo.name, currentJsonData.storeInfo);
          setSettingsReview({ reused: false, checkedFields: Object.keys(currentJsonData.storeInfo), mismatchedFields: [] });
        },
        ...PHASES.map((phase) => async () => {
          const rows: any[] = currentJsonData[phase.type] || [];
          if (!rows.length) return;
          setProgress(`Saving ${phase.label}...`);
          for (const row of rows) await one(phase.type, phase.section, phase.name(row), row);
        }),
      ];
      await runSeedPhases(startOnboarding, phases, completeOnboarding);
      setProgress('Setup saved.');
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Setup failed');
      setStep('progress');
    } finally {
      running.current = false;
      setIsLoading(false);
    }
  };
  return { runOnboarding };
}

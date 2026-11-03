import { Building2, Package, CircleCheck } from 'lucide-react';

export type SetupTemplate = 'full' | 'minimal' | 'custom';
export const SECTION_TYPES = ['storeInfo', 'roles', 'paymentProviders', 'venues', 'agencies', 'artists', 'tours', 'events', 'dateHolds', 'promoCodes'] as const;
export type SectionType = typeof SECTION_TYPES[number];

export interface ConcertsTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const CONCERTS_TEMPLATES: Record<SetupTemplate, ConcertsTemplate> = {
  full: { name: 'Complete Setup', description: 'Venues with seating charts, talent, tours, events with deals, completed shows with settlements.', icon: <Building2 className="h-5 w-5" /> },
  minimal: { name: 'Basic Setup', description: 'One general-admission venue, one artist and one event with a flat deal.', icon: <Package className="h-5 w-5" /> },
  custom: { name: 'Custom Setup', description: 'Customize your setup with your own JSON for each section.', icon: <CircleCheck className="h-5 w-5" /> },
};
// Retained export names used by the Restaurant-structured components.
export const RESTAURANT_TEMPLATES = CONCERTS_TEMPLATES;

export interface SectionDefinition {
  id: number;
  type: string;
  label: string;
  getItemsFn?: (template: SetupTemplate) => string[];
}

export const SECTION_DEFINITIONS: SectionDefinition[] = [
  { id: 1, type: 'storeInfo', label: 'Promoter Settings' },
  { id: 2, type: 'roles', label: 'Roles' },
  { id: 3, type: 'paymentProviders', label: 'Payment Providers' },
  { id: 4, type: 'venues', label: 'Venues and Seating Charts' },
  { id: 5, type: 'agencies', label: 'Agencies' },
  { id: 6, type: 'artists', label: 'Artists' },
  { id: 7, type: 'tours', label: 'Tours' },
  { id: 8, type: 'events', label: 'Events, Deals and Pricing' },
  { id: 9, type: 'dateHolds', label: 'Calendar Holds' },
  { id: 10, type: 'promoCodes', label: 'Promo and Presale Codes' },
];
export const STORE_TEMPLATES = CONCERTS_TEMPLATES;

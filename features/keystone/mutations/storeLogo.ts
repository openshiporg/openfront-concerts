import { DEFAULT_STORE_LOGO_COLOR, DEFAULT_STORE_LOGO_ICON } from '../../platform/store-settings/lib/store-logo';

export const storeLogoTypeDefs = `
  type StoreLogo { logoIcon: String! logoColor: String! name: String! supportEmail: String! supportPhone: String! refundPolicy: String! }
  extend type Query { storeLogo: StoreLogo! }
`;

// The storefront's mark and the promoter's public name: the promoter settings record's logo, or this vertical's registry default before setup.
export async function storeLogo(_root: unknown, _args: unknown, context: any) {
  const row = await context.prisma.storeSettings.findFirst({ select: { logoIcon: true, logoColor: true, name: true, supportEmail: true, supportPhone: true, refundPolicy: true } });
  return { logoIcon: row?.logoIcon || DEFAULT_STORE_LOGO_ICON, logoColor: row?.logoColor || DEFAULT_STORE_LOGO_COLOR, name: row?.name || 'Concerts', supportEmail: row?.supportEmail || '', supportPhone: row?.supportPhone || '', refundPolicy: row?.refundPolicy || '' };
}

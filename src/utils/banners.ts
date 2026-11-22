export type BannerSlotId = 'hero' | 'refer' | 'dashboard';
export type BannerTextTheme = 'light' | 'dark';

export interface BannerSlotConfig {
  imageDataUrl: string | null;
  textTheme: BannerTextTheme;
}

export type CustomBannersState = Record<BannerSlotId, BannerSlotConfig>;

export const CUSTOM_BANNERS_STORAGE_KEY = 'etb_custom_banners_v1';

export const DEFAULT_BANNERS_STATE: CustomBannersState = {
  hero: {imageDataUrl: null, textTheme: 'light'},
  refer: {imageDataUrl: null, textTheme: 'dark'},
  dashboard: {imageDataUrl: null, textTheme: 'light'},
};

export function readCustomBanners(): CustomBannersState {
  try {
    const raw = localStorage.getItem(CUSTOM_BANNERS_STORAGE_KEY);
    if (!raw) return DEFAULT_BANNERS_STATE;
    const parsed = JSON.parse(raw) as Partial<CustomBannersState>;
    return {
      hero: {
        imageDataUrl:
          typeof parsed.hero?.imageDataUrl === 'string'
            ? parsed.hero.imageDataUrl
            : null,
        textTheme: parsed.hero?.textTheme === 'dark' ? 'dark' : 'light',
      },
      refer: {
        imageDataUrl:
          typeof parsed.refer?.imageDataUrl === 'string'
            ? parsed.refer.imageDataUrl
            : null,
        textTheme: parsed.refer?.textTheme === 'light' ? 'light' : 'dark',
      },
      dashboard: {
        imageDataUrl:
          typeof parsed.dashboard?.imageDataUrl === 'string'
            ? parsed.dashboard.imageDataUrl
            : null,
        textTheme: parsed.dashboard?.textTheme === 'dark' ? 'dark' : 'light',
      },
    };
  } catch {
    return DEFAULT_BANNERS_STATE;
  }
}

export function saveCustomBanners(state: CustomBannersState): boolean {
  try {
    localStorage.setItem(CUSTOM_BANNERS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

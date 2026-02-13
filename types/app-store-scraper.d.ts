declare module 'app-store-scraper' {
  export interface App {
    id: number;
    appId: string;
    title: string;
    url: string;
    description: string;
    icon: string;
    genres: string[];
    genreIds: string[];
    primaryGenre: string;
    primaryGenreId: number;
    contentRating: string;
    languages: string[];
    size: string;
    requiredOsVersion: string;
    released: string;
    updated: string;
    releaseNotes: string;
    version: string;
    price: number;
    currency: string;
    free: boolean;
    developerId: number;
    developer: string;
    developerUrl: string;
    developerWebsite: string;
    score: number;
    reviews: number;
    currentVersionScore: number;
    currentVersionReviews: number;
    screenshots: string[];
    ipadScreenshots: string[];
    appletvScreenshots: string[];
    supportedDevices: string[];
  }

  export interface Review {
    id: string;
    userName: string;
    userUrl: string;
    version: string;
    score: number;
    title: string;
    text: string;
    url: string;
    updated: string;
  }

  export interface ListOptions {
    category?: number;
    collection?: string;
    country?: string;
    num?: number;
    fullDetail?: boolean;
  }

  export interface ReviewOptions {
    id?: number;
    appId?: string;
    country?: string;
    sort?: string;
    page?: number;
    num?: number;
  }

  export function list(options: ListOptions): Promise<App[]>;
  export function reviews(options: ReviewOptions): Promise<Review[]>;
  export function app(options: { id?: number; appId?: string; country?: string }): Promise<App>;

  export const collection: {
    TOP_FREE_IOS: string;
    TOP_PAID_IOS: string;
    TOP_FREE_IPAD: string;
    TOP_PAID_IPAD: string;
    NEW_IOS: string;
    NEW_FREE_IOS: string;
    NEW_PAID_IOS: string;
  };

  export const sort: {
    RECENT: string;
    HELPFUL: string;
  };
}

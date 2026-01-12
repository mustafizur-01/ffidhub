export type LoginMethod = 'FB' | 'Google' | 'VK';

export interface IdListing {
  id: string;
  id_level: number;
  login_method: LoginMethod;
  key_items: string;
  price: number;
  contact_number: string;
  image_url: string | null;
  is_email_binded: boolean;
  binded_email: string | null;
  security_code: string | null;
  seller_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerifiedMember {
  id: string;
  email: string;
  member_code: string;
  created_at: string;
}

export interface ListingFilters {
  search: string;
  minPrice: number | null;
  maxPrice: number | null;
  loginMethod: LoginMethod | null;
}

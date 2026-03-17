export interface ReferredCustomer {
  id: string;
  name: string;
  email: string;
}

export interface Introducer {
  id: string;
  name: string;
  nameInitial: string;
  email: string;
  phone: string;
  industry: string;
  companyName?: string;
  location: string;
  referredCustomers: ReferredCustomer[];
  othersCount?: number;
}

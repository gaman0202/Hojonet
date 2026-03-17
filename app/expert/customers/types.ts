// Types for Customers Page

export interface Customer {
  id: string;
  name: string;
  nameInitial: string; // First character of last name for avatar
  email: string;
  phone: string;
  company: string;
  industry: string;
  location: string;
  activeCases: number; // Number of cases in progress
}

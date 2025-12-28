import { Agent, Campaign, Lead } from '../types';

export const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Sarah (Sales)',
    tone: 'Professional & Friendly',
    productDescription: 'Enterprise CRM Software',
    goal: 'Book a demo',
    script: {
      opening: "Hi, this is Sarah calling from Nexus CRM. We help companies scale their sales 10x. Do you have 30 seconds?",
      closing: "Fantastic, I've marked you down for Tuesday at 2 PM. Have a great day!",
      objectionHandling: "I totally get that you're busy. This will literally take 10 minutes to show you how to save 10 hours a week."
    },
    createdAt: '2023-10-01'
  },
  {
    id: '2',
    name: 'Mike (Renewal)',
    tone: 'Urgent but Polite',
    productDescription: 'Auto Insurance Policy',
    goal: 'Renew policy',
    script: {
      opening: "Hello, this is Mike regarding your upcoming policy expiration. I wanted to make sure you stay covered.",
      closing: "Great, I've processed the renewal. You're all set for another year.",
      objectionHandling: "I understand the price concern. We actually have a loyalty discount applied this year."
    },
    createdAt: '2023-10-15'
  }
];

export const MOCK_LEADS: Lead[] = [
  { id: '1', name: 'Alice Johnson', phone: '+15550101', city: 'New York', status: 'Qualified', score: 85 },
  { id: '2', name: 'Bob Smith', phone: '+15550102', city: 'Los Angeles', status: 'New', score: 0 },
  { id: '3', name: 'Charlie Brown', phone: '+15550103', city: 'Chicago', status: 'Contacted', score: 45 },
  { id: '4', name: 'Diana Prince', phone: '+15550104', city: 'Seattle', status: 'Converted', score: 95 },
  { id: '5', name: 'Evan Wright', phone: '+15550105', city: 'Austin', status: 'Lost', score: 10 },
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Q4 Outreach', agentId: '1', status: 'Active', leadsCount: 500, callsMade: 125, progress: 25 },
  { id: '2', name: 'Renewal Blast', agentId: '2', status: 'Completed', leadsCount: 200, callsMade: 200, progress: 100 },
];

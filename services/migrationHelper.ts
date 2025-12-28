// Migration Helper: Run this in browser console to migrate existing localStorage data to Firestore
// This is a one-time migration script

export const migrateLocalStorageToFirestore = async (userId: string) => {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }

  const { storage } = await import('./storageService');
  
  console.log('Starting migration for user:', userId);

  try {
    // Get all data from localStorage
    const agents = JSON.parse(localStorage.getItem(`vm_${userId}_agents`) || '[]');
    const leads = JSON.parse(localStorage.getItem(`vm_${userId}_leads`) || '[]');
    const campaigns = JSON.parse(localStorage.getItem(`vm_${userId}_campaigns`) || '[]');
    const logs = JSON.parse(localStorage.getItem(`vm_${userId}_logs`) || '[]');

    console.log('Found data:', { agents: agents.length, leads: leads.length, campaigns: campaigns.length, logs: logs.length });

    // Save to Firestore
    if (agents.length > 0) {
      await storage.saveAgents(userId, agents);
      console.log('✓ Migrated agents');
    }
    
    if (leads.length > 0) {
      await storage.saveLeads(userId, leads);
      console.log('✓ Migrated leads');
    }
    
    if (campaigns.length > 0) {
      await storage.saveCampaigns(userId, campaigns);
      console.log('✓ Migrated campaigns');
    }
    
    if (logs.length > 0) {
      await storage.saveLogs(userId, logs);
      console.log('✓ Migrated logs');
    }

    console.log('✓ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// To use: Open browser console and run:
// import { migrateLocalStorageToFirestore } from './services/migrationHelper';
// migrateLocalStorageToFirestore('your-user-id');

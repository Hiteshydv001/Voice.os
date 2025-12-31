import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface DailyTrafficData {
  name: string;
  calls: number;
  conversions: number;
  date: string; // YYYY-MM-DD format
}

export interface WeeklyTrafficData {
  userId: string;
  weekStart: string; // ISO date string
  weekEnd: string;
  days: {
    MON: { calls: number; conversions: number; date: string };
    TUE: { calls: number; conversions: number; date: string };
    WED: { calls: number; conversions: number; date: string };
    THU: { calls: number; conversions: number; date: string };
    FRI: { calls: number; conversions: number; date: string };
    SAT: { calls: number; conversions: number; date: string };
    SUN: { calls: number; conversions: number; date: string };
  };
  lastUpdated: string;
}

// Get the start of the current week (Monday)
const getWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Get the day name from date
const getDayName = (date: Date): keyof WeeklyTrafficData['days'] => {
  const days: (keyof WeeklyTrafficData['days'])[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[date.getDay()];
};

// Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Initialize weekly traffic data for a user
const initializeWeeklyData = (): WeeklyTrafficData['days'] => {
  const weekStart = getWeekStart();
  const days: WeeklyTrafficData['days'] = {} as WeeklyTrafficData['days'];
  
  ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((day, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    days[day as keyof WeeklyTrafficData['days']] = {
      calls: 0,
      conversions: 0,
      date: formatDate(date)
    };
  });
  
  return days;
};

// Get the document reference for current week
const getWeekDocRef = (userId: string) => {
  const weekStart = getWeekStart();
  const weekId = formatDate(weekStart);
  return doc(db, 'users', userId, 'trafficAnalytics', weekId);
};

/**
 * Track a new call in the traffic analytics
 * @param userId - The user's ID
 * @param isConversion - Whether this call resulted in a conversion/qualified lead
 */
export const trackCall = async (userId: string, isConversion: boolean = false) => {
  if (!userId) {
    console.error('trackCall: No userId provided');
    return;
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const docRef = getWeekDocRef(userId);
    const docSnap = await getDoc(docRef);
    
    const today = new Date();
    const dayName = getDayName(today);
    const todayDate = formatDate(today);
    
    if (!docSnap.exists()) {
      // Create new week document
      const newWeekData: WeeklyTrafficData = {
        userId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        days: initializeWeeklyData(),
        lastUpdated: new Date().toISOString()
      };
      
      // Update today's data
      newWeekData.days[dayName].calls = 1;
      newWeekData.days[dayName].conversions = isConversion ? 1 : 0;
      
      await setDoc(docRef, newWeekData);
    } else {
      // Update existing week document
      const data = docSnap.data() as WeeklyTrafficData;
      
      // Ensure the day structure exists
      if (!data.days[dayName]) {
        data.days[dayName] = {
          calls: 0,
          conversions: 0,
          date: todayDate
        };
      }
      
      // Increment calls and conversions
      data.days[dayName].calls += 1;
      if (isConversion) {
        data.days[dayName].conversions += 1;
      }
      data.lastUpdated = new Date().toISOString();
      
      await setDoc(docRef, data);
    }
    
    console.log(`✅ Traffic tracked: ${dayName} - Call ${isConversion ? '(Conversion)' : ''}`);
  } catch (error) {
    console.error('Error tracking call in traffic analytics:', error);
  }
};

/**
 * Get current week's traffic data (one-time fetch)
 * @param userId - The user's ID
 */
export const getWeeklyTraffic = async (userId: string): Promise<DailyTrafficData[]> => {
  if (!userId) {
    console.error('getWeeklyTraffic: No userId provided');
    return [];
  }

  try {
    const docRef = getWeekDocRef(userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Return empty data for the current week
      const days = initializeWeeklyData();
      return Object.entries(days).map(([name, data]) => ({
        name,
        calls: data.calls,
        conversions: data.conversions,
        date: data.date
      }));
    }
    
    const data = docSnap.data() as WeeklyTrafficData;
    return Object.entries(data.days).map(([name, dayData]) => ({
      name,
      calls: dayData.calls,
      conversions: dayData.conversions,
      date: dayData.date
    }));
  } catch (error) {
    console.error('Error fetching weekly traffic:', error);
    return [];
  }
};

/**
 * Subscribe to real-time updates for current week's traffic data
 * @param userId - The user's ID
 * @param callback - Function to call when data updates
 * @returns Unsubscribe function
 */
export const subscribeToWeeklyTraffic = (
  userId: string,
  callback: (data: DailyTrafficData[]) => void
): Unsubscribe => {
  if (!userId) {
    console.error('subscribeToWeeklyTraffic: No userId provided');
    return () => {};
  }

  // Ensure the client is authenticated and matches the userId required by security rules
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.warn('subscribeToWeeklyTraffic: Authentication not ready or UID mismatch', { authUid: auth.currentUser?.uid, userId });

    // If there is no current user yet, wait for auth to initialize and then subscribe
    let authUnsub: (() => void) | null = null;
    if (!auth.currentUser) {
      const onAuth = onAuthStateChanged(auth, (user) => {
        if (user && user.uid === userId) {
          // Auth ready and matches required UID: re-run subscribeToWeeklyTraffic by calling back into the API
          authUnsub && authUnsub();
          // We re-call subscribeToWeeklyTraffic to set up the actual listener
          subscribeToWeeklyTraffic(userId, callback);
        }
      });
      authUnsub = () => onAuth();
    }

    // Return empty data and unsubscribe that will cancel auth listener as needed
    const days = initializeWeeklyData();
    const emptyData = Object.entries(days).map(([name, data]) => ({
      name,
      calls: data.calls,
      conversions: data.conversions,
      date: data.date
    }));
    callback(emptyData);

    return () => {
      if (authUnsub) authUnsub();
    };
  }

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekId = formatDate(weekStart);
  
  console.log(`📊 Subscribing to traffic analytics: users/${userId}/trafficAnalytics/${weekId}`);
  
  const docRef = getWeekDocRef(userId);
  
  // Try to initialize the document first if it doesn't exist
  getDoc(docRef).then((docSnap) => {
    if (!docSnap.exists()) {
      console.log('📊 Initializing new week document...');
      const newWeekData: WeeklyTrafficData = {
        userId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        days: initializeWeeklyData(),
        lastUpdated: new Date().toISOString()
      };
      return setDoc(docRef, newWeekData);
    }
  }).catch((error) => {
    console.warn('📊 Could not initialize week document:', error);
  });
  
  return onSnapshot(docRef, (snapshot) => {
    console.log(`📊 Snapshot received. Exists: ${snapshot.exists()}`);
    
    if (!snapshot.exists()) {
      // Return empty data for the current week
      const days = initializeWeeklyData();
      const emptyData = Object.entries(days).map(([name, data]) => ({
        name,
        calls: data.calls,
        conversions: data.conversions,
        date: data.date
      }));
      callback(emptyData);
      return;
    }
    
    const data = snapshot.data() as WeeklyTrafficData;
    const chartData = Object.entries(data.days).map(([name, dayData]) => ({
      name,
      calls: dayData.calls,
      conversions: dayData.conversions,
      date: dayData.date
    }));
    
    callback(chartData);
  }, (error) => {
    console.error('Error in traffic analytics subscription:', error);
    if (error?.code === 'permission-denied') {
      console.error('Permission denied: ensure the user is authenticated and Firestore rules allow access to users/{userId}/trafficAnalytics/{weekId}.');
    } else {
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
    // Return empty data on error
    const days = initializeWeeklyData();
    const emptyData = Object.entries(days).map(([name, data]) => ({
      name,
      calls: data.calls,
      conversions: data.conversions,
      date: data.date
    }));
    callback(emptyData);
  });
};

/**
 * Reset weekly data (useful for testing or manual reset)
 * @param userId - The user's ID
 */
export const resetWeeklyTraffic = async (userId: string) => {
  if (!userId) {
    console.error('resetWeeklyTraffic: No userId provided');
    return;
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const docRef = getWeekDocRef(userId);
    const resetData: WeeklyTrafficData = {
      userId,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      days: initializeWeeklyData(),
      lastUpdated: new Date().toISOString()
    };
    
    await setDoc(docRef, resetData);
    console.log('✅ Weekly traffic data reset');
  } catch (error) {
    console.error('Error resetting weekly traffic:', error);
  }
};

/**
 * Helper function to track a conversion (qualified lead)
 * This increments the conversion counter without adding a new call
 * @param userId - The user's ID
 */
export const trackConversion = async (userId: string) => {
  if (!userId) {
    console.error('trackConversion: No userId provided');
    return;
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const docRef = getWeekDocRef(userId);
    const docSnap = await getDoc(docRef);
    
    const today = new Date();
    const dayName = getDayName(today);
    const todayDate = formatDate(today);
    
    if (!docSnap.exists()) {
      // Create new week document with 1 conversion
      const newWeekData: WeeklyTrafficData = {
        userId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        days: initializeWeeklyData(),
        lastUpdated: new Date().toISOString()
      };
      
      newWeekData.days[dayName].conversions = 1;
      await setDoc(docRef, newWeekData);
    } else {
      // Update existing week document
      const data = docSnap.data() as WeeklyTrafficData;
      
      if (!data.days[dayName]) {
        data.days[dayName] = {
          calls: 0,
          conversions: 0,
          date: todayDate
        };
      }
      
      data.days[dayName].conversions += 1;
      data.lastUpdated = new Date().toISOString();
      
      await setDoc(docRef, data);
    }
    
    console.log(`✅ Conversion tracked: ${dayName}`);
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
};

/**
 * Sync call history with traffic analytics for current week
 * This backfills traffic data from existing call records
 * @param userId - The user's ID
 * @param callRecords - Array of call history records
 */
export const syncCallHistoryToTraffic = async (
  userId: string,
  callRecords: Array<{ timestamp: string; status?: string }>
): Promise<void> => {
  if (!userId || !callRecords || callRecords.length === 0) {
    return;
  }

  try {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log(`📊 Syncing traffic for week: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
    console.log(`📊 Current date: ${new Date().toDateString()}`);
    console.log(`📊 Total calls to process: ${callRecords.length}`);

    // Filter calls from current week only
    const currentWeekCalls = callRecords.filter(call => {
      const callDate = new Date(call.timestamp);
      const isInWeek = callDate >= weekStart && callDate <= weekEnd;
      console.log(`📊 Call from ${callDate.toISOString()} (${callDate.toDateString()}): ${isInWeek ? 'IN WEEK' : 'OUT OF WEEK'}`);
      return isInWeek;
    });

    console.log(`📊 Calls in current week: ${currentWeekCalls.length}`);

    if (currentWeekCalls.length === 0) {
      console.log('📊 No calls found in current week for traffic sync');
      // Still initialize empty week data
      const docRef = getWeekDocRef(userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        const newWeekData: WeeklyTrafficData = {
          userId,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          days: initializeWeeklyData(),
          lastUpdated: new Date().toISOString()
        };
        await setDoc(docRef, newWeekData);
        console.log('📊 Initialized empty week data');
      }
      return;
    }

    // Group calls by day
    const callsByDay: Map<keyof WeeklyTrafficData['days'], number> = new Map();
    
    currentWeekCalls.forEach(call => {
      const callDate = new Date(call.timestamp);
      const dayName = getDayName(callDate);
      callsByDay.set(dayName, (callsByDay.get(dayName) || 0) + 1);
    });

    // Update traffic data
    const docRef = getWeekDocRef(userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Create new week data with synced calls
      const newWeekData: WeeklyTrafficData = {
        userId,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        days: initializeWeeklyData(),
        lastUpdated: new Date().toISOString()
      };

      callsByDay.forEach((count, dayName) => {
        newWeekData.days[dayName].calls = count;
      });

      await setDoc(docRef, newWeekData);
      console.log(`✅ Traffic synced: Created new week with ${currentWeekCalls.length} calls`);
    } else {
      // Merge with existing data
      const data = docSnap.data() as WeeklyTrafficData;

      callsByDay.forEach((count, dayName) => {
        if (!data.days[dayName]) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].indexOf(dayName));
          data.days[dayName] = {
            calls: 0,
            conversions: 0,
            date: formatDate(dayDate)
          };
        }
        // Update calls to match actual count (don't increment, set to actual)
        data.days[dayName].calls = count;
      });

      data.lastUpdated = new Date().toISOString();
      await setDoc(docRef, data);
      console.log(`✅ Traffic synced: Updated week with ${currentWeekCalls.length} calls`);
    }
  } catch (error) {
    console.error('Error syncing call history to traffic:', error);
  }
};

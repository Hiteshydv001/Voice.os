import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AgentFlow } from '../types';

const FLOWS_COLLECTION = 'agent_flows';

/**
 * Save an agent flow to Firebase
 */
export const saveAgentFlow = async (userId: string, flow: AgentFlow): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!flow.id) {
      throw new Error('Flow ID is required');
    }
    
    const flowRef = doc(db, FLOWS_COLLECTION, flow.id);
    const flowData = {
      ...flow,
      userId,
      metadata: {
        ...flow.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    
    console.log('Saving flow to Firestore:', flowData);
    await setDoc(flowRef, flowData);
    console.log('Agent flow saved successfully:', flow.id);
  } catch (error: any) {
    console.error('Error saving agent flow:', error);
    throw new Error(`Failed to save agent flow: ${error.message || error}`);
  }
};

/**
 * Load a specific agent flow from Firebase
 */
export const loadAgentFlow = async (flowId: string): Promise<AgentFlow | null> => {
  try {
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    const flowSnap = await getDoc(flowRef);
    
    if (flowSnap.exists()) {
      return flowSnap.data() as AgentFlow;
    }
    return null;
  } catch (error) {
    console.error('Error loading agent flow:', error);
    throw new Error('Failed to load agent flow');
  }
};

/**
 * Load all agent flows for a user from Firebase
 */
export const loadUserFlows = async (userId: string): Promise<AgentFlow[]> => {
  try {
    const flowsQuery = query(
      collection(db, FLOWS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(flowsQuery);
    
    const flows: AgentFlow[] = [];
    querySnapshot.forEach((doc) => {
      flows.push(doc.data() as AgentFlow);
    });
    
    return flows;
  } catch (error) {
    console.error('Error loading user flows:', error);
    throw new Error('Failed to load user flows');
  }
};

/**
 * Delete an agent flow from Firebase
 */
export const deleteAgentFlow = async (flowId: string): Promise<void> => {
  try {
    const flowRef = doc(db, FLOWS_COLLECTION, flowId);
    await deleteDoc(flowRef);
    console.log('Agent flow deleted successfully:', flowId);
  } catch (error) {
    console.error('Error deleting agent flow:', error);
    throw new Error('Failed to delete agent flow');
  }
};

/**
 * Create a new agent flow with default values
 */
export const createNewFlow = (userId: string, name: string = 'New Agent Flow'): AgentFlow => {
  const timestamp = new Date().toISOString();
  return {
    id: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: '',
    userId,
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 50 },
        data: { config: {}, label: 'Start' },
      },
    ],
    edges: [],
    metadata: {
      version: '1.0',
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [],
    },
  };
};

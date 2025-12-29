import { FunctionHandler } from "./types";

const functions: FunctionHandler[] = [];

// In-memory store for scheduled demos
export interface ScheduledDemo {
  id: string;
  customer_name?: string;
  preferred_time: string;
  email?: string;
  phone?: string;
  scheduled_at: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export const scheduledDemos: ScheduledDemo[] = [];

functions.push({
  schema: {
    name: "get_weather_from_coords",
    type: "function",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
        },
        longitude: {
          type: "number",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    const data = await response.json();
    const currentTemp = data.current?.temperature_2m;
    return JSON.stringify({ temp: currentTemp });
  },
});

functions.push({
  schema: {
    name: "schedule_demo",
    type: "function",
    description: "Schedule a product demo with the customer. Call this immediately when the user provides a specific date or time.",
    parameters: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "The customer's name",
        },
        preferred_time: {
          type: "string",
          description: "The time the user requested (e.g., 'Next Tuesday at 4 PM')",
        },
        email: {
          type: "string",
          description: "The customer's email address",
        },
      },
      required: ["preferred_time"],
    },
  },
  handler: async (args: { customer_name?: string; preferred_time: string; email?: string }) => {
    const demo: ScheduledDemo = {
      id: `DEMO-${Date.now()}`,
      customer_name: args.customer_name,
      preferred_time: args.preferred_time,
      email: args.email,
      scheduled_at: new Date().toISOString(),
      status: 'pending'
    };
    
    scheduledDemos.push(demo);
    
    console.log("📅 BOOKING CONFIRMED");
    console.log("Demo ID:", demo.id);
    console.log("Customer:", args.customer_name || "Not provided");
    console.log("Preferred Time:", args.preferred_time);
    console.log("Email:", args.email || "Not provided");
    console.log("Total Scheduled Demos:", scheduledDemos.length);
    
    return JSON.stringify({
      success: true,
      msg: `Booked for ${args.preferred_time}`,
      demo_id: demo.id
    });
  },
});

export default functions;

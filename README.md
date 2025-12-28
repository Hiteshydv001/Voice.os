<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Voice Marketing Platform

A comprehensive AI-powered voice marketing platform that enables businesses to create intelligent voice agents, manage campaigns, and make automated outbound calls at scale. Built with React, TypeScript, Firebase, OpenAI Realtime API, and Twilio.

View your app in AI Studio: https://ai.studio/apps/drive/1I-MQLB4kTDFaHgV36fCh3Kuyrrw6m1ZW

## 🌟 Features

### 1. **AI Agent Builder**
- **Visual Agent Creation**: Build AI voice agents using an intuitive interface
- **AI-Powered Script Generation**: Automatically generate conversation scripts using Gemini AI
- **Customizable Tone & Personality**: Choose from multiple agent personalities (Professional, Friendly, Enthusiastic, etc.)
- **Advanced Flow Builder**: Create complex conversation flows with drag-and-drop node-based editor
- **Multi-Provider Support**: Integrate with OpenAI, Gemini, and other LLM providers
- **Built-in Testing**: Test agents in real-time simulator before deployment

### 2. **Voice Cloning & Synthesis**
- **Multiple Voice Options**: Choose from ElevenLabs premium voice library
- **Voice Recording**: Record custom voices directly in the browser
- **File Upload**: Upload audio files for voice cloning
- **Text-to-Speech Testing**: Preview voices with custom text
- **Saved Audio Library**: Store and manage generated audio files
- **Multiple TTS Models**: Support for various ElevenLabs models (Turbo v2.5, Multilingual, etc.)

### 3. **Lead Management**
- **CSV Import**: Bulk import leads from CSV files
- **Manual Entry**: Add leads individually through the interface
- **Lead Scoring**: Automatic lead quality scoring
- **Status Tracking**: Track lead status (New, Contacted, Qualified, Converted, Lost)
- **Search & Filter**: Advanced search and filtering capabilities
- **Lead Analytics**: View lead statistics and conversion rates

### 4. **Campaign Management**
- **Multi-Lead Campaigns**: Create campaigns with multiple leads
- **Agent Assignment**: Assign specific AI agents to campaigns
- **Real-Time Progress Tracking**: Monitor campaign progress in real-time
- **Call Results Analytics**: Detailed call outcome tracking (Success, Failed, Voicemail, etc.)
- **Sentiment Analysis**: Track conversation sentiment (Positive, Neutral, Negative)
- **Performance Metrics**: View success rates, average call duration, and more
- **Campaign Reports**: Comprehensive campaign performance reports

### 5. **Real-Time Call Interface**
- **Live Call Monitoring**: Watch calls in real-time
- **OpenAI Realtime API Integration**: Powered by OpenAI's real-time voice capabilities
- **Twilio Integration**: Make actual phone calls through Twilio
- **Live Transcription**: Real-time speech-to-text transcription
- **Function Calling**: Execute custom functions during calls
- **WebSocket Communication**: Low-latency real-time data streaming
- **Call Recording**: Record and review call sessions

### 6. **Visual Agent Flow Builder**
- **Drag & Drop Interface**: Build complex agent workflows visually
- **Node Types**:
  - Start/End nodes
  - LLM nodes (Gemini, OpenAI)
  - Speech-to-Text (STT) nodes
  - Text-to-Speech (TTS) nodes
- **Template Library**: Pre-built templates for common use cases
- **Export/Import Flows**: Save and share agent configurations
- **API Key Management**: Secure API key storage for multiple providers
- **Flow Testing**: Test entire flows before deployment

### 7. **User Management & Authentication**
- **Firebase Authentication**: Secure user authentication
- **User Profiles**: Personalized user profiles with usage tracking
- **Credit System**: Usage-based credit system
- **Subscription Management**: Multiple subscription tiers (Free, Pro, Enterprise)
- **Stripe Integration**: Secure payment processing
- **Usage Analytics**: Track credits, call minutes, and agent usage

### 8. **Dashboard & Analytics**
- **Performance Overview**: Key metrics at a glance
- **Activity Logs**: Detailed activity tracking
- **Charts & Visualizations**: Beautiful charts using Recharts
- **Real-Time Updates**: Live data updates
- **Export Reports**: Download campaign reports

### 9. **Call Simulation**
- **Test Agents**: Test AI agents without making real calls
- **Conversation Preview**: Preview agent responses
- **Script Validation**: Validate conversation scripts
- **No Credit Usage**: Test without consuming credits

## 🏗️ Project Structure

```
├── frontend/
│   ├── components/
│   │   ├── AgentBuilder/          # Visual flow-based agent builder
│   │   │   ├── AgentBuilderPage.tsx    # Main builder interface
│   │   │   ├── AgentCanvas.tsx          # React Flow canvas
│   │   │   ├── NodePalette.tsx          # Node selection palette
│   │   │   ├── NodeConfigModal.tsx      # Node configuration
│   │   │   ├── APIKeysModal.tsx         # API key management
│   │   │   ├── TestRunnerModal.tsx      # Flow testing
│   │   │   ├── templates.ts             # Pre-built templates
│   │   │   └── nodes/                   # Custom node components
│   │   ├── Auth/                   # Authentication components
│   │   │   ├── Login.tsx
│   │   │   └── SignUp.tsx
│   │   ├── ui/                     # Reusable UI components (shadcn/ui)
│   │   ├── AgentBuilder.tsx        # Simple agent builder
│   │   ├── CampaignManager.tsx     # Campaign management
│   │   ├── CallInterface.tsx       # Real-time call interface
│   │   ├── CallSimulator.tsx       # Agent testing simulator
│   │   ├── Dashboard.tsx           # Main dashboard
│   │   ├── LandingPage.tsx         # Marketing landing page
│   │   ├── LeadsManager.tsx        # Lead management
│   │   ├── VoiceCloning.tsx        # Voice synthesis & cloning
│   │   ├── Layout.tsx              # App layout wrapper
│   │   ├── ProtectedRoute.tsx      # Route protection
│   │   └── SubscriptionModal.tsx   # Subscription management
│   ├── services/
│   │   ├── agentExecutor.ts        # Agent execution logic
│   │   ├── agentFlowService.ts     # Agent flow CRUD operations
│   │   ├── apiKeyService.ts        # API key management
│   │   ├── elevenLabsService.ts    # ElevenLabs integration
│   │   ├── firebase.ts             # Firebase configuration
│   │   ├── geminiService.ts        # Google Gemini integration
│   │   ├── resembleService.ts      # Resemble AI integration
│   │   ├── storageService.ts       # Local storage management
│   │   ├── twilioService.ts        # Twilio integration
│   │   └── userService.ts          # User management
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication context
│   ├── lib/
│   │   ├── handle-realtime-event.ts # WebSocket event handling
│   │   ├── tool-templates.ts        # Function calling templates
│   │   ├── twilio.ts                # Twilio utilities
│   │   └── utils.ts                 # Utility functions
│   ├── config/
│   │   └── stripe.ts               # Stripe configuration
│   ├── types.ts                    # TypeScript type definitions
│   ├── App.tsx                     # Main app component
│   └── index.tsx                   # App entry point
├── backend/
│   ├── src/
│   │   ├── server.ts               # Express server & WebSocket setup
│   │   ├── sessionManager.ts       # Call session management
│   │   ├── functionHandlers.ts     # Custom function implementations
│   │   ├── types.ts                # Backend type definitions
│   │   └── twiml.xml               # Twilio TwiML template
│   ├── package.json                # Backend dependencies
│   └── tsconfig.json               # Backend TypeScript config
├── config/                         # Configuration files
├── examples/                       # Example implementations
├── firebase.json                   # Firebase configuration
├── firestore.rules                 # Firestore security rules
├── Dockerfile                      # Docker configuration
├── render.yaml                     # Render deployment config
├── package.json                    # Frontend dependencies
└── tsconfig.json                   # Frontend TypeScript config
```

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **React Flow** - Visual flow builder
- **shadcn/ui** - UI component library
- **Zustand** - State management
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **WebSocket (ws)** - Real-time communication
- **TypeScript** - Type safety

### Cloud Services
- **Firebase** - Authentication & database (Firestore)
- **Twilio** - Voice calls & SMS
- **OpenAI** - Realtime API for voice conversations
- **Google Gemini** - AI script generation
- **ElevenLabs** - Voice synthesis & cloning
- **Stripe** - Payment processing

### Deployment
- **Docker** - Containerization
- **Render** - Hosting platform
- **Firebase Hosting** - Frontend hosting option

## 🚀 How It Works

### 1. Agent Creation Flow
```
User Input → Gemini AI → Script Generation → Voice Selection → Agent Saved
```
1. User defines agent purpose, tone, and product details
2. Gemini AI generates opening, closing, and objection handling scripts
3. User selects or creates custom voice
4. Agent is saved to Firestore and ready for campaigns

### 2. Advanced Flow Builder
```
Drag Nodes → Configure → Connect → Test → Save → Execute
```
1. User drags nodes (LLM, STT, TTS) onto canvas
2. Configures each node with specific settings
3. Connects nodes to create conversation flow
4. Tests flow in simulator
5. Saves flow for execution
6. Flow is executed during real calls

### 3. Campaign Execution Flow
```
Create Campaign → Select Leads → Assign Agent → Start Campaign → Monitor Results
```
1. User creates campaign with name
2. Imports or selects leads
3. Assigns AI agent to campaign
4. Campaign starts making calls automatically
5. Real-time monitoring of call progress
6. Detailed results and analytics

### 4. Real-Time Call Flow
```
Twilio Call → WebSocket → OpenAI Realtime API → Response → TTS → User
```
1. System initiates call via Twilio
2. Audio streams through WebSocket to backend
3. Backend forwards to OpenAI Realtime API
4. OpenAI processes voice input and generates response
5. Response converted to speech via ElevenLabs
6. Audio streamed back to caller in real-time

### 5. Authentication & Credits
```
Sign Up → Free Credits → Use Features → Upgrade → More Credits
```
1. User signs up via Firebase Auth
2. Receives free trial credits
3. Makes calls and uses features (credits deducted)
4. Upgrades subscription for more credits
5. Stripe handles payment processing

## 📦 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Firebase account**
- **Twilio account**
- **OpenAI API key**
- **Google Gemini API key**
- **ElevenLabs API key**
- **Stripe account** (for payments)

### Environment Variables

Create `.env` file in root:
```env
# Frontend (Vite)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_GEMINI_API_KEY=your_gemini_key
```

Create `.env` file in `backend/`:
```env
# Backend
PORT=8081
PUBLIC_URL=your_public_url
OPENAI_API_KEY=your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Local Development

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Start backend server:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Start frontend (in new terminal):**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8081

### Production Build

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build
```

## 🐳 Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t voice-marketing-ai .

# Run container
docker run -p 5173:5173 -p 8081:8081 \
  -e OPENAI_API_KEY=your_key \
  -e TWILIO_ACCOUNT_SID=your_sid \
  -e TWILIO_AUTH_TOKEN=your_token \
  voice-marketing-ai
```

## ☁️ Cloud Deployment

### Deploy Frontend to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Hiteshydv001/Voice.os.git)

**Quick Steps:**
1. Click the button above or go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Configure:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables (see [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md))
5. Deploy!

**Detailed Guide:** See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for complete instructions.

### Deploy Backend to Render

**Backend is already configured for Render:**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. New → Web Service
3. Connect your GitHub repository
4. Configure:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. Add environment variables:
   - `OPENAI_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `PUBLIC_URL` (your Render URL)
6. Deploy!

**Current Backend:** https://voice-os.onrender.com

## 📊 Key Features Explained

### Credit System
- Free tier: 100 credits
- Pro tier: 1000 credits/month
- Enterprise: Custom credits
- 1 credit = 1 minute of call time

### Voice Cloning
- Upload audio samples (WAV, MP3)
- Record directly in browser
- Instant voice cloning with ElevenLabs
- Preview before using in campaigns

### Real-Time Monitoring
- Live call transcription
- Sentiment analysis
- Function call tracking
- WebSocket-based updates

### Function Calling
- Custom function execution during calls
- Booking appointments
- Database queries
- CRM integration
- API calls

### Security
- Firebase Authentication
- Firestore security rules
- API key encryption
- Secure WebSocket connections
- Stripe PCI compliance

## 🔐 Firebase Security Rules

The app uses Firestore with security rules defined in `firestore.rules`:
- Users can only read/write their own data
- Agents, leads, campaigns are user-scoped
- Admin functions have elevated permissions

## 📱 Twilio Setup

1. Create Twilio account
2. Purchase phone number
3. Configure webhook URL: `https://your-domain/twiml`
4. Set up TwiML app for voice calls

## 🎯 Use Cases

- **Sales Outreach**: Automated sales calls with AI agents
- **Lead Qualification**: Screen and qualify leads automatically
- **Appointment Booking**: Schedule appointments via voice
- **Customer Support**: 24/7 voice-based customer support
- **Surveys**: Conduct phone surveys at scale
- **Reminders**: Automated appointment/payment reminders

## 🤝 Contributing

Contributions welcome! Please follow these steps:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🐛 Known Issues

- ResizeObserver warnings in React Flow (suppressed, no impact on functionality)
- WebSocket reconnection may take a few seconds on network interruption
- Voice cloning requires good quality audio samples for best results

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] SMS campaign integration
- [ ] Advanced analytics dashboard
- [ ] Integration with popular CRMs (Salesforce, HubSpot)
- [ ] Webhook support for custom integrations
- [ ] Mobile app (React Native)
- [ ] Voice analytics & insights
- [ ] A/B testing for agent scripts

## 📧 Support

For support, email support@yourcompany.com or open an issue in the repository.

## 🙏 Acknowledgments

- OpenAI for Realtime API
- Google for Gemini AI
- ElevenLabs for voice synthesis
- Twilio for telephony
- Firebase for backend infrastructure
- shadcn/ui for beautiful components

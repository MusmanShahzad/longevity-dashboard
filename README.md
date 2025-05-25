# Longevity Clinic AI-Powered Health Dashboard

A comprehensive health tracking system with AI-powered sleep analysis, SHIELD scoring, and personalized health insights built with Next.js, TypeScript, and Supabase.

![Dashboard Preview](https://via.placeholder.com/800x400/1e293b/06b6d4?text=Longevity+Clinic+Dashboard)

## 🌟 Features

- **User Management**: Create and manage multiple user profiles
- **Sleep Data Tracking**: Record and analyze sleep metrics with real-time calculations
- **SHIELD Score System**: Proprietary scoring algorithm based on sleep quality metrics
- **Bio-Age Analysis**: Calculate biological age delta based on sleep patterns
- **AI Health Insights**: Personalized suggestions and health alerts
- **Interactive Charts**: Visualize sleep trends and patterns over time
- **Lab Report Upload**: Secure file upload and processing system
- **Responsive Design**: Glassmorphism UI that works on all devices

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js API) │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Sleep Data    │    │ • Users         │
│ • Modals        │    │ • SHIELD Score  │    │ • Sleep Data    │
│ • Charts        │    │ • Health Alerts │    │ • Health Alerts │
│ • Dashboard     │    │ • User Mgmt     │    │ • Lab Reports   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with glassmorphism design
- **UI Components**: shadcn/ui, Lucide React icons
- **Charts**: Recharts for data visualization
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Deployment**: Vercel (recommended)

### Key Components Architecture
```
components/
├── atoms/           # Basic UI elements
│   ├── glass-card.tsx
│   ├── progress-ring.tsx
│   ├── number-input.tsx
│   └── date-input.tsx
├── molecules/       # Composed components
│   ├── metric-display.tsx
│   ├── form-group.tsx
│   └── modal.tsx
└── organisms/       # Complex components
    ├── header.tsx
    ├── user-management.tsx
    ├── health-data-modal.tsx
    ├── shield-score-card.tsx
    ├── bio-age-delta-card.tsx
    ├── health-alerts-card.tsx
    └── sleep-charts-card.tsx
```

## 🗄️ Database Schema

### Core Tables
```sql
-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar NOT NULL,
  email varchar,
  date_of_birth date,
  sex varchar CHECK (sex IN ('male', 'female', 'other')),
  location varchar,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Sleep data with SHIELD scores
CREATE TABLE sleep_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_sleep_hours numeric CHECK (total_sleep_hours >= 0 AND total_sleep_hours <= 24),
  time_in_bed numeric CHECK (time_in_bed >= 0 AND time_in_bed <= 24),
  sleep_efficiency numeric CHECK (sleep_efficiency >= 0 AND sleep_efficiency <= 100),
  rem_percentage numeric CHECK (rem_percentage >= 0 AND rem_percentage <= 100),
  deep_sleep_percentage numeric CHECK (deep_sleep_percentage >= 0 AND deep_sleep_percentage <= 100),
  light_sleep_percentage numeric CHECK (light_sleep_percentage >= 0 AND light_sleep_percentage <= 100),
  awake_percentage numeric CHECK (awake_percentage >= 0 AND awake_percentage <= 100),
  shield_score integer CHECK (shield_score >= 0 AND shield_score <= 100),
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, date),
  CHECK (total_sleep_hours <= time_in_bed)
);

-- Health alerts with date tracking
CREATE TABLE health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type varchar CHECK (type IN ('warning', 'info', 'success')),
  title varchar NOT NULL,
  description text,
  suggestion text,
  sleep_date date, -- Links to specific sleep session
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Lab reports
CREATE TABLE lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  file_url varchar,
  status varchar DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'error')),
  uploaded_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sleep_data_user_date ON sleep_data(user_id, date DESC);
CREATE INDEX idx_health_alerts_user_sleep_date ON health_alerts(user_id, sleep_date DESC);
CREATE INDEX idx_lab_reports_user_uploaded ON lab_reports(user_id, uploaded_at DESC);
```

## 🧮 Calculations & Algorithms

### SHIELD Score Calculation
The SHIELD score is our proprietary algorithm that evaluates sleep quality on a 0-100 scale:

```typescript
function calculateShieldScore(
  totalSleepHours: number,
  sleepEfficiency: number,
  remPercentage: number,
  userAge: number
): number {
  let score = 100; // Base score

  // Rule 1: Sleep duration < 6 hours = -10 points
  if (totalSleepHours < 6) {
    score -= 10;
  }

  // Rule 2: Sleep efficiency < 85% = -5 points
  if (sleepEfficiency < 85) {
    score -= 5;
  }

  // Rule 3: REM sleep < 15% = -5 points
  if (remPercentage < 15) {
    score -= 5;
  }

  // Rule 4: Age penalty - users over 50 with poor sleep get additional penalty
  if (userAge > 50 && totalSleepHours < 6) {
    score -= 5;
  }

  return Math.max(0, score); // Ensure score doesn't go below 0
}
```

**SHIELD Score Ranges:**
- 95-100: Exceptional sleep quality
- 85-94: Excellent sleep quality  
- 75-84: Good sleep quality
- 65-74: Fair sleep quality
- 0-64: Needs improvement

### Sleep Efficiency Calculation
```typescript
const sleepEfficiency = (totalSleepHours / timeInBed) * 100;
```
- **Optimal Range**: 85%+ (clinical standard)
- **Formula**: (Actual Sleep Time ÷ Time in Bed) × 100

### Bio-Age Delta Calculation
Estimates biological age based on sleep patterns:

```typescript
function calculateBioAgeDelta(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number
): number {
  let bioAgeModifier = 0;

  // Sleep efficiency impact
  if (sleepEfficiency >= 90) bioAgeModifier -= 2;
  else if (sleepEfficiency >= 85) bioAgeModifier -= 1;
  else if (sleepEfficiency < 75) bioAgeModifier += 2;
  else if (sleepEfficiency < 80) bioAgeModifier += 1;

  // REM sleep impact
  if (remPercentage >= 20 && remPercentage <= 25) bioAgeModifier -= 1;
  else if (remPercentage < 15) bioAgeModifier += 2;
  else if (remPercentage > 30) bioAgeModifier += 1;

  // Sleep duration impact
  if (avgSleepHours >= 7 && avgSleepHours <= 9) bioAgeModifier -= 1;
  else if (avgSleepHours < 6) bioAgeModifier += 3;
  else if (avgSleepHours > 10) bioAgeModifier += 1;

  const biologicalAge = chronologicalAge + bioAgeModifier;
  return chronologicalAge - biologicalAge; // Positive = younger than chronological age
}
```

### Sleep Stage Distribution
```typescript
// Simplified sleep stage calculations
const deepSleepPercentage = Math.max(0, 25 - (remPercentage || 0) * 0.3);
const lightSleepPercentage = Math.max(
  0,
  100 - (remPercentage || 0) - deepSleepPercentage - (100 - sleepEfficiency)
);
const awakePercentage = Math.max(0, 100 - sleepEfficiency);
```

## 🔧 Assumptions & Design Decisions

### Data Assumptions
- **Sleep Tracking Accuracy**: Users can accurately track sleep hours, time in bed, and REM percentage
- **Age-Based Scoring**: Date of birth is provided for accurate age-based SHIELD scoring
- **Data Validation**: Sleep hours cannot exceed time in bed (enforced at API and database level)
- **Date Constraints**: Cannot add sleep data for future dates
- **REM Sleep Range**: Normal range is 15-25% of total sleep time
- **Sleep Efficiency**: Optimal range is 85%+ based on clinical standards

### Technical Assumptions
- **Database Reliability**: Supabase provides reliable PostgreSQL hosting with 99.9% uptime
- **Authentication**: Simple user management without complex authentication flows (suitable for demo/MVP)
- **File Storage**: Supabase storage handles lab report uploads with built-in security
- **Real-time Requirements**: No real-time sync needed (standard CRUD operations sufficient)
- **Scalability**: Current architecture supports up to 10,000 users without modification

### Business Logic Assumptions
- **SHIELD Score Validity**: Based on established sleep research and clinical guidelines
- **Bio-Age Calculation**: Simplified model for demonstration (production would use more complex algorithms)
- **Health Suggestions**: Rule-based AI suggestions (can be enhanced with ML in future)

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Git for version control

### 1. Clone Repository
```bash
git clone <repository-url>
cd longevity-clinic-dashboard
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: For enhanced security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Setup
1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project
2. **Run SQL Migrations**: Copy and execute the SQL schema from the Database Schema section above
3. **Enable Row Level Security** (optional but recommended):
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

-- Create policies (example for users table)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);
```

### 5. Storage Setup (for lab reports)
```sql
-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-reports', 'lab-reports', false);

-- Create storage policy
CREATE POLICY "Users can upload own lab reports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lab-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 6. Run Development Server
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing the System

### Manual Testing Checklist

#### User Management
- [ ] Create new user with all required fields
- [ ] Create user with minimal fields (name, DOB, sex)
- [ ] Edit existing user information
- [ ] Search users by name, email, location
- [ ] View user dashboard

#### Sleep Data Entry
- [ ] Add sleep data for current date
- [ ] Add sleep data for past dates
- [ ] Update existing sleep data
- [ ] Test validation: sleep hours > time in bed (should fail)
- [ ] Test validation: future dates (should fail)
- [ ] Test validation: negative values (should fail)

#### SHIELD Score Testing
Test different scenarios to verify scoring:
- [ ] Perfect sleep: 8 hours, 95% efficiency, 22% REM → Score: 100
- [ ] Poor duration: 5 hours, 90% efficiency, 20% REM → Score: 90 (-10 for duration)
- [ ] Poor efficiency: 8 hours, 80% efficiency, 20% REM → Score: 95 (-5 for efficiency)
- [ ] Poor REM: 8 hours, 90% efficiency, 10% REM → Score: 95 (-5 for REM)
- [ ] Age penalty: 55 years old, 5 hours, 80% efficiency → Score: 80 (-10-5-5 for all factors)

#### Health Insights
- [ ] Verify suggestions appear after data entry
- [ ] Check suggestions are grouped by date
- [ ] Test suggestion persistence across sessions
- [ ] Verify different suggestion types (warning, success, info)

#### Charts & Analytics
- [ ] View sleep trends over 7 days
- [ ] Toggle between sleep hours and SHIELD score charts
- [ ] Check sleep stage pie chart
- [ ] Verify chart responsiveness on mobile

#### Lab Reports
- [ ] Upload PDF lab report
- [ ] Upload image file (JPG/PNG)
- [ ] Test file size limits
- [ ] Verify file type restrictions
- [ ] Check upload status updates

### API Testing
Use curl or Postman to test API endpoints:

```bash
# Test user creation
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "date_of_birth": "1990-01-01",
    "sex": "male",
    "email": "test@example.com",
    "location": "New York, NY"
  }'

# Test sleep data creation
curl -X POST http://localhost:3000/api/sleep-data \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "date": "2024-01-01",
    "total_sleep_hours": 7.5,
    "time_in_bed": 8.0,
    "rem_percentage": 22
  }'

# Test fetching user metrics
curl http://localhost:3000/api/users/user-uuid-here/metrics

# Test fetching health alerts
curl http://localhost:3000/api/health-alerts?user_id=user-uuid-here
```

### Automated Testing (Future Enhancement)
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests with Playwright
npm run test:e2e
```

## 🌐 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login and Deploy**
```bash
vercel login
vercel
```

3. **Configure Environment Variables**
In Vercel dashboard, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. **Deploy to Production**
```bash
vercel --prod
```

### Alternative Deployment Options

#### Netlify
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables

#### Railway
1. Connect GitHub repository
2. Railway auto-detects Next.js
3. Add environment variables
4. Deploy with database included

#### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```
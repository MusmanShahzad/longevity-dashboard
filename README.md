# Longevity Clinic AI-Powered Health Dashboard

A comprehensive health tracking system with AI-powered sleep analysis, research-based biological age calculation, and personalized health insights built with Next.js, TypeScript, and Supabase.

![Dashboard Preview](https://via.placeholder.com/800x400/1e293b/06b6d4?text=Longevity+Clinic+Dashboard)

## 🌟 Key Features

### Core Health Tracking
- **User Management**: Create and manage multiple user profiles with comprehensive health data
- **Enhanced Sleep Analytics**: Track 7+ sleep metrics including HRV, sleep latency, and chronotype alignment
- **Research-Based Bio-Age Calculation**: Calculate biological age delta using scientifically-backed algorithms
- **SHIELD Score System**: Proprietary scoring algorithm for sleep quality assessment
- **AI Health Insights**: Personalized suggestions and health alerts based on sleep patterns
- **Interactive Charts**: Visualize sleep trends and patterns over time with responsive charts

### Advanced Features
- **Biomarker Analysis**: Upload and analyze lab reports with AI-powered insights
- **HIPAA Compliance**: Full audit logging and security compliance for healthcare data
- **Real-time Metrics**: Live calculation of sleep efficiency and bio-age factors
- **Enhanced UI/UX**: Glassmorphism design with optimized forms and visual feedback
- **Security Dashboard**: Comprehensive audit trails and security monitoring

## 🧬 Bio-Age Calculation System

Our biological age calculation is based on peer-reviewed research and includes:

### Sleep Metrics & Weights
- **HRV Overnight** (25%): Heart rate variability during sleep - key indicator of autonomic nervous system health
- **Total Sleep Time** (20%): Optimal range 7-8.5 hours based on sleep research
- **Sleep Efficiency** (15%): Percentage of time asleep while in bed (≥85% optimal)
- **REM Sleep %** (10%): Critical for cognitive function (20-25% optimal)
- **Sleep Latency** (10%): Time to fall asleep (<20 minutes optimal)
- **Timing Consistency** (10%): Sleep schedule regularity (<1 hour variation)
- **Chronotype Alignment** (10%): Matching sleep schedule to natural circadian preference

### Research Sources
- Mandsager et al. JAMA 2018 (cardiorespiratory fitness and longevity)
- American Academy of Sleep Medicine guidelines
- NIH sleep research recommendations
- Heart Rate Variability research from European Society of Cardiology

### Bio-Age Range
- **Delta Range**: -5 to +5 years from chronological age
- **Clamping**: Results clamped to ±10 years maximum
- **Neutral Scoring**: Missing optional data scored neutrally (75/100) to avoid penalizing users

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with glassmorphism design system
- **UI Components**: shadcn/ui, Radix UI primitives, Lucide React icons
- **Charts**: Recharts for data visualization
- **Forms**: Formik + Yup validation
- **Backend**: Next.js API Routes with security middleware
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **State Management**: TanStack Query (React Query) for server state
- **File Storage**: Supabase Storage for lab reports
- **Deployment**: Vercel-optimized

### Component Architecture
```
components/
├── atoms/           # Basic UI elements
│   ├── glass-card.tsx
│   ├── progress-ring.tsx
│   ├── number-input.tsx
│   ├── percentage-input.tsx
│   ├── date-input.tsx
│   └── select-input.tsx
├── molecules/       # Composed components
│   ├── metric-display.tsx
│   ├── form-group.tsx
│   ├── calculated-field.tsx
│   └── modal.tsx
└── organisms/       # Complex components
    ├── header.tsx
    ├── user-management.tsx
    ├── health-data-modal.tsx      # Enhanced with 7+ sleep metrics
    ├── shield-score-card.tsx
    ├── bio-age-delta-card.tsx     # Research-based calculation
    ├── health-alerts-card.tsx
    ├── sleep-charts-card.tsx
    ├── biomarker-analysis-card.tsx
    ├── lab-upload-card.tsx
    └── security-dashboard.tsx
```

## 🗄️ Database Schema

### Enhanced Sleep Data Table
```sql
CREATE TABLE sleep_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Core sleep metrics
  total_sleep_hours numeric CHECK (total_sleep_hours >= 0 AND total_sleep_hours <= 24),
  time_in_bed numeric CHECK (time_in_bed >= 0 AND time_in_bed <= 24),
  sleep_efficiency numeric CHECK (sleep_efficiency >= 0 AND sleep_efficiency <= 100),
  rem_percentage numeric CHECK (rem_percentage >= 0 AND rem_percentage <= 100),
  deep_sleep_percentage numeric CHECK (deep_sleep_percentage >= 0 AND deep_sleep_percentage <= 100),
  light_sleep_percentage numeric CHECK (light_sleep_percentage >= 0 AND light_sleep_percentage <= 100),
  awake_percentage numeric CHECK (awake_percentage >= 0 AND awake_percentage <= 100),
  
  -- Enhanced metrics for bio-age calculation
  sleep_latency_minutes integer CHECK (sleep_latency_minutes >= 0 AND sleep_latency_minutes <= 300),
  hrv_overnight numeric CHECK (hrv_overnight >= 1 AND hrv_overnight <= 200),
  timing_consistency_hours numeric CHECK (timing_consistency_hours >= 0 AND timing_consistency_hours <= 12),
  chronotype varchar CHECK (chronotype IN ('morning', 'evening', 'intermediate')),
  chronotype_alignment boolean,
  
  -- Calculated scores
  shield_score integer CHECK (shield_score >= 0 AND shield_score <= 100),
  
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, date),
  CHECK (total_sleep_hours <= time_in_bed)
);

-- Users table with comprehensive health data
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

-- Health alerts with AI suggestions
CREATE TABLE health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type varchar CHECK (type IN ('warning', 'info', 'success')),
  title varchar NOT NULL,
  description text,
  suggestion text,
  sleep_date date,
  is_read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Biomarker data for lab analysis
CREATE TABLE biomarkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  value numeric NOT NULL,
  unit varchar,
  reference_range varchar,
  status varchar CHECK (status IN ('normal', 'high', 'low', 'critical')),
  test_date date,
  created_at timestamp DEFAULT now()
);

-- Lab reports with file storage
CREATE TABLE lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  file_url varchar,
  status varchar DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'error')),
  uploaded_at timestamp DEFAULT now()
);

-- HIPAA audit logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action varchar NOT NULL,
  resource varchar NOT NULL,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_sleep_data_user_date ON sleep_data(user_id, date DESC);
CREATE INDEX idx_health_alerts_user_sleep_date ON health_alerts(user_id, sleep_date DESC);
CREATE INDEX idx_biomarkers_user_test_date ON biomarkers(user_id, test_date DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
```

## 🧮 Advanced Calculations & Algorithms

### Enhanced Bio-Age Calculation
Our research-based biological age calculation uses weighted scoring across multiple sleep parameters:

```typescript
function calculateBioAgeWithBreakdown(
  chronologicalAge: number,
  sleepEfficiency: number,
  remPercentage: number,
  avgSleepHours: number,
  avgHrv?: number,
  avgSleepLatency?: number,
  avgTimingConsistency?: number,
  chronotypeAlignment?: number
): {
  delta: number
  breakdown: BiAgeBreakdown
  recommendations: Recommendation[]
} {
  // Weighted scoring system based on research
  const weights = {
    hrv: 0.25,           // 25% - Strongest predictor of health
    totalSleepTime: 0.20, // 20% - Critical for recovery
    efficiency: 0.15,     // 15% - Sleep quality indicator
    rem: 0.10,           // 10% - Cognitive function
    latency: 0.10,       // 10% - Sleep onset health
    timing: 0.10,        // 10% - Circadian alignment
    chronotype: 0.10     // 10% - Natural rhythm matching
  }

  // Calculate individual scores (0-100 scale)
  const scores = {
    hrv: calculateHrvScore(avgHrv),
    tst: calculateTstScore(avgSleepHours),
    efficiency: calculateEfficiencyScore(sleepEfficiency),
    rem: calculateRemScore(remPercentage),
    latency: calculateLatencyScore(avgSleepLatency),
    timing: calculateTimingScore(avgTimingConsistency),
    chronotype: calculateChronotypeScore(chronotypeAlignment)
  }

  // Weighted average with neutral scoring for missing data
  const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
    const score = scores[key] ?? 75 // Neutral score for missing data
    return sum + (score * weight)
  }, 0)

  // Convert to bio-age delta (-5 to +5 years)
  const normalizedScore = (weightedScore - 75) / 25 // Normalize around 75
  const rawDelta = normalizedScore * -2.5 // Scale to ±2.5 base range
  
  // Age adjustment factor (older adults have different optimal ranges)
  const ageAdjustmentFactor = chronologicalAge > 65 ? 0.8 : 
                             chronologicalAge > 50 ? 0.9 : 1.0
  
  const adjustedDelta = rawDelta * ageAdjustmentFactor
  const clampedDelta = Math.max(-10, Math.min(10, adjustedDelta))

  return {
    delta: clampedDelta,
    breakdown: { /* detailed scoring breakdown */ },
    recommendations: generateRecommendations(scores, chronologicalAge)
  }
}
```

### SHIELD Score Algorithm
```typescript
function calculateShieldScore(
  totalSleepHours: number,
  sleepEfficiency: number,
  remPercentage: number,
  userAge: number
): number {
  let score = 100

  // Sleep duration penalty
  if (totalSleepHours < 6) score -= 10
  if (totalSleepHours < 5) score -= 5 // Additional penalty

  // Sleep efficiency penalty
  if (sleepEfficiency < 85) score -= 5
  if (sleepEfficiency < 75) score -= 5 // Additional penalty

  // REM sleep penalty
  if (remPercentage < 15) score -= 5
  if (remPercentage < 10) score -= 5 // Additional penalty

  // Age-specific adjustments
  if (userAge > 50 && totalSleepHours < 6) score -= 5
  if (userAge > 65 && sleepEfficiency < 80) score -= 3

  return Math.max(0, score)
}
```

### Sleep Efficiency & Stage Calculations
```typescript
// Real-time sleep efficiency calculation
const sleepEfficiency = (totalSleepHours / timeInBed) * 100

// Automatic sleep stage distribution
const deepSleepPercentage = Math.max(0, 25 - (remPercentage || 0) * 0.3)
const lightSleepPercentage = Math.max(
  0,
  100 - (remPercentage || 0) - deepSleepPercentage - (100 - sleepEfficiency)
)
const awakePercentage = Math.max(0, 100 - sleepEfficiency)
```

## 🔧 API Security & Compliance

### HIPAA Compliance Features
- **Audit Logging**: Every data access and modification is logged
- **Data Encryption**: All PHI encrypted at rest and in transit
- **Access Controls**: Role-based access with user context tracking
- **Security Monitoring**: Real-time security dashboard and alerts

### API Security Middleware
```typescript
// Comprehensive security validation
export const commonSchemas = {
  sleepData: z.object({
    user_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    total_sleep_hours: z.number().min(0).max(24),
    time_in_bed: z.number().min(0).max(24),
    rem_percentage: z.number().min(0).max(100).optional(),
    // Enhanced metrics validation
    sleep_latency_minutes: z.number().min(0).max(300).optional(),
    hrv_overnight: z.number().min(1).max(200).optional(),
    chronotype: z.enum(['morning', 'evening', 'intermediate']).optional(),
    timing_consistency_hours: z.number().min(0).max(12).optional()
  })
}
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ installed
- npm/yarn/pnpm package manager
- Supabase account and project
- Git for version control

### 1. Clone Repository
```bash
git clone <repository-url>
cd longevity-dashboard
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup
Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Security
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### 4. Database Setup

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com)
2. **Run SQL Migrations**: Execute the enhanced schema above
3. **Enable Row Level Security**:
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomarkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can manage own sleep data" ON sleep_data
  FOR ALL USING (auth.uid()::text = user_id::text);
```

4. **Setup Storage Buckets**:
```sql
-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public) VALUES ('lab-reports', 'lab-reports', false);

-- Create storage policies
CREATE POLICY "Users can upload own lab reports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lab-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. Run Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing the Enhanced System

### Bio-Age Calculation Testing
Test with these demo datasets to verify the research-based calculation:

#### Optimal Sleeper (Expected: -3 to -5 years)
```json
{
  "total_sleep_hours": 7.8,
  "time_in_bed": 8.2,
  "rem_percentage": 23,
  "sleep_latency_minutes": 12,
  "hrv_overnight": 68,
  "chronotype": "morning",
  "timing_consistency_hours": 0.3
}
```

#### Poor Sleeper (Expected: +3 to +5 years)
```json
{
  "total_sleep_hours": 5.2,
  "time_in_bed": 7.8,
  "rem_percentage": 12,
  "sleep_latency_minutes": 45,
  "hrv_overnight": 28,
  "chronotype": "evening",
  "timing_consistency_hours": 2.1
}
```

#### Average Sleeper (Expected: ~0 years)
```json
{
  "total_sleep_hours": 7.1,
  "time_in_bed": 8.0,
  "rem_percentage": 19,
  "sleep_latency_minutes": 22,
  "hrv_overnight": 42,
  "chronotype": "intermediate",
  "timing_consistency_hours": 0.8
}
```

### API Testing
```bash
# Test enhanced sleep data creation
curl -X POST http://localhost:3000/api/sleep-data \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "date": "2024-01-01",
    "total_sleep_hours": 7.5,
    "time_in_bed": 8.0,
    "rem_percentage": 22,
    "sleep_latency_minutes": 15,
    "hrv_overnight": 55,
    "chronotype": "morning",
    "timing_consistency_hours": 0.5
  }'

# Test bio-age metrics calculation
curl http://localhost:3000/api/users/user-uuid-here/metrics

# Test biomarker analysis
curl -X POST http://localhost:3000/api/biomarkers \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "name": "Total Cholesterol",
    "value": 180,
    "unit": "mg/dL",
    "reference_range": "< 200",
    "test_date": "2024-01-01"
  }'
```

## 🌐 Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY  
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXTAUTH_SECRET

# Deploy to production
vercel --prod
```

### Performance Optimizations
- **React Query**: Intelligent caching and background updates
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js automatic image optimization
- **Database Indexing**: Optimized queries with proper indexes
- **CDN**: Vercel Edge Network for global performance

## 📊 Key Metrics & Insights

### Sleep Quality Indicators
- **SHIELD Score**: 0-100 proprietary sleep quality score
- **Bio-Age Delta**: Research-based biological age calculation
- **Sleep Efficiency**: Industry-standard sleep quality metric
- **HRV Trends**: Autonomic nervous system health tracking

### Health Insights
- **AI Suggestions**: Personalized recommendations based on sleep patterns
- **Trend Analysis**: 7-day rolling averages and pattern detection
- **Risk Alerts**: Automated health warnings for concerning patterns
- **Progress Tracking**: Long-term health improvement monitoring

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning**: Advanced pattern recognition and prediction
- **Wearable Integration**: Direct sync with fitness trackers and smartwatches
- **Telemedicine**: Integration with healthcare provider platforms
- **Social Features**: Anonymous benchmarking and community insights
- **Advanced Analytics**: Predictive health modeling and risk assessment

### Research Integration
- **Clinical Studies**: Integration with ongoing longevity research
- **Biomarker Correlation**: Advanced correlation analysis between sleep and lab values
- **Genetic Factors**: Integration with genetic testing for personalized insights
- **Environmental Factors**: Sleep environment optimization recommendations

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📞 Support

For support, email support@longevityclinic.com or join our [Discord community](https://discord.gg/longevity).

---

**Built with ❤️ for better health and longevity**
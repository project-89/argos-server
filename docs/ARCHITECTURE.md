# Argos Server Architecture

## Core Systems

### 1. User Tracking & Identity
#### Fingerprinting System
- **Base Anonymous Users**
  - Managed through `fingerprint` service
  - Creates and maintains anonymous user identities
  - Serves as the foundation for linking all user interactions
  - Used across other services to maintain user context

#### Account System
- **Phantom Wallet Integration**
  - Primary authentication method
  - Links anonymous fingerprints to verified identities
  - Enables HiveMind participation
  - Manages wallet-based authorization

#### Transitory Fingerprinting
- **Social Identity Bridge**
  - Temporary storage for social identities (usernames, accounts)
  - Used in mini-games and social interactions
  - Can be linked to permanent fingerprint records via account creation
  - Enables progressive identity revelation

#### Identity Flow
```mermaid
graph TD
    A[Anonymous Visit] -->|Create| B[Fingerprint]
    A -->|Optional| C[Transitory Record]
    B -->|Phantom Login| D[Account Creation]
    C -->|Optional| D
    D --> E[HiveMind Profile]
```

#### Real-time Tracking
- **Visit Tracking**
  - Monitors user presence on sites
  - Real-time user activity tracking
  - Session management
  
- **Presence Service**
  - Real-time user state management
  - Active user tracking
  - Site engagement metrics

### 2. User Interaction Capture
#### Impressions System
- **Generic Data Capture**
  - Captures arbitrary interaction data
  - Examples:
    - Form submissions
    - Q&A responses
    - User choices
  - Linked to fingerprint IDs for user context
  - Flexible schema for various data types

### 3. Game Systems
#### HiveMind Mission Board
- **Core Components**
  - **Profile Service**
    - User progression tracking
    - Personal stats and metrics
    - Central user identity for HiveMind
    - Connects capabilities and skills
  
  - **Skill System**
    - **Dynamic Skill Management**
      - Natural language skill input
      - Semantic matching of similar skills
      - Automatic skill grouping and refinement
      - Growing skill taxonomy
    
    - **Skill Matching Service**
      - Processes natural language skill descriptions
      - Suggests existing matching skills
      - Creates new skills when unique
      - Helps maintain skill consistency
    
    - **Capability Service**
      - Links profiles to validated skills
      - Manages user's proven abilities
      - Tracks skill proficiency levels
      - Connects skills to mission requirements
    
    - **Stats Service**
      - Tracks user performance metrics
      - Monitors skill usage and growth
      - Provides progression insights
      - Supports profile development

  - **Mission Service**
    - Task creation and management
    - Progress tracking
    - Skill requirement matching
    - Reward distribution

#### Tag System
- **Mini-game Implementation**
  - Uses anon-users for social interactions
  - Example of social identity integration

### 4. Experimental Features
#### Reality Stability Index
- **Narrative Game Mechanic**
  - Calculates "matrix anomalies"
  - Tied to Project89 price movements
  - Creates dynamic narrative opportunities
  - Gamifies market activity

#### Price Integration
- **Market Connection**
  - Experimental price tracking
  - Used for reality stability calculations
  - Development and agent testing platform

### 5. Administration
#### Role System
- **Access Control**
  - Admin-only functionality
  - Currently in development
  - Future expansion planned

## Data Flow Examples

### User Identity Flow
```mermaid
graph LR
    A[Anonymous Visit] --> B[Fingerprint Created]
    B --> C[Transitory Records]
    C --> D[Social Identity]
    D --> E[Linked Fingerprint]
```

### Interaction Capture Flow
```mermaid
graph LR
    A[User Action] --> B[Impression Created]
    B --> C[Fingerprint Linked]
    C --> D[Data Stored]
    D --> E[Available for Analysis]
```

### Mission System Flow
```mermaid
graph LR
    A[User Profile] --> B[Skills/Capabilities]
    B --> C[Mission Assignment]
    C --> D[Progress Tracking]
    D --> E[Completion/Rewards]
```

## Integration Points

1. **Frontend Integration**
   - Fingerprinting for user tracking
   - Real-time presence monitoring
   - Mission board interface
   - Reality stability display

2. **External Systems**
   - Market data integration
   - Social platform connections
   - Analytics and monitoring

3. **Game Logic**
   - Mission progression
   - Reality stability calculations
   - User achievement tracking

## Security Considerations

1. **User Privacy**
   - Anonymous base fingerprinting
   - Optional identity linking
   - Data segregation

2. **Data Protection**
   - Secure impression storage
   - Protected user profiles
   - Controlled access to admin functions

3. **⚠️ Privacy Implications**
   - **Identity Linking**: The system can potentially link social identities to wallet addresses
   - **User Consent**: Implementation should require explicit user consent for identity linking
   - **Data Minimization**: Only store necessary linking data
   - **Right to be Forgotten**: Implement mechanisms to unlink/delete identity connections
   - **Transparency**: Make users aware of how their identities are linked
   - **Implementation Guidance**:
     ```typescript
     // Example: Implementing user consent
     interface CreateAccountRequest {
       walletAddress: string;
       fingerprintId?: string;
       transitoryFingerprintId?: string;
       userConsent: {
         identityLinking: boolean;
         dataRetention: boolean;
         timestamp: Date;
       };
     }
     ```

## Future Expansion Areas

1. **Enhanced Game Mechanics**
   - Expanded reality stability features
   - Advanced mission systems
   - More mini-game integrations

2. **Identity Management**
   - Additional social platform integration
   - Enhanced fingerprint linking
   - Progressive identity revelation

3. **Analytics and Insights**
   - Advanced user tracking
   - Behavior analysis
   - Game progression metrics 

#### Example Flows
```mermaid
graph TD
    A[User Input Skill] --> B[Skill Matching Service]
    B -->|Match Found| C[Suggest Existing Skill]
    B -->|No Match| D[Create New Skill]
    C --> E[Add to Capabilities]
    D --> E
    E --> F[Update Profile]
    F --> G[Available for Missions]
```

```mermaid
graph TD
    A[Profile] --> B[Capabilities]
    B --> C[Linked Skills]
    C --> D[Mission Requirements]
    D -->|Match| E[Mission Available]
    D -->|No Match| F[Skill Development Needed]
``` 
# HiveMind System Documentation

The HiveMind system is a comprehensive platform for managing user skills, capabilities, and missions within the Argos ecosystem. It enables dynamic skill discovery, mission matching, and user progression tracking.

## Core Components

### 1. Profile System
- **Purpose**: Central identity and progression tracking for HiveMind users
- **Features**:
  - User progression tracking
  - Skill and capability management
  - Performance metrics
  - Mission history
- **Integration Points**:
  - Links to Fingerprint system
  - Connects with Capability system
  - Interfaces with Stats service

### 2. Skill System
#### Natural Language Skill Processing
- **Input**: Users describe their skills in natural language
- **Processing**:
  ```
  User Input -> Semantic Analysis -> Match Existing/Create New -> Add to Taxonomy
  ```
- **Benefits**:
  - Organic skill taxonomy growth
  - Natural user interaction
  - Skill consolidation
  - Community-driven skill definitions

#### Skill Matching Algorithm
- **Matching Process**:
  1. Analyze input text
  2. Compare with existing skills
  3. Calculate similarity scores
  4. Suggest matches or create new
- **Considerations**:
  - Semantic similarity thresholds
  - Context awareness
  - Skill hierarchy

### 3. Capability System
#### Purpose
- Bridge between profiles and skills
- Validate user abilities
- Track proficiency levels
- Enable mission matching

#### Capability Types
1. **Verified Capabilities**
   - Proven through missions
   - Validated by system
   - Higher trust level

2. **Claimed Capabilities**
   - User-declared skills
   - Pending verification
   - Lower trust level

#### Proficiency Tracking
- **Levels**:
  - Novice
  - Intermediate
  - Advanced
  - Expert
- **Progression**:
  - Based on mission completion
  - Skill usage frequency
  - Performance metrics

### 4. Stats System
#### Metrics Tracked
- Mission completion rates
- Skill usage frequency
- Success rates by skill
- Progression velocity
- Contribution metrics

#### Analysis
- Skill growth patterns
- User engagement
- Mission effectiveness
- Community skill gaps

### 5. Mission System
#### Mission Types
1. **Skill-based Missions**
   - Require specific capabilities
   - Validate user skills
   - Provide skill progression

2. **Discovery Missions**
   - Introduce new skills
   - Encourage exploration
   - Community building

#### Matching Algorithm
```mermaid
graph TD
    A[Mission Requirements] --> B[User Capabilities]
    B --> C{Match Check}
    C -->|Full Match| D[Available]
    C -->|Partial Match| E[Suggested]
    C -->|No Match| F[Locked]
```

### 6. Agent System
#### Agent Types
1. **User Agents**
   - Represent user's operational capabilities
   - Have specific skill sets and ranks
   - Can execute missions and manage knowledge

2. **System Agents**
   - Perform specialized functions
   - Provide services to user agents
   - Maintain system operations

#### Agent Ranks
- **Initiate**: Basic functionality
- **Operative**: Standard operations
- **Specialist**: Domain expertise
- **Master**: Advanced capabilities
- **Administrator**: System-level privileges

#### Agent Creation Flow
```mermaid
graph TD
    A[Agent Registration] --> B[Basic Information]
    B --> C[Capability Definition]
    C --> D[Invite Code Validation]
    D --> E[Pending Agent]
    E --> F[Agent Activation]
```

### 7. Knowledge System
#### Knowledge Types
- **Personal Knowledge**: Owned by single agent
- **Shared Knowledge**: Accessible to multiple agents
- **Public Knowledge**: Available to all agents

#### Knowledge Operations
- **Creation**: Adding new knowledge to the system
- **Compression**: Condensing knowledge for efficient storage
- **Decompression**: Expanding knowledge for use
- **Sharing**: Granting access to other agents
- **Transfer**: Moving ownership between agents

## Authentication & Account Creation

### Phantom Wallet Integration
The HiveMind system uses Solana's Phantom wallet for authentication and account creation. This provides:
- Secure wallet-based authentication
- Permanent identity linking
- Blockchain-based verification

### Account Creation Flow
```mermaid
graph TD
    A[Anonymous User] -->|Has Fingerprint ID| B[Onboarding Process]
    A -->|Has AnonUser ID| C[Social Identity]
    B --> D[Phantom Wallet Authentication]
    C --> D
    D -->|Create Account| E[HiveMind Account]
    E -->|Link Fingerprint| F[Full HiveMind Access]
```

### Account Components
- **Wallet Address**: Primary identifier from Phantom
- **Fingerprint ID**: Links to anonymous tracking
- **AnonUser ID**: Optional social identity
- **Status**: Account state tracking
- **Roles**: Permission levels
- **Metadata**: Additional user data

### Identity Linking Process
1. **Initial State**:
   - Anonymous fingerprint or AnonUser exists
   - User has Phantom wallet

2. **Account Creation**:
   ```typescript
   interface CreateAccountRequest {
     walletAddress: string;
     fingerprintId: string;
     signature: string;
     message: string;
     onboardingId: string;
   }
   ```

3. **Verification Steps**:
   - Check for existing wallet account
   - Verify fingerprint existence
   - Verify signature with wallet
   - Link onboarding progress
   - Create permanent account record

4. **Final State**:
   - Wallet linked to fingerprint
   - AnonUser record linked if applicable
   - HiveMind account activated with roles

### Security Considerations
- One wallet per account
- One fingerprint per account
- AnonUsers can be claimed once
- Wallet ownership verification through signatures

## MongoDB Implementation

### Collection Structure
- **accounts**: Wallet-linked user accounts
- **profiles**: User profiles with capabilities
- **agents**: AI agents with capabilities
- **anonUsers**: Social identities from tags/games
- **capabilities**: User skills and abilities
- **missions**: Tasks and challenges
- **knowledge**: Agent knowledge base
- **stats**: Performance metrics

### Data Access Patterns
- Safe filter utilities for MongoDB ObjectId handling
- Transaction management for data consistency
- Proper error handling and recovery
- Consistent timestamp handling

## Data Structures

### Profile Schema
```typescript
interface Profile {
  id: string;
  userId: string;
  walletAddress: string;
  displayName: string;
  level: number;
  experience: number;
  contactInfo: ContactInfo;
  preferences: Preferences;
  createdAt: Date;
  updatedAt: Date;
}
```

### Skill Schema
```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  aliases: string[];
  keywords: string[];
  usageCount: number;
  createdAt: Date;
}
```

### Capability Schema
```typescript
interface Capability {
  id: string;
  profileId: string;
  skillId: string;
  level: ProficiencyLevel;
  verified: boolean;
  verifiedBy: string[];
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent Schema
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  version: string;
  source: AgentSource;
  capabilities: string[];
  identity: AgentIdentity;
  state: AgentState;
  integrations: AgentIntegration[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Knowledge Schema
```typescript
interface Knowledge {
  id: string;
  title: string;
  content: string;
  domain: KnowledgeDomain;
  ownerId: string;
  status: KnowledgeStatus;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage Examples

### Adding a New Skill
```typescript
// User input: "Advanced Python Data Analysis"
const skillMatch = await skillMatchingService.findMatch(input);
if (skillMatch.score > THRESHOLD) {
  suggestExistingSkill(skillMatch.skill);
} else {
  createNewSkill(input);
}
```

### Mission Matching
```typescript
const missionRequirements = mission.getRequiredCapabilities();
const userCapabilities = profile.getVerifiedCapabilities();

const matchScore = calculateMatchScore(
  missionRequirements,
  userCapabilities
);

if (matchScore > MISSION_THRESHOLD) {
  makeMissionAvailable(mission, profile);
}
```

### Agent Knowledge Creation
```typescript
// Create knowledge for an agent
const knowledgeData = {
  title: "Market Analysis Algorithm",
  content: "Detailed market analysis process...",
  domain: "finance",
  ownerId: agentId,
  status: "active",
  metadata: { source: "user_input", confidential: true }
};

const knowledge = await createKnowledge(knowledgeData);
```

## Best Practices

1. **Skill Creation**
   - Encourage specific descriptions
   - Maintain consistent categorization
   - Regular taxonomy review
   - Merge similar skills

2. **Capability Verification**
   - Progressive validation
   - Multiple verification methods
   - Clear proficiency criteria
   - Regular skill audits

3. **Mission Design**
   - Clear skill requirements
   - Balanced difficulty
   - Meaningful rewards
   - Progressive challenge

4. **Agent Management**
   - Consistent capability definitions
   - Proper authentication
   - Clear permission boundaries
   - Regular activity monitoring

5. **Knowledge Handling**
   - Proper domain categorization
   - Access control implementation
   - Regular knowledge assessment
   - Efficient compression techniques 
# Security Documentation

## Current Security Status

### Row Level Security (RLS) Implementation

#### ✅ Secured Tables
- **`agents`** - RLS enabled with proper policies
  - Public can view active agents (needed for widget)
  - Authenticated users can CRUD their own agents
- **`agent_conversations`** - RLS enabled with proper policies
  - Only authenticated users can access their own agent conversations
- **`agent_analytics`** - Inherits security from agents table

#### ❌ RLS Disabled Table
- **`transcriptions`** - RLS disabled to allow anonymous access to agent links
  - **Migration**: `20250618000320_temporary_disable_rls_again.sql`
  - **Rationale**: transcripts must remain publicly viewable until authenticated access is implemented

This configuration allows agent links to work without requiring the visitor to sign in. Once token-based access is finished, RLS will be re-enabled and the policies below will apply.
### Current Security Measures

1. **Authentication**: Supabase Auth with proper user management
2. **API Security**: Supabase RLS on most tables
3. **Input Validation**: Application-level validation for transcript content
4. **Rate Limiting**: Handled by Supabase infrastructure

## Security Roadmap

### Phase 1: Core Security Implementation (Completed ✅)
- [x] Enable RLS on agents and conversations tables
- [x] Document security considerations
- [x] Implement proper policies for user data access
- [x] Enable RLS on transcriptions table with full authentication
- [x] Remove widget dependency for improved security

### Phase 2: Advanced Security Features (Future)
- [ ] Add audit logging for all data operations
- [ ] Implement data encryption at rest for sensitive content
- [ ] Add monitoring and alerting for suspicious activities
- [ ] Re-enable RLS on `transcriptions` after implementing token-based access (target Q3 2025)

### Phase 3: Advanced Security (Future)
- [ ] Add audit logging for all data operations
- [ ] Implement data encryption at rest for sensitive content
- [ ] Add monitoring and alerting for suspicious activities
- [ ] Regular security audits and penetration testing

## Application Security Architecture

The application now uses a fully authenticated architecture:

### Current Secure Architecture
```
Authenticated User → Application → Supabase RLS → Database
```

### Security Benefits
1. **Full Authentication**: All database operations require user authentication
2. **Ownership Verification**: Users can only access their own data
3. **Comprehensive RLS**: All tables except `transcriptions` are protected with row-level security
4. **Audit Trail**: All operations logged with user context
5. **Limited Public Access**: Anonymous visitors can view transcripts via shared agent links while RLS is disabled

The following policies remain defined in the database but are inactive until RLS on `transcriptions` is re-enabled.

## Current Security Implementation

### RLS Policies in Place

1. **Transcriptions Table**:
   ```sql
   -- Users can only insert transcripts for their own agents
   CREATE POLICY "authenticated_users_insert_own_agent_transcripts"
     ON transcriptions FOR INSERT TO authenticated
     WITH CHECK (EXISTS (SELECT 1 FROM agents WHERE agents.id = transcriptions.agent_id AND agents.user_id = auth.uid()));
   
   -- Users can only view transcripts for their own agents
   CREATE POLICY "authenticated_users_select_own_agent_transcripts"
     ON transcriptions FOR SELECT TO authenticated
     USING (EXISTS (SELECT 1 FROM agents WHERE agents.id = transcriptions.agent_id AND agents.user_id = auth.uid()));
   ```

2. **Agents Table**:
   ```sql
   -- Public can view active agents (for discovery)
   -- Authenticated users can CRUD their own agents
   ```

3. **Agent Conversations Table**:
   ```sql
   -- Authenticated users can only access their own agent conversations
   ```

### Security Monitoring

To monitor the current security status:

```sql
-- Check RLS status (should all be 't' for true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('transcriptions', 'agents', 'agent_conversations');

-- View active policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('transcriptions', 'agents', 'agent_conversations')
ORDER BY tablename, policyname;

-- Check table comments for security notes
SELECT tablename, obj_description(oid) as comment
FROM pg_class 
WHERE relname IN ('transcriptions', 'agents', 'agent_conversations');
```

## Contact

For security concerns or questions, please review this documentation and consider the recommended improvements based on your security requirements.
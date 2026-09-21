import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: new URL('../backend/.env', import.meta.url) });

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const assessments = [
  {
    title: 'Python Level 1 — Beginner Foundations',
    category: 'Programming',
    difficulty: 'Beginner',
    duration_minutes: 15,
    challenge_count: 5,
    description: 'Assess foundational Python programming language concepts: dynamic variables, division operators, string immutability, loops, and function syntax.',
    is_active: true
  },
  {
    title: 'Python Level 2 — Intermediate Competency',
    category: 'Programming',
    difficulty: 'Intermediate',
    duration_minutes: 25,
    challenge_count: 5,
    description: 'Evaluate intermediate Python programming: mutable defaults, list comprehensions, dict safe access, try-except-finally, and context managers.',
    is_active: true
  },
  {
    title: 'Python Level 3 — Advanced Mastery',
    category: 'Programming',
    difficulty: 'Advanced',
    duration_minutes: 30,
    challenge_count: 5,
    description: 'Assess advanced Python core mechanics: OOP dunder methods, function decorators, generator iterators, GIL concurrency locks, and custom context managers.',
    is_active: true
  },
  {
    title: 'SQL & Data Analysis Benchmark',
    category: 'Data & SQL',
    difficulty: 'Intermediate',
    duration_minutes: 25,
    challenge_count: 6,
    description: 'Construct multi-table joins, subqueries, and aggregation queries on complex business data.',
    is_active: true
  },
  {
    title: 'Problem Solving & Algorithmic Logic',
    category: 'Core CS',
    difficulty: 'Advanced',
    duration_minutes: 35,
    challenge_count: 5,
    description: 'Evaluate core algorithmic reasoning, dynamic programming, and space-time optimization techniques.',
    is_active: true
  },
  {
    title: 'Real-Time API & Backend Architecture',
    category: 'Backend',
    difficulty: 'Advanced',
    duration_minutes: 45,
    challenge_count: 6,
    description: 'Design and debug RESTful APIs, asynchronous background tasks, and middleware authorization flow.',
    is_active: true
  },
  {
    title: 'Frontend UI/UX Practical Benchmark',
    category: 'Frontend',
    difficulty: 'Intermediate',
    duration_minutes: 25,
    challenge_count: 6,
    description: 'Build responsive layout components, dynamic state interactions, and accessibility features.',
    is_active: true
  }
];

const practiceChallenges = [
  {
    title: 'Debug This API',
    difficulty: 'Intermediate',
    estimated_minutes: 20,
    target_competency: 'Debugging',
    description: 'Identify and fix memory leaks, unhandled null responses, and race conditions in an ETL batch transformation script.',
    is_active: true
  },
  {
    title: 'Optimize This Python Function',
    difficulty: 'Advanced',
    estimated_minutes: 30,
    target_competency: 'Python',
    description: 'Refactor high-latency data parsing functions using dictionary lookups, list comprehensions, and generators.',
    is_active: true
  },
  {
    title: 'Analyze Customer Data',
    difficulty: 'Intermediate',
    estimated_minutes: 25,
    target_competency: 'Data Analysis',
    description: 'Construct multi-table joins, subqueries, and window functions to calculate monthly user retention cohorts.',
    is_active: true
  },
  {
    title: 'Solve a Business Scenario',
    difficulty: 'Advanced',
    estimated_minutes: 40,
    target_competency: 'Problem Solving',
    description: 'Design an event-driven inventory allocation system that maintains data consistency under peak concurrency.',
    is_active: true
  }
];

async function seed() {
  console.log('Seeding assessments...');
  for (const item of assessments) {
    const existing = await adminClient.from('assessments').select('id').eq('title', item.title).maybeSingle();
    if (!existing.data) {
      const res = await adminClient.from('assessments').insert(item).select();
      if (res.error) console.error('Error inserting assessment:', res.error.message);
      else console.log('Inserted assessment:', item.title);
    } else {
      console.log('Assessment already exists:', item.title);
    }
  }

  console.log('Seeding practice challenges...');
  for (const item of practiceChallenges) {
    const existing = await adminClient.from('practice_challenges').select('id').eq('title', item.title).maybeSingle();
    if (!existing.data) {
      const res = await adminClient.from('practice_challenges').insert(item).select();
      if (res.error) console.error('Error inserting practice challenge:', res.error.message);
      else console.log('Inserted practice challenge:', item.title);
    } else {
      console.log('Practice challenge already exists:', item.title);
    }
  }

  console.log('Seeding complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

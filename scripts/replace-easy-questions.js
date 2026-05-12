#!/usr/bin/env node
/**
 * scripts/replace-easy-questions.js
 *
 * Replace specific weak questions (by id) with harder scenario-based
 * versions. Idempotent: skips ids that have already been replaced
 * (detected via `_replaced: true` marker on the question object).
 *
 * To extend: add entries to REPLACEMENTS below, then run.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'free');

// Map: { 'pack-filename.json': { 'old-id': newQuestionObject, ... } }
const REPLACEMENTS = {
  // ─── AWS Cloud Practitioner (CLF-C02) ────────────────────────────────
  // Replaced the open-ended "What is X?" stems with scenario questions
  // that map to real exam objectives.
  'aws-cloud-practitioner.json': {
    'aws-003': {
      id: 'aws-003',
      question: 'A startup wants the lowest latency to end-users in Tokyo, São Paulo, and Frankfurt. Which AWS architectural choice BEST addresses this?',
      options: [
        'Deploy a single VPC in us-east-1 and use Direct Connect to each city',
        'Deploy resources in multiple AWS Regions (one per geography) fronted by Route 53 latency-based routing',
        'Deploy in a single Region and rely on AWS Outposts for global reach',
        'Deploy in a single Region and disable VPC peering'
      ],
      correct: 1,
      explanation: 'Multi-Region with latency-based DNS sends each user to the geographically-closest healthy endpoint — the canonical "Regions exist to reduce latency" pattern. A single Region cannot beat the speed of light to three continents. Outposts extend AWS into customer datacenters; they don\'t solve global latency by themselves.',
      tags: ['regions', 'global-architecture'],
      difficulty: 'medium'
    },
    'aws-005': {
      id: 'aws-005',
      question: 'A media site serves 90% static assets (video, images) and sees viral traffic spikes from specific countries. Which AWS service combination MOST DIRECTLY reduces origin load and improves time-to-first-byte for those viewers?',
      options: [
        'Amazon CloudFront in front of an S3 origin, with regional edge caches',
        'Application Load Balancer in front of an EC2 Auto Scaling group',
        'Amazon Route 53 with geolocation routing pointing directly to S3',
        'AWS Global Accelerator pointing to a single EC2 instance'
      ],
      correct: 0,
      explanation: 'CloudFront caches assets at 600+ edge locations and absorbs viral spikes — the origin barely sees the load. ALB+EC2 doesn\'t cache. Route 53 geolocation only resolves DNS; it doesn\'t cache content. Global Accelerator improves networking but doesn\'t cache static objects.',
      tags: ['cloudfront', 'cdn'],
      difficulty: 'medium'
    },
    'aws-007': {
      id: 'aws-007',
      question: 'A developer needs to give an EC2 instance permission to read from one specific S3 bucket. Following AWS best practice, which approach should they use?',
      options: [
        'Embed an IAM user\'s access key and secret in the instance\'s environment variables',
        'Attach an IAM role to the instance with a policy granting s3:GetObject on the bucket\'s ARN',
        'Make the bucket public and rely on bucket-policy IP allow-listing',
        'Share the AWS root user credentials across the team'
      ],
      correct: 1,
      explanation: 'IAM roles deliver short-lived credentials via the instance metadata service — no long-term secrets on disk, automatic rotation, and no risk of accidental commit. Hard-coded keys are the documented anti-pattern. Public buckets are an incident waiting to happen. Sharing root credentials violates the most basic AWS security guidance.',
      tags: ['iam', 'security'],
      difficulty: 'medium'
    },
    'aws-013': {
      id: 'aws-013',
      question: 'A company runs a steady-state production workload on a fleet of m5.large EC2 instances 24/7 for the next 3 years. Which pricing model offers the LARGEST discount versus On-Demand?',
      options: [
        '3-year Compute Savings Plans, all upfront',
        '3-year Standard Reserved Instances, all upfront',
        'Spot Instances with a 5-minute interruption tolerance',
        '1-year Convertible Reserved Instances, no upfront'
      ],
      correct: 1,
      explanation: '3-year Standard RIs with all-upfront payment historically yield the deepest discount (~72% off On-Demand for the m5 family) because of the maximum commitment + maximum cash. Compute Savings Plans are flexible but slightly less discount than equivalent Standard RIs. Spot is cheaper still BUT the workload is "steady-state production" — Spot interruptions disqualify it. Convertible RIs are less aggressive than Standard.',
      tags: ['pricing', 'ec2'],
      difficulty: 'hard'
    },
    'aws-019': {
      id: 'aws-019',
      question: 'Which AWS service is BEST suited to track who made an API call, when, from what IP address, and what parameters were used — for compliance auditing across an account?',
      options: [
        'Amazon CloudWatch Logs',
        'AWS Config',
        'AWS CloudTrail',
        'AWS Trusted Advisor'
      ],
      correct: 2,
      explanation: 'CloudTrail records every API call (who/when/where/what) and is the canonical audit log. CloudWatch Logs ingests application/system logs but doesn\'t natively record AWS API calls. AWS Config tracks resource state changes over time (complementary, not the same thing). Trusted Advisor gives best-practice checks, not an audit trail.',
      tags: ['governance', 'audit'],
      difficulty: 'medium'
    }
  },

  // ─── Azure Fundamentals (AZ-900) ─────────────────────────────────────
  'az-900.json': {
    'az900-001': {
      id: 'az900-001',
      question: 'In the Azure Shared Responsibility Model, which task is ALWAYS the customer\'s responsibility, regardless of whether they use IaaS, PaaS, or SaaS?',
      options: [
        'Patching the host operating system underneath their VMs',
        'Managing identity, accounts, and access controls for users of the workload',
        'Maintaining the physical security of the datacenter',
        'Configuring the underlying network fabric between Azure regions'
      ],
      correct: 1,
      explanation: 'Identity and access management (who can sign in, what they can do) is always the customer\'s job across IaaS/PaaS/SaaS. Host OS patching is Microsoft\'s job in PaaS/SaaS but the customer\'s in IaaS — so it varies. Datacenter physical security and the network fabric are always Microsoft.',
      tags: ['shared-responsibility'],
      difficulty: 'medium'
    },
    'az900-003': {
      id: 'az900-003',
      question: 'A workload requires the LOWEST possible latency between two VMs and tolerance for a single datacenter failure within the same metro area. Which Azure deployment best fits these constraints?',
      options: [
        'Deploy both VMs in the same Availability Zone within one Region',
        'Deploy the VMs in two different Availability Zones within the same Region',
        'Deploy the VMs in two paired Regions',
        'Deploy the VMs in two different Resource Groups within one Subscription'
      ],
      correct: 1,
      explanation: 'Two AZs in one Region give physical isolation (separate datacenters, independent power/network) with sub-millisecond inter-zone latency — the canonical "HA + low latency" trade. Same AZ doesn\'t survive a datacenter failure. Paired Regions introduce ~tens of ms latency. Resource Groups are management constructs, not a placement boundary.',
      tags: ['regions', 'availability'],
      difficulty: 'medium'
    },
    'az900-004': {
      id: 'az900-004',
      question: 'A storage account is configured with Geo-Zone-Redundant Storage (GZRS). How many copies of the data exist, and where?',
      options: [
        '3 copies, all within a single datacenter in the primary region',
        '3 copies across 3 zones in the primary region only',
        '6 copies: 3 across zones in the primary region and 3 in a single datacenter in the paired region',
        '6 copies across 3 zones in both the primary and the paired region'
      ],
      correct: 2,
      explanation: 'GZRS = ZRS in the primary region (3 copies, one per zone) + LRS in the paired region (3 copies in one datacenter). 6 total. The fourth option describes a hypothetical "GZRS with zonal copies in the paired region" which Azure does not offer (the paired region is LRS, not ZRS, in GZRS).',
      tags: ['storage', 'redundancy'],
      difficulty: 'hard'
    }
  }
};

function processFile(file, replacements) {
  const full = path.join(DATA_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  let replaced = 0;

  for (let i = 0; i < json.questions.length; i++) {
    const q = json.questions[i];
    if (!replacements[q.id]) continue;
    if (q._replaced) continue;
    const newQ = { ...replacements[q.id], _normalized: true, _lenbal: true, _replaced: true };
    json.questions[i] = newQ;
    replaced++;
  }

  if (replaced && json.meta) {
    const v = (json.meta.version || '1.0.0').split('.');
    v[v.length - 1] = String((parseInt(v[v.length - 1], 10) || 0) + 1);
    json.meta.version = v.join('.');
    json.meta.last_updated = new Date().toISOString().slice(0, 10);
  }
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  return { file, replaced };
}

function main() {
  let total = 0;
  for (const [file, replacements] of Object.entries(REPLACEMENTS)) {
    const r = processFile(file, replacements);
    console.log(`${r.file.padEnd(34)} replaced ${r.replaced}`);
    total += r.replaced;
  }
  console.log(`\nTOTAL: ${total} questions replaced with harder scenario-based versions`);
}

main();

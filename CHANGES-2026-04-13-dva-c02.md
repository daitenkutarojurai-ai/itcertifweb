# Changes — AWS DVA-C02 Launch (2026-04-13)

## Summary
Added AWS Developer Associate (DVA-C02) as a new live certification, created 60 original
scenario-based practice questions, and published a full 8-module study course page.

---

## Files changed

### New files
| File | Description |
|------|-------------|
| `data/free/aws-dva-c02.json` | 60 scenario-based MCQ questions, v1.0.0 |
| `learning/aws-dva-c02/index.html` | Full course page — 8 modules, ~35h, Spotify + quiz CTAs |

### Modified files
| File | Change |
|------|--------|
| `data/index.json` | Activated `aws-dva-c02` pack: `available: true`, `question_count: 60` |
| `data/courses.json` | Added `aws-dva-c02` course entry (8 modules, 35h, intermediate) |
| `certifications/aws.html` | DVA-C02 tile → Live, hero → 3 live exams / 220+ questions, updated prose + FAQ |
| `sitemap.xml` | Added `/learning/aws-dva-c02/` URL |
| `CLAUDE.md` | Documented all DVA-C02 changes in catalog and changelog sections |

---

## Question pack details

**File:** `data/free/aws-dva-c02.json`  
**Questions:** 60  
**Version:** 1.0.0  
**Format:** 4-option MCQ, scenario-based, with explanations and tags

### Domain coverage
| Domain | Weight | Questions |
|--------|--------|-----------|
| Development with AWS Services | 32% | ~19 |
| Security | 26% | ~16 |
| Deployment | 24% | ~14 |
| Troubleshooting & Optimization | 18% | ~11 |

### Key topics covered
- Lambda: timeout, provisioned concurrency, VPC, layers, event source mapping (SQS/Kinesis/DynamoDB Streams), async retries, DLQ, destinations, aliases, traffic shifting, parallelization factor
- API Gateway: proxy integration, caching, throttling, Lambda authorizer, Cognito authorizer, WebSocket API, 502 errors
- DynamoDB: partition key design, hot partitions, GSI/LSI, Query/Scan, ScanIndexForward, conditional writes, optimistic locking, DAX, transactions, Streams, bisect-on-error
- Messaging: SQS visibility timeout/DLQ/FIFO, SNS fan-out/retry, Kinesis parallelization, EventBridge
- Security: Cognito User Pools vs Identity Pools, JWT tokens (ID/Access/Refresh), fine-grained IAM with policy variables, KMS envelope encryption (GenerateDataKey), Secrets Manager rotation, SSM SecureString, S3 presigned URLs, cross-account Lambda, resource-based policies, RDS Proxy
- Deployment: CodeDeploy linear/canary for Lambda, CodePipeline manual approval, CodeBuild compute types/buildspec, Elastic Beanstalk blue/green/immutable/.ebextensions, SAM local testing, AppConfig feature flags
- IaC: CloudFormation change sets, cross-stack references lock, custom resources (ResponseURL), DeletionPolicy Retain, SAM Transform, CDK
- Observability: X-Ray annotations vs metadata, captureAWSv3Client, CloudWatch PutMetricData, Step Functions parallel state

---

## Course page details

**Path:** `/learning/aws-dva-c02/`  
**Modules:** 8  
**Duration:** ~35 hours  

| Module | Topic |
|--------|-------|
| 01 | AWS Lambda — Deep Dive |
| 02 | API Gateway — REST, HTTP & WebSocket APIs |
| 03 | DynamoDB — Design, Query & Optimization |
| 04 | Messaging — SQS, SNS, Kinesis & EventBridge |
| 05 | Security — Cognito, IAM, KMS & Secrets Manager |
| 06 | CI/CD — CodeCommit, CodeBuild, CodeDeploy & CodePipeline |
| 07 | Infrastructure as Code — CloudFormation, SAM & CDK |
| 08 | Observability & Optimization — X-Ray, CloudWatch & Step Functions |

**Engagement features:**
- Spotify podcast CTA (top + bottom + inline mid-course)
- Quiz start CTA (hero + mid-course banner)
- Exam snapshot table (exam code, passing score, duration, fee)
- Domain weight table with visual bar chart
- 8 high-frequency exam tip boxes
- 6-week structured study plan
- Related certification cards (CLF-C02, SAA-C03, Terraform, CKA)
- Full structured data: BreadcrumbList + Course JSON-LD
- SEO: canonical, OG, Twitter Card, article meta tags

---

## Website stats after this update
- **AWS live exams:** 3 (CLF-C02, SAA-C03, DVA-C02)
- **AWS questions:** 220+
- **Total live packs:** 22
- **Total courses:** 16

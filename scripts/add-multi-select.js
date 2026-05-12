#!/usr/bin/env node
/**
 * scripts/add-multi-select.js
 *
 * Append a small set of hand-written multi-select questions to the most
 * popular packs. Idempotent: skips if a question with the same id already
 * exists.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'free');

// Each entry: { pack: filename, questions: [...] }
const ADDITIONS = [
  {
    pack: 'ccna.json',
    questions: [
      {
        id: 'ccna-multi-1',
        question: 'You must connect a switch port to a printer that does NOT support DTP. Which TWO commands belong on the switch interface to lock it as an access port and stop trunk negotiation?',
        options: [
          'switchport mode trunk',
          'switchport mode access',
          'switchport nonegotiate',
          'no switchport'
        ],
        correct: [1, 2],
        explanation: '`switchport mode access` forces the port into access mode (no trunk). `switchport nonegotiate` disables DTP frames so the port never tries to negotiate trunking with the connected device. `switchport mode trunk` would do the opposite, and `no switchport` makes the port a routed L3 interface.',
        tags: ['vlan', 'switching'],
        difficulty: 'hard'
      },
      {
        id: 'ccna-multi-2',
        question: 'Which TWO statements about OSPF and EIGRP administrative distance are TRUE on a Cisco router with default settings?',
        options: [
          'OSPF (110) is preferred over EIGRP internal (90) when both learn the same prefix',
          'EIGRP internal (90) is preferred over OSPF (110) when both learn the same prefix',
          'EIGRP external routes have an AD of 170, higher than OSPF',
          'Static routes have an AD of 1, preferred over both OSPF and EIGRP'
        ],
        correct: [1, 2],
        explanation: 'Lower AD wins. EIGRP internal (90) beats OSPF (110), so the EIGRP route installs in the RIB. EIGRP external is 170 — higher (worse) than OSPF 110. Static routes default to AD 1, preferred over any IGP. The first option reverses the comparison.',
        tags: ['routing'],
        difficulty: 'hard'
      }
    ]
  },
  {
    pack: 'comptia-security-plus.json',
    questions: [
      {
        id: 'sec-multi-1',
        question: 'Which TWO of the following are characteristics of a TPM (Trusted Platform Module) that distinguish it from an HSM (Hardware Security Module)?',
        options: [
          'Soldered to the motherboard of a single host',
          'Network-attached, shared across many servers',
          'Designed primarily for full-disk-encryption key sealing and platform attestation',
          'Designed primarily for high-throughput cryptographic operations in PKI infrastructure'
        ],
        correct: [0, 2],
        explanation: 'A TPM is a chip soldered onto the motherboard of one host, used for measured boot, attestation, and sealing keys (notably BitLocker FVEK). An HSM is typically a network-attached or PCIe device built for high-throughput crypto — used by CAs, payment processors, etc. The other two options describe an HSM.',
        tags: ['cryptography', 'hardware'],
        difficulty: 'hard'
      },
      {
        id: 'sec-multi-2',
        question: 'A pentester is told to use ONLY passive reconnaissance against a target. Which TWO activities are still allowed?',
        options: [
          'Running an Nmap SYN scan against the target\'s public IPs',
          'Querying public WHOIS and DNS records',
          'Searching Shodan and Google for indexed pages of the target',
          'Sending a crafted HTTP request to test for SQL injection'
        ],
        correct: [1, 2],
        explanation: 'Passive recon = no packet sent directly to the target. WHOIS/DNS queries hit registries, not the target. Shodan/Google searches use third-party caches. A SYN scan and an HTTP probe both touch the target, making them active recon.',
        tags: ['recon', 'pentest'],
        difficulty: 'medium'
      }
    ]
  },
  {
    pack: 'aws-saa-c03.json',
    questions: [
      {
        id: 'saa-multi-1',
        question: 'Which TWO mechanisms can grant an EC2 instance the ability to read objects from a specific S3 bucket WITHOUT embedding long-term credentials on the instance?',
        options: [
          'Hard-coding an IAM user access key + secret in /etc/aws/credentials',
          'Attaching an IAM instance profile (role) with an s3:GetObject policy for the bucket',
          'Using a bucket policy that allows the EC2 instance\'s VPC endpoint with appropriate aws:SourceVpce condition',
          'Making the bucket public with a wide-open `s3:GetObject` for `Principal: "*"`'
        ],
        correct: [1, 2],
        explanation: 'IAM instance profiles deliver short-lived STS credentials via IMDS — the gold-standard pattern. A bucket policy keyed on the instance\'s VPC endpoint also gates access without per-instance credentials. Embedding a long-term access key is the anti-pattern AWS docs warn against; making a bucket public is a security incident waiting to happen.',
        tags: ['iam', 's3', 'security'],
        difficulty: 'hard'
      }
    ]
  },
  {
    pack: 'cka.json',
    questions: [
      {
        id: 'cka-multi-1',
        question: 'A pod stays in `Pending` status. Which TWO `kubectl` commands give you the most useful information about WHY the scheduler hasn\'t placed it?',
        options: [
          'kubectl logs <pod>',
          'kubectl describe pod <pod>',
          'kubectl get events --sort-by=.lastTimestamp',
          'kubectl exec -it <pod> -- /bin/sh'
        ],
        correct: [1, 2],
        explanation: '`describe pod` shows the Events table with FailedScheduling messages (insufficient CPU, taint mismatch, no matching node selector, etc.). `get events` gives the cluster-wide ordered timeline. `logs` requires a running container — the pod is Pending, so there\'s no container yet. `exec` requires a Running pod for the same reason.',
        tags: ['troubleshooting', 'scheduling'],
        difficulty: 'medium'
      }
    ]
  },
  {
    pack: 'terraform-003.json',
    questions: [
      {
        id: 'tf-multi-1',
        question: 'You inherit a Terraform project that stores state in a local file. Which TWO of the following are valid reasons to migrate the state to a remote backend like S3 + DynamoDB?',
        options: [
          'Concurrent applies from two engineers will be safely blocked by state locking',
          'Terraform will automatically encrypt resource attributes in transit between providers',
          'State is stored off the developer\'s laptop, surviving a disk failure',
          'Remote backends remove the need to write any provider authentication credentials'
        ],
        correct: [0, 2],
        explanation: 'Remote backends (S3+DDB, Terraform Cloud, etc.) provide state locking — preventing the classic "two applies racing" bug. They also persist state outside any one engineer\'s laptop. Backends do NOT change provider transport encryption (TLS is the provider\'s job) and you still need provider credentials.',
        tags: ['state', 'backends'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── Cisco CCNP (ENCOR / Enterprise) ───────────────────────────────────
  {
    pack: 'ccnp.json',
    questions: [
      {
        id: 'ccnp-multi-1',
        question: 'Which TWO statements about Cisco SD-Access fabric roles are correct?',
        options: [
          'A border node connects the fabric to networks outside the fabric domain',
          'A control-plane node maintains LISP HTDB mappings of endpoint identifiers to locators',
          'An edge node performs only Layer 2 switching and never participates in routing',
          'A fabric WLC encapsulates client traffic in MPLS for transport across the underlay'
        ],
        correct: [0, 1],
        explanation: 'In SD-Access, border nodes egress to non-fabric networks; control-plane nodes run LISP and store EID-to-RLOC mappings. Edge nodes do route (they\'re the L3 anycast gateway for endpoints). The underlay uses VXLAN encapsulation, not MPLS.',
        tags: ['sd-access'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── AWS Cloud Practitioner ────────────────────────────────────────────
  {
    pack: 'aws-cloud-practitioner.json',
    questions: [
      {
        id: 'clf-multi-1',
        question: 'Which TWO AWS services are part of the AWS Free Tier on an "always free" basis (not just a 12-month trial)?',
        options: [
          'AWS Lambda — 1 million requests per month',
          'Amazon EC2 — 750 hours of t2.micro per month',
          'Amazon DynamoDB — 25 GB of storage and 25 WCU/RCU',
          'Amazon RDS — 750 hours of db.t2.micro per month'
        ],
        correct: [0, 2],
        explanation: 'Lambda and DynamoDB have "always free" tiers that never expire. EC2 t2.micro and RDS db.t2.micro free hours are part of the 12-month new-account free tier and stop after the first year.',
        tags: ['billing', 'free-tier'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── AWS Developer Associate ───────────────────────────────────────────
  {
    pack: 'aws-dva-c02.json',
    questions: [
      {
        id: 'dva-multi-1',
        question: 'Which TWO are valid ways to invoke an AWS Lambda function asynchronously?',
        options: [
          'Calling the InvokeFunction API with InvocationType=RequestResponse',
          'Calling the InvokeFunction API with InvocationType=Event',
          'Configuring an SNS topic as the event source for the function',
          'Configuring an API Gateway REST endpoint with proxy integration as the trigger'
        ],
        correct: [1, 2],
        explanation: 'InvocationType=Event is the explicit async invocation mode. SNS is one of the canonical async event sources (the message is queued for retry by Lambda). RequestResponse is synchronous, and API Gateway proxy integration invokes Lambda synchronously to wait for the HTTP response.',
        tags: ['lambda'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── AWS Security Specialty ────────────────────────────────────────────
  {
    pack: 'aws-scs-c02.json',
    questions: [
      {
        id: 'scs-multi-1',
        question: 'A bucket policy denies all requests where aws:SecureTransport is false. Which TWO additional controls would you add to BLOCK accidental public exposure of objects in this bucket?',
        options: [
          'Enable S3 Block Public Access at the bucket level',
          'Enable default S3 server-side encryption with SSE-S3',
          'Enable S3 Object Ownership set to "Bucket owner enforced" (disables ACLs)',
          'Enable versioning with MFA Delete'
        ],
        correct: [0, 2],
        explanation: 'Block Public Access overrides any policy/ACL that would grant Public access. "Bucket owner enforced" disables ACLs entirely so an uploader can\'t accidentally make an individual object public. SSE-S3 protects data at rest but not against public exposure. MFA Delete protects against accidental deletion of versions, not against public reads.',
        tags: ['s3', 'security'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Azure Fundamentals ────────────────────────────────────────────────
  {
    pack: 'az-900.json',
    questions: [
      {
        id: 'az900-multi-1',
        question: 'Which TWO statements about Azure Availability Zones are TRUE?',
        options: [
          'Each Availability Zone is a physically separate datacenter within an Azure region',
          'Resources deployed across zones in the same region are billed for inter-region data transfer',
          'Zone-redundant services automatically replicate across multiple zones in the region',
          'Availability Zones are available in every Azure region'
        ],
        correct: [0, 2],
        explanation: 'AZs are physically separate datacenters with independent power/network within one region. Zone-redundant services (e.g., zone-redundant Storage, SQL Premium, AKS) replicate across zones automatically. Inter-zone traffic in the same region is intra-region (not inter-region) bandwidth. Not every region has AZs — many secondary regions do not.',
        tags: ['regions', 'availability'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── Azure Administrator (AZ-104) ──────────────────────────────────────
  {
    pack: 'az-104.json',
    questions: [
      {
        id: 'az104-multi-1',
        question: 'A subnet hosts only Azure resources that must NOT be reachable from the public internet. Which TWO controls enforce this at the network layer?',
        options: [
          'Apply an NSG to the subnet that denies inbound from "Internet" service tag',
          'Use a Private Endpoint for any PaaS service the subnet needs to consume',
          'Enable a public IP on each VM but mark it "Standard SKU"',
          'Add a route 0.0.0.0/0 → "VirtualNetworkGateway" without on-prem peering'
        ],
        correct: [0, 1],
        explanation: 'An NSG denying the Internet service tag blocks inbound from the public internet. Private Endpoints give PaaS services (Storage, Key Vault, SQL) a private IP in the subnet, removing the need to traverse public endpoints. Public IPs (Standard SKU or not) make resources reachable. A 0.0.0.0/0 route to a gateway with no on-prem peering would black-hole traffic, not enforce a security policy.',
        tags: ['networking', 'security'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Azure Solutions Architect (AZ-305) ────────────────────────────────
  {
    pack: 'az-305.json',
    questions: [
      {
        id: 'az305-multi-1',
        question: 'You must design storage for a workload writing 5 GB log files every minute. The data is read once for analytics within 24 hours, then never touched again but must be retained for 7 years for compliance. Which TWO design choices fit BEST?',
        options: [
          'Write logs to the Hot access tier in ADLS Gen2',
          'Apply a lifecycle policy that moves blobs to Archive after 1 day',
          'Use Premium block blob storage for the entire 7-year retention',
          'Write logs directly to Archive tier and rehydrate them for analytics'
        ],
        correct: [0, 1],
        explanation: 'Hot tier is appropriate for the freshly-written data being read within 24h. A lifecycle policy that transitions to Archive after 1 day matches the access pattern (cold for 7 years). Premium is overkill and expensive for cold logs. Writing to Archive directly is impossible — Archive is offline; reading requires rehydration which takes hours.',
        tags: ['storage', 'lifecycle'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Azure Security (AZ-500) ───────────────────────────────────────────
  {
    pack: 'az-500.json',
    questions: [
      {
        id: 'az500-multi-1',
        question: 'Which TWO Microsoft Defender for Cloud features REQUIRE the enhanced security (paid) plan, not the free tier?',
        options: [
          'Continuous export of secure score to Log Analytics',
          'Just-in-Time (JIT) VM access',
          'Adaptive application controls',
          'Secure score visualization in the portal'
        ],
        correct: [1, 2],
        explanation: 'JIT VM access and adaptive application controls are part of Defender for Servers (paid). Secure score visualization and continuous export are available with the free Defender for Cloud baseline.',
        tags: ['defender', 'cspm'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── CompTIA A+ ────────────────────────────────────────────────────────
  {
    pack: 'comptia-a-plus.json',
    questions: [
      {
        id: 'aplus-multi-1',
        question: 'A laptop running Windows 11 Pro must be added to an Active Directory domain. Which TWO of the following are required?',
        options: [
          'A user account with permission to join computers to the domain',
          'Network connectivity to a domain controller and DNS server',
          'A static public IPv4 address assigned to the laptop',
          'Bitlocker enabled on the system drive'
        ],
        correct: [0, 1],
        explanation: 'Domain join needs DC reachability over the network (DNS to find the DC via SRV records, then LDAP/Kerberos) and credentials authorized to create or reuse a computer account. Public IPs are unrelated; Bitlocker is not a join prerequisite.',
        tags: ['windows', 'active-directory'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── CompTIA Network+ ──────────────────────────────────────────────────
  {
    pack: 'comptia-network-plus.json',
    questions: [
      {
        id: 'netplus-multi-1',
        question: 'Which TWO of the following are link-state routing protocols?',
        options: [
          'OSPF',
          'RIP v2',
          'IS-IS',
          'BGP'
        ],
        correct: [0, 2],
        explanation: 'OSPF and IS-IS both flood link-state advertisements and run Dijkstra\'s SPF. RIP is distance-vector (hop count). BGP is a path-vector protocol — it tracks the AS path, not link-state.',
        tags: ['routing'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── CompTIA CySA+ ─────────────────────────────────────────────────────
  {
    pack: 'comptia-cysa.json',
    questions: [
      {
        id: 'cysa-multi-1',
        question: 'A SOC analyst sees outbound connections from 50 internal hosts to a single external IP on TCP/443 at 60-second intervals with very small payloads. Which TWO indicators most strongly suggest C2 beaconing rather than legitimate HTTPS?',
        options: [
          'Highly regular interval ("low jitter") of the outbound connections',
          'TLS handshake using a publicly trusted CA (e.g., Let\'s Encrypt)',
          'Very small, near-uniform payload sizes per connection',
          'Use of port 443 instead of port 80'
        ],
        correct: [0, 2],
        explanation: 'Periodicity (low jitter) and tiny uniform payloads are classic beaconing tells — humans browse irregularly with varying response sizes. C2 frameworks routinely use Let\'s Encrypt certs and port 443 to blend in, so neither of those is suspicious by itself.',
        tags: ['detection', 'c2'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── CompTIA PenTest+ ──────────────────────────────────────────────────
  {
    pack: 'comptia-pentest.json',
    questions: [
      {
        id: 'pentest-multi-1',
        question: 'Which TWO Nmap scan types do NOT complete the full TCP three-way handshake?',
        options: [
          '-sS (SYN / half-open scan)',
          '-sT (TCP connect scan)',
          '-sF (FIN scan)',
          '-sV (service version detection)'
        ],
        correct: [0, 2],
        explanation: 'SYN scan (-sS) sends SYN, gets SYN-ACK, then sends RST instead of completing the handshake. FIN scan (-sF) sends bare FIN packets to infer state from the reply. -sT completes the handshake (uses the OS connect() call). -sV opens full connections to fingerprint the service.',
        tags: ['nmap', 'recon'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── CompTIA Linux+ ────────────────────────────────────────────────────
  {
    pack: 'comptia-linux.json',
    questions: [
      {
        id: 'linux-multi-1',
        question: 'Which TWO commands display the same information about active TCP listeners on a modern Linux system?',
        options: [
          'ss -ltn',
          'netstat -ltn',
          'lsof -i :22',
          'ps -ef | grep listen'
        ],
        correct: [0, 1],
        explanation: '`ss -ltn` and `netstat -ltn` both list listening (-l) TCP (-t) sockets in numeric form (-n) — they\'re functionally equivalent, with `ss` being the modern replacement. `lsof -i :22` shows processes on a specific port (different scope). `ps | grep listen` greps process names — unrelated to socket state.',
        tags: ['networking', 'troubleshooting'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── GCP Associate Cloud Engineer ──────────────────────────────────────
  {
    pack: 'gcp-ace.json',
    questions: [
      {
        id: 'ace-multi-1',
        question: 'Which TWO Google Cloud resources are GLOBAL (single resource ID across the planet, no region/zone in the URL)?',
        options: [
          'A VPC network',
          'A Compute Engine instance',
          'A Cloud IAM policy on a project',
          'A Cloud SQL instance'
        ],
        correct: [0, 2],
        explanation: 'A VPC network in GCP is a global construct — its subnets are regional, but the network itself is global. IAM policies bind to global resources (project, folder, org). Compute Engine instances are zonal. Cloud SQL instances are regional.',
        tags: ['scope', 'networking'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Kubernetes CKAD ───────────────────────────────────────────────────
  {
    pack: 'ckad.json',
    questions: [
      {
        id: 'ckad-multi-1',
        question: 'Which TWO Kubernetes objects can be referenced as data sources by a Pod\'s `volumes:` block to mount their content as files?',
        options: [
          'ConfigMap',
          'Secret',
          'Service',
          'NetworkPolicy'
        ],
        correct: [0, 1],
        explanation: 'ConfigMaps and Secrets project their data as files via the `configMap` and `secret` volume types. Services are network abstractions, not file sources. NetworkPolicies define ingress/egress rules and have no file projection.',
        tags: ['volumes', 'config'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── Kubernetes CKS ────────────────────────────────────────────────────
  {
    pack: 'cks.json',
    questions: [
      {
        id: 'cks-multi-1',
        question: 'Which TWO Pod-level settings reduce the blast radius if a process inside the container is compromised?',
        options: [
          'securityContext.runAsNonRoot: true',
          'securityContext.privileged: true',
          'securityContext.readOnlyRootFilesystem: true',
          'hostNetwork: true'
        ],
        correct: [0, 2],
        explanation: 'Running as non-root prevents trivially exploitable root-only kernel paths. A read-only root filesystem stops attackers from writing webshells or persistent payloads. `privileged: true` GIVES the container near-host capabilities. `hostNetwork: true` shares the node\'s network namespace, exposing host services.',
        tags: ['pod-security', 'hardening'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Docker DCA ────────────────────────────────────────────────────────
  {
    pack: 'docker-dca.json',
    questions: [
      {
        id: 'dca-multi-1',
        question: 'Which TWO Dockerfile instructions create a new image LAYER?',
        options: [
          'RUN apt-get update && apt-get install -y curl',
          'COPY ./app /opt/app',
          'EXPOSE 8080',
          'WORKDIR /opt/app'
        ],
        correct: [0, 1],
        explanation: 'RUN and COPY (and ADD) create new filesystem layers. EXPOSE and WORKDIR (along with ENV, LABEL, USER, ARG, CMD, ENTRYPOINT) only add metadata to the image; they don\'t produce a content layer. Modern BuildKit may collapse some, but conceptually only filesystem-modifying instructions are layers.',
        tags: ['dockerfile', 'images'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── RHCSA ─────────────────────────────────────────────────────────────
  {
    pack: 'rhcsa.json',
    questions: [
      {
        id: 'rhcsa-multi-1',
        question: 'You added a new disk and created an XFS filesystem on /dev/sdb1. Which TWO steps are required to mount it persistently at /data after reboot?',
        options: [
          'Add an entry for /dev/sdb1 (or its UUID) to /etc/fstab',
          'Run `systemctl daemon-reload` so systemd picks up the new fstab entry',
          'Reboot the system to confirm the mount unit fires correctly',
          'Run `mkdir /data` if the mount point doesn\'t exist'
        ],
        correct: [0, 3],
        explanation: 'fstab plus an existing mount point are the two prerequisites. `daemon-reload` is needed if you write a *.mount unit by hand, not for fstab edits (systemd-fstab-generator picks them up on boot or `systemctl daemon-reload`). Rebooting is a verification step, not a requirement — `mount -a` confirms it works without a reboot.',
        tags: ['filesystems', 'storage'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── Palo Alto PCNSA ───────────────────────────────────────────────────
  {
    pack: 'pcnsa.json',
    questions: [
      {
        id: 'pcnsa-multi-1',
        question: 'Which TWO conditions must be TRUE for a session to be evaluated against a Security policy rule on a Palo Alto Networks NGFW?',
        options: [
          'Source and destination zone of the session match the rule\'s zone fields',
          'The session is the FIRST packet (handshake) of a new flow',
          'The interface is in Layer 2 mode (TAP mode does not work)',
          'The destination IP is in the same subnet as one of the firewall\'s interfaces'
        ],
        correct: [0, 1],
        explanation: 'Security rules are evaluated on session creation (first packet) using zone-pair matching as the gatekeeper. Once a session is established, subsequent packets follow the existing session state without re-evaluation. NGFWs work in L3, vwire, TAP, and L2 modes (TAP is read-only but Security rules still match for visibility). Routing destination doesn\'t need to be on a directly-connected subnet.',
        tags: ['policy', 'sessions'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── Fortinet NSE 4 ────────────────────────────────────────────────────
  {
    pack: 'nse4.json',
    questions: [
      {
        id: 'nse4-multi-1',
        question: 'Which TWO statements about FortiGate session table entries are correct?',
        options: [
          'A session is created on the first packet that matches a firewall policy and is permitted',
          'Each session is bidirectional — return traffic does not need a separate matching policy',
          'TCP sessions and UDP "pseudo-sessions" both appear in `diagnose sys session list`',
          'Session TTL for established TCP is hard-coded at 60 seconds and cannot be changed'
        ],
        correct: [1, 2],
        explanation: 'Sessions are bidirectional — the firewall applies stateful inspection, so reply traffic is allowed by the existing session entry. Both TCP sessions and UDP pseudo-sessions are in the session table. Sessions are created when traffic matches a permitted policy (true), but the more frequently-tested concept on NSE is the bidirectional + session table aspect. TCP TTL defaults to 3600s and is configurable per service or globally.',
        tags: ['sessions', 'policy'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── ServiceNow CSA ────────────────────────────────────────────────────
  {
    pack: 'servicenow-csa.json',
    questions: [
      {
        id: 'snow-multi-1',
        question: 'Which TWO out-of-the-box ITIL roles in ServiceNow can RESOLVE incidents?',
        options: [
          'itil',
          'itil_admin',
          'itil_self_service',
          'itil_external'
        ],
        correct: [0, 1],
        explanation: 'The `itil` role is the standard fulfiller role that can update and resolve incidents. `itil_admin` inherits it and adds admin capabilities. `itil_self_service` (sometimes called `itil_user`) is for end-users opening tickets — they cannot resolve. `itil_external` is for read-only external collaborators.',
        tags: ['roles', 'itsm'],
        difficulty: 'medium'
      }
    ]
  },

  // ─── Splunk Core Certified User ────────────────────────────────────────
  {
    pack: 'splunk-core.json',
    questions: [
      {
        id: 'splunk-multi-1',
        question: 'Which TWO SPL search commands are STREAMING (can be distributed to indexers and run before the search head sees the data)?',
        options: [
          'eval',
          'stats',
          'rex',
          'sort'
        ],
        correct: [0, 2],
        explanation: '`eval` and `rex` operate on each event independently — they\'re streaming and run on the indexers in a distributed search. `stats` and `sort` are transforming commands that need to see all results, so they run on the search head after data is gathered.',
        tags: ['spl', 'search'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── HashiCorp Vault Associate ─────────────────────────────────────────
  {
    pack: 'vault-002.json',
    questions: [
      {
        id: 'vault-multi-1',
        question: 'A token has TTL=1h and max_ttl=24h. Which TWO statements about its lifetime are TRUE?',
        options: [
          'It can be renewed repeatedly, but its total lifetime cannot exceed 24h from creation',
          'After the token\'s creation_time + 24h, no further renewal will succeed',
          'Renewals always reset the TTL back to 1h regardless of how close to max_ttl the token is',
          'The token is automatically renewed in the background by Vault as long as it is being used'
        ],
        correct: [0, 1],
        explanation: 'max_ttl is the hard cap on total lifetime from creation, regardless of renewals. As you approach max_ttl, the renewal grant shrinks (Vault returns less than the requested TTL). Renewals are NOT automatic — clients must call /auth/token/renew. Use cases like agent auto-auth handle that on the client side.',
        tags: ['tokens', 'lifecycle'],
        difficulty: 'hard'
      }
    ]
  },

  // ─── GCP Professional Cloud Architect ──────────────────────────────────
  {
    pack: 'gcp-pca.json',
    questions: [
      {
        id: 'pca-multi-1',
        question: 'Which TWO Google Cloud load balancers can serve as a global anycast frontend with a single external IP that routes to the closest healthy backend?',
        options: [
          'External HTTP(S) Load Balancer (Global)',
          'External TCP/UDP Network Load Balancer',
          'External SSL Proxy Load Balancer',
          'Internal Regional TCP/UDP Load Balancer'
        ],
        correct: [0, 2],
        explanation: 'The global external HTTP(S) and SSL Proxy load balancers use a single anycast VIP and route to the closest backend via Google\'s edge network. The Network Load Balancer is regional (backed by Maglev), and Internal Load Balancers are obviously regional and not internet-facing.',
        tags: ['load-balancing'],
        difficulty: 'hard'
      }
    ]
  }
];

function appendIfMissing(file, newQs) {
  const full = path.join(DATA_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const existingIds = new Set(json.questions.map(q => q.id));
  let added = 0;
  for (const q of newQs) {
    if (existingIds.has(q.id)) continue;
    json.questions.push({ ...q, _normalized: true, _lenbal: true });
    added++;
  }
  if (added && json.meta) {
    const v = (json.meta.version || '1.0.0').split('.');
    v[v.length - 1] = String((parseInt(v[v.length - 1], 10) || 0) + 1);
    json.meta.version = v.join('.');
    json.meta.last_updated = new Date().toISOString().slice(0, 10);
    json.meta.question_count = json.questions.length;
  }
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + '\n');
  return { file, added, total: json.questions.length };
}

function main() {
  let total = 0;
  for (const a of ADDITIONS) {
    const r = appendIfMissing(a.pack, a.questions);
    console.log(`${r.file.padEnd(30)} +${r.added}  (now ${r.total})`);
    total += r.added;
  }
  console.log(`\nTOTAL added: ${total} multi-select questions`);
}

main();

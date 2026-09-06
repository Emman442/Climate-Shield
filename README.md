# ClimateShield

### Parametric Climate Insurance for Farmers, Powered by GenLayer

ClimateShield is a decentralized parametric agricultural insurance protocol built on **GenLayer**.

It enables farmers to purchase drought insurance policies using GEN, while automatically monitoring real-world soil moisture conditions through the **Open-Meteo API**. When predefined drought conditions persist for a specified number of consecutive days, the protocol can automatically trigger payouts to eligible farmers.

Instead of relying on manual claims, paperwork, or centralized insurance adjusters, ClimateShield uses deterministic policy rules, externally sourced weather data, and GenLayer's consensus infrastructure to determine when an insurance event has occurred.



---

# Overview

ClimateShield provides **parametric drought insurance** for farmers.

A farmer does not need to submit a claim after experiencing drought.

Instead, the farmer purchases a policy against predefined environmental conditions.

For example:

> A farmer purchases a policy covering ₦X worth of agricultural risk.
> The policy specifies that if soil moisture remains below a defined threshold for 5 consecutive days, a drought event is considered to have occurred.
> Once the trigger is verified, the farmer automatically receives the predefined coverage payout.

The contract handles the policy, weather readings, trigger conditions, and payout records on-chain.

ClimateShield therefore transforms insurance from a **claims-based model** into a **rule-based automated model**.

---

# The Problem

Agricultural farmers are highly exposed to climate-related risks.

Drought can destroy crops, reduce yields, and eliminate a farmer's income for an entire season.

Traditional agricultural insurance faces several challenges:

* Farmers often need to understand complicated insurance products.
* Claims can require extensive documentation.
* Claims may take significant time to process.
* Insurance providers need expensive claims assessment infrastructure.
* Rural farmers can have limited access to conventional financial services.
* Disputes can occur over whether a qualifying event actually happened.
* Manual verification creates operational overhead.
* Small farmers may find traditional insurance economically unattractive.

ClimateShield approaches the problem differently.

Instead of asking:

> "Did this farmer submit enough evidence to prove their loss?"

the protocol asks:

> "Did the predefined environmental condition occur?"

If the condition occurs, the policy pays.

---

# The Solution

ClimateShield uses **parametric insurance**.

A policy is defined around an objective environmental trigger.

The current implementation uses **soil moisture** as the primary drought indicator.

Each insurance pool defines:

* Geographic region
* Latitude
* Longitude
* Coverage radius
* Soil moisture drought threshold
* Number of consecutive drought days required
* Premium per policy
* Coverage per policy
* Maximum number of policies

Weather data is retrieved from Open-Meteo and evaluated through GenLayer's nondeterministic web infrastructure and Equivalence Principle.

Once the trigger condition is satisfied, the contract executes payouts for eligible farmers.

---

# How ClimateShield Works

The complete flow is:

```text
                    ┌─────────────────────┐
                    │       Admin         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Create Pool      │
                    │ Region + Parameters │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Farmer Buys       │
                    │      Policy         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Premium enters    │
                    │      Vault          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Record Weather      │
                    │ Reading             │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Open-Meteo       │
                    │ Soil Moisture Data  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ GenLayer Consensus  │
                    │ + Drought Classifier│
                    └──────────┬──────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │ Consecutive drought days │
                  │ >= required threshold?  │
                  └────────────┬─────────────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                    NO                  YES
                     │                   │
                     ▼                   ▼
              Continue monitoring   Trigger payout
                                         │
                                         ▼
                              ┌────────────────────┐
                              │ Farmers receive    │
                              │ coverage payout    │
                              └────────────────────┘
```

---

# Core Features

## 1. Decentralized Insurance Pools

Administrators can create multiple insurance pools covering different geographic regions.

Each pool can have its own:

* Region
* Coordinates
* Drought threshold
* Trigger duration
* Premium
* Coverage
* Capacity

This allows different agricultural regions to have different risk parameters.

---

## 2. Permissionless Policy Purchase

Farmers do not need to register an account with ClimateShield before purchasing insurance.

A wallet can directly purchase a policy by sending the exact required GEN premium.

Each wallet can have one active policy per pool.

---

## 3. Real-World Weather Data

The protocol retrieves soil moisture information from Open-Meteo using the pool's geographic coordinates.

The contract currently requests:

```text
soil_moisture_0_to_1cm
```

This represents volumetric soil water content for the top soil layer.

---

## 4. GenLayer-Powered Data Verification

External web data is inherently nondeterministic.

ClimateShield therefore uses GenLayer's nondeterministic web access together with:

```python
gl.eq_principle.prompt_non_comparative(...)
```

to establish an agreed interpretation of the external weather response.

---

## 5. Automatic Parametric Triggers

The farmer does not manually submit a drought claim.

The contract checks the most recent readings against the pool's configured drought condition.

If enough consecutive readings satisfy the drought criteria, the pool triggers.

---

## 6. Automatic Payout Records

Every payout creates an immutable `PayoutRecord` containing:

* Payout ID
* Pool ID
* Farmer
* Amount
* Trigger reason
* Timestamp

This provides an auditable history of insurance payouts.

---

## 7. Vault Funding

Insurance pools can receive additional funds from administrators or sponsors.

This allows pools to maintain sufficient liquidity when premium revenue alone is insufficient to cover the configured coverage amounts.

---

## 8. Emergency Admin Override

An administrator can manually trigger a pool when external data is unavailable but there is a legitimate reason to activate the insurance event.

This provides an operational fallback for exceptional circumstances.

---

# Architecture

ClimateShield consists of several logical components.

```text
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                                                             │
│  Pools │ Policies │ Weather │ Drought Status │ Payouts    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLIMATESHIELD CONTRACT                   │
│                                                             │
│  Pool Management                                             │
│  Policy Management                                           │
│  Weather Readings                                            │
│  Trigger Detection                                           │
│  Payout Processing                                           │
│  Vault Accounting                                             │
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
                ▼                          ▼
      ┌──────────────────┐       ┌──────────────────────┐
      │   GenLayer       │       │     GEN Payments     │
      │ Consensus Layer  │       │                      │
      └────────┬─────────┘       └──────────────────────┘
               │
               ▼
      ┌──────────────────┐
      │   Open-Meteo     │
      │ Weather API      │
      └──────────────────┘
```

---

# Insurance Lifecycle

## Step 1 — Pool Creation

The administrator creates a pool.

Example configuration:

```text
Pool: Abuja Drought Shield

Region: Abuja Agricultural Zone

Latitude: 9.0572
Longitude: 7.4898

Radius: 25 km

Drought threshold: 0.15

Consecutive days: 5

Premium: 10 GEN

Coverage: 50 GEN

Maximum policies: 1,000
```

The pool initially has the status:

```text
open
```

---

## Step 2 — Farmer Purchases Policy

A farmer sends exactly the configured premium.

For example:

```text
Premium = 10 GEN
```

The contract verifies:

```python
gl.message.value == premium * 10**18
```

If valid, the farmer receives a policy.

The pool's status changes from:

```text
open
```

to:

```text
active
```

once the first policy is purchased.

---

## Step 3 — Weather Monitoring

A caller invokes:

```python
record_daily_reading(pool_id, day)
```

The contract retrieves weather information for the pool's coordinates.

The resulting reading is stored on-chain.

---

## Step 4 — Drought Classification

The soil moisture value is compared against the pool's configured threshold.

Four classifications are supported:

| Classification | Condition                              |
| -------------- | -------------------------------------- |
| `normal`       | Moisture >= threshold                  |
| `watch`        | Moisture < threshold and ratio >= 0.75 |
| `warning`      | Moisture ratio >= 0.50 and < 0.75      |
| `severe`       | Moisture ratio < 0.50                  |

Where:

```text
ratio = soil_moisture / drought_threshold
```

---

## Step 5 — Trigger Evaluation

Anyone can call:

```python
check_trigger(pool_id)
```

The contract examines the latest configured number of readings.

For example, if:

```text
consecutive_days_required = 5
```

then the contract checks the last five readings.

The trigger fires only if every checked reading is either:

```text
warning
```

or:

```text
severe
```

---

## Step 6 — Payout

Once the trigger is satisfied, eligible farmers are paid.

A policy is eligible when:

```text
policy.active == true
policy.claimed == false
```

After payout:

```text
policy.claimed = true
```

and the pool becomes:

```text
triggered
```

---

# Drought Detection

The drought classifier is implemented by `_classify_drought`.

Conceptually:

```python
if moisture >= threshold:
    normal
else:
    ratio = moisture / threshold

    if ratio >= 0.75:
        watch
    elif ratio >= 0.50:
        warning
    else:
        severe
```

For example, assume:

```text
Threshold = 0.20
```

A reading of:

```text
0.20
```

is:

```text
normal
```

A reading of:

```text
0.16
```

produces:

```text
watch
```

A reading of:

```text
0.12
```

produces:

```text
warning
```

A reading of:

```text
0.08
```

produces:

```text
severe
```

---

# GenLayer Integration

ClimateShield relies on GenLayer for the interpretation of external information.

The contract uses:

```python
gl.nondet.web.get(url)
```

to retrieve the Open-Meteo response.

Because external HTTP responses are nondeterministic, the weather-fetching operation is passed into:

```python
gl.eq_principle.prompt_non_comparative(...)
```

The objective is to reach an agreed result for:

* Soil moisture
* Drought classification
* API response interpretation

The resulting JSON has the expected structure:

```json
{
  "moisture": "0.1234",
  "drought_index": "warning"
}
```

The contract then validates the resulting classification before storing it.

---

# Smart Contract Data Model

ClimateShield defines four primary data structures.

## Policy

```python
@dataclass
class Policy:
    policy_id: str
    pool_id: str
    farmer: str
    premium_paid: i32
    coverage_amount: i32
    active: bool
    claimed: bool
    joined_at: str
```

A policy represents an individual farmer's insurance position.

---

## WeatherReading

```python
@dataclass
class WeatherReading:
    day: str
    soil_moisture: str
    drought_index: str
    recorded_at: str
    recorded_by: str
```

A weather reading represents a daily environmental observation.

---

## PayoutRecord

```python
@dataclass
class PayoutRecord:
    payout_id: str
    pool_id: str
    farmer: str
    amount: i32
    trigger_reason: str
    paid_at: str
```

A payout record provides an auditable history of insurance payments.

---

## Pool

```python
@dataclass
class Pool:
    pool_id: str
    name: str
    description: str
    region_name: str
    latitude: str
    longitude: str
    radius_km: str
    drought_threshold: str
    consecutive_days_required: i32
    premium_per_policy: i32
    coverage_per_policy: i32
    max_policies: i32
    total_policies: i32
    vault_balance: i32
    status: str
    created_at: str
    created_by: str
    trigger_activated_at: str
    policy_ids: DynArray[str]
    reading_days: DynArray[str]
```

A pool represents an insurance product for a particular geographic region.

---

# Pool Management

## `create_pool`

Creates a new insurance pool.

```python
create_pool(
    name,
    description,
    region_name,
    latitude,
    longitude,
    radius_km,
    drought_threshold,
    consecutive_days_required,
    premium_per_policy,
    coverage_per_policy,
    max_policies
)
```

Only the configured administrator can call this function.

The contract validates:

* Pool name
* Region name
* Coordinates
* Drought threshold
* Minimum consecutive days
* Premium
* Coverage
* Maximum policies

---

## `close_pool`

```python
close_pool(pool_id)
```

Closes an `open` pool.

Only the administrator can call this function.

A closed pool cannot accept new policies.

---

# Policy Management

## `buy_policy`

```python
buy_policy(pool_id)
```

Allows a farmer to purchase a policy.

Requirements:

* Pool exists
* Pool is open
* Pool is not full
* Farmer does not already have a policy in the pool
* Exact premium is supplied

The policy is stored in:

```text
policies
```

and associated with the pool.

---

## `cancel_policy`

```python
cancel_policy(policy_id)
```

Allows a farmer to cancel their policy before the pool triggers.

The refund is:

```text
50% of premium
```

The policy becomes inactive.

The farmer's pool-policy mapping is also removed, allowing the farmer to purchase a new policy in that pool if the pool remains open.

---

# Weather Data

## `record_daily_reading`

```python
record_daily_reading(pool_id, day)
```

Records a weather reading for a specific pool and day.

The function:

1. Validates the pool.
2. Ensures the pool is active.
3. Prevents duplicate readings.
4. Retrieves the pool coordinates.
5. Queries Open-Meteo.
6. Extracts soil moisture.
7. Classifies drought conditions.
8. Uses GenLayer's consensus mechanism.
9. Stores the resulting reading.
10. Adds the day to the pool's reading history.

The primary API request uses:

```text
soil_moisture_0_to_1cm
```

A fallback hourly request is also attempted if the daily value is unavailable.

---

# Automatic Payouts

The trigger function is:

```python
check_trigger(pool_id)
```

Suppose the pool requires:

```text
5 consecutive drought days
```

and the recorded readings are:

```text
Day 1 → warning
Day 2 → severe
Day 3 → warning
Day 4 → severe
Day 5 → warning
```

The condition is satisfied.

The contract calls:

```python
_execute_payouts(...)
```

---

## Payout Calculation

Suppose:

```text
Coverage per policy = 50 GEN
Eligible farmers = 10
```

The required payout is:

```text
50 × 10 = 500 GEN
```

If the vault contains at least 500 GEN, each farmer receives:

```text
50 GEN
```

If the vault contains only 300 GEN, the contract calculates:

```text
300 / 10 = 30 GEN
```

and each eligible farmer receives:

```text
30 GEN
```

This prevents the contract from attempting to distribute more funds than are available.

---

# Payout Eligibility

Only policies satisfying:

```python
policy.active and not policy.claimed
```

are included.

After a successful payout:

```python
policy.claimed = True
```

This prevents the same policy from receiving the same payout again.

---

# Pool States

A pool can move through several states.

```text
open
  │
  │ first policy purchased
  ▼
active
  │
  │ drought trigger
  ▼
triggered
```

An administrator can also close an open pool:

```text
open
  │
  │ admin closes
  ▼
closed
```

The main state meanings are:

| Status      | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `open`      | Pool accepts policies                                 |
| `active`    | Pool has policies and is monitoring                   |
| `triggered` | Drought event has occurred and payouts were processed |
| `closed`    | Pool is no longer accepting policies                  |

---

# Emergency Admin Trigger

The contract provides:

```python
admin_trigger_payout(pool_id, reason)
```

This is intended as an emergency override.

The administrator can use it when:

* External weather data is unavailable.
* An exceptional real-world event requires intervention.
* The automated data source cannot adequately represent the situation.

The function records the supplied reason through the payout records generated by `_execute_payouts`.

This functionality is intentionally restricted to the administrator.

---

# Vault Funding

Pools can be funded beyond the premiums collected from farmers.

The function is:

```python
fund_vault(pool_id)
```

This is useful when:

```text
coverage liability > collected premiums
```

For example:

```text
100 policies
10 GEN premium
50 GEN coverage
```

Premium collection:

```text
100 × 10 = 1,000 GEN
```

Maximum coverage liability:

```text
100 × 50 = 5,000 GEN
```

The administrator or sponsor can therefore provide additional capital to the pool.

---

# Read Functions

ClimateShield exposes several view functions for frontend applications.

## Pool Queries

```python
get_pool(pool_id)
```

Returns one pool.

```python
get_all_pools()
```

Returns all pools.

```python
get_active_pools()
```

Returns pools whose status is either:

```text
open
active
```

---

## Policy Queries

```python
get_policy(policy_id)
```

Returns a specific policy.

```python
get_farmer_policy(pool_id, wallet)
```

Returns a farmer's policy for a pool.

```python
has_policy(pool_id, wallet)
```

Returns whether a wallet has a policy.

```python
get_pool_policies(pool_id)
```

Returns policies belonging to a pool.

---

## Weather Queries

```python
get_weather_reading(pool_id, day)
```

Returns a specific weather reading.

```python
get_recent_readings(pool_id, days)
```

Returns recent readings.

```python
get_consecutive_drought_days(pool_id)
```

Returns the current number of consecutive warning/severe drought readings.

This is particularly useful for frontend progress indicators.

For example:

```text
Drought Progress

████████░░ 4 / 5 days
```

---

## Payout Queries

```python
get_payout(payout_id)
```

Returns a specific payout.

```python
get_pool_payouts(pool_id)
```

Returns all payouts associated with a pool.

```python
get_farmer_payouts(wallet)
```

Returns payouts belonging to a farmer.

---

## Statistics

```python
get_total_pools()
get_total_policies()
get_total_payouts()
```

These functions provide aggregate protocol counters.

---

# Contract API

| Function                       | Type          | Access       |
| ------------------------------ | ------------- | ------------ |
| `create_pool`                  | Write         | Admin        |
| `close_pool`                   | Write         | Admin        |
| `buy_policy`                   | Payable Write | Anyone       |
| `fund_vault`                   | Payable Write | Anyone       |
| `record_daily_reading`         | Write         | Anyone       |
| `check_trigger`                | Write         | Anyone       |
| `admin_trigger_payout`         | Write         | Admin        |
| `cancel_policy`                | Write         | Policy owner |
| `get_pool`                     | View          | Anyone       |
| `get_all_pools`                | View          | Anyone       |
| `get_active_pools`             | View          | Anyone       |
| `get_policy`                   | View          | Anyone       |
| `get_farmer_policy`            | View          | Anyone       |
| `has_policy`                   | View          | Anyone       |
| `get_pool_policies`            | View          | Anyone       |
| `get_weather_reading`          | View          | Anyone       |
| `get_recent_readings`          | View          | Anyone       |
| `get_payout`                   | View          | Anyone       |
| `get_pool_payouts`             | View          | Anyone       |
| `get_farmer_payouts`           | View          | Anyone       |
| `get_consecutive_drought_days` | View          | Anyone       |
| `get_total_pools`              | View          | Anyone       |
| `get_total_policies`           | View          | Anyone       |
| `get_total_payouts`            | View          | Anyone       |

---

# Storage Architecture

ClimateShield uses GenLayer storage primitives.

## Pools

```python
pools: TreeMap[str, Pool]
```

Pool IDs are generated sequentially:

```text
pool_1
pool_2
pool_3
...
```

A separate:

```python
pool_ids: DynArray[str]
```

maintains the pool index.

---

## Policies

```python
policies: TreeMap[str, Policy]
```

Policy IDs follow:

```text
policy_1
policy_2
policy_3
...
```

---

## Weather Readings

Weather readings use a composite key:

```text
pool_id|day
```

For example:

```text
pool_1|2026-09-06
```

This prevents collisions between readings from different pools.

---

## Farmer Policy Index

The contract uses:

```python
farmer_pool_policy: TreeMap[str, str]
```

with the key:

```text
pool_id|wallet
```

For example:

```text
pool_1|0x123...
```

The value is the corresponding policy ID.

This provides an efficient way to enforce one policy per farmer per pool.

---

## Payouts

Payouts are stored using:

```python
payouts: TreeMap[str, PayoutRecord]
```

with sequential IDs:

```text
payout_1
payout_2
payout_3
...
```

---

# Example Workflow

Consider a drought insurance pool:

```text
Pool:
Abuja Agricultural Shield

Premium:
10 GEN

Coverage:
50 GEN

Drought threshold:
0.15

Required consecutive days:
5
```

A farmer purchases a policy.

```text
Farmer
  │
  │ 10 GEN
  ▼
ClimateShield
  │
  └── policy_1
```

Weather readings are recorded:

```text
Day 1 → 0.13 → warning
Day 2 → 0.11 → warning
Day 3 → 0.09 → severe
Day 4 → 0.10 → severe
Day 5 → 0.12 → warning
```

The last five readings all satisfy the drought condition.

The trigger is therefore activated.

If the farmer has a 50 GEN coverage amount and the vault has sufficient funds:

```text
ClimateShield
      │
      │ 50 GEN
      ▼
   Farmer
```

The policy becomes:

```text
active = true
claimed = true
```

and the pool becomes:

```text
triggered
```

---

# Frontend Integration

A frontend can expose the protocol through several core screens.

## Marketplace

Display available insurance pools:

```text
┌─────────────────────────────────────┐
│ Abuja Drought Shield                │
│                                     │
│ Premium: 10 GEN                     │
│ Coverage: 50 GEN                    │
│ Trigger: 5 drought days             │
│                                     │
│ [Buy Policy]                        │
└─────────────────────────────────────┘
```

---

## Farmer Dashboard

The dashboard can retrieve:

```python
get_farmer_policy(pool_id, wallet)
```

and display:

```text
My Policy

Pool: Abuja Drought Shield
Premium: 10 GEN
Coverage: 50 GEN
Status: Active
Claimed: No
```

---

## Drought Monitoring

The frontend can use:

```python
get_recent_readings(pool_id, 7)
```

and:

```python
get_consecutive_drought_days(pool_id)
```

to visualize current drought conditions.

Example:

```text
Current Drought Status

SEVERE

Consecutive drought days

████████░░ 4 / 5

One more qualifying day
will activate the trigger.
```

---

## Payout History

The frontend can retrieve:

```python
get_farmer_payouts(wallet)
```

and display:

```text
Payout History

✓ Drought Insurance
  +50 GEN

  Trigger:
  5 consecutive drought days

  Date:
  2026-09-06
```

---

# Security Considerations

ClimateShield incorporates several protections.

## Exact Premium Validation

The contract requires the exact premium:

```python
assert gl.message.value == expected_wei
```

This prevents underpayment.

---

## Duplicate Policy Prevention

A farmer cannot create multiple policies within the same pool:

```python
assert farmer_key not in self.farmer_pool_policy
```

---

## Pool Capacity

Pools enforce:

```python
total_policies < max_policies
```

preventing policies beyond configured capacity.

---

## Triggered Pools Cannot Be Reused

Once payouts are executed, the pool status becomes:

```text
triggered
```

This prevents another automatic trigger from executing against the same pool.

---

## Policy Ownership

Only the wallet that owns a policy can cancel it.

```python
assert policy.farmer == farmer
```

---

## Admin Restrictions

Administrative operations use:

```python
_only_admin()
```

This restricts:

* Pool creation
* Pool closure
* Emergency payout triggers

---

# Economic Model

ClimateShield currently uses a simple premium-to-coverage model.

For each policy:

```text
Premium = premium_per_policy
Coverage = coverage_per_policy
```

For a pool:

```text
Total Premium Revenue =
    premium_per_policy × number_of_policies
```

Maximum payout liability:

```text
Maximum Liability =
    coverage_per_policy × number_of_policies
```

The difference between premiums and potential claims creates the need for appropriate pool funding.

Pools can therefore be supplemented using:

```python
fund_vault(pool_id)
```

This makes the vault model flexible enough for:

* Sponsor-funded pools
* DAO-funded insurance
* Protocol-funded coverage
* Subsidized agricultural insurance
* Community insurance pools


---

# Project Structure

A typical repository structure could look like:

```text
climateshield/
│
├── contracts/
│   └── climate_shield.py
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── tests/
│   └── climate_shield_test.py
│
├── README.md
└── ...
```

The core protocol logic is contained in the ClimateShield GenLayer contract.

---

# Deployment

Before deployment, configure the administrator address.

The contract constructor expects:

```python
ClimateShield(admin_address)
```

The supplied address becomes the contract administrator.

After deployment, the administrator can create pools using:

```python
create_pool(...)
```

A typical initial deployment sequence is:

```text
1. Deploy ClimateShield
        ↓
2. Set admin address
        ↓
3. Create insurance pool
        ↓
4. Fund vault
        ↓
5. Farmers purchase policies
        ↓
6. Begin daily weather recording
        ↓
7. Monitor drought conditions
        ↓
8. Check trigger
        ↓
9. Execute payouts if triggered
```

---

# Testing

A complete test suite should cover at minimum:

### Pool Creation

* Valid pool creation
* Unauthorized creation
* Invalid premium
* Invalid coverage
* Invalid capacity

### Policy Purchase

* Successful purchase
* Incorrect premium
* Duplicate policy
* Full pool
* Closed pool

### Weather

* Successful reading
* Duplicate reading
* Normal conditions
* Warning conditions
* Severe conditions
* Missing API data

### Trigger

* Insufficient readings
* Non-consecutive drought conditions
* Consecutive warning conditions
* Consecutive severe conditions
* Mixed warning/severe conditions
* Successful trigger

### Payouts

* Fully funded vault
* Underfunded vault
* Multiple eligible farmers
* Already claimed policies
* Payout record creation

### Cancellation

* Valid cancellation
* Unauthorized cancellation
* Already claimed policy
* Inactive policy
* Triggered pool

### Admin

* Unauthorized admin functions
* Emergency payout
* Pool closure
---

